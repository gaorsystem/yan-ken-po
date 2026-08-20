import { supabase } from '../lib/supabase';
import { Choice, Player, RoomState, RoundResult, ReactionMessage } from '../types';

export type RoomUpdateCallback = (state: RoomState) => void;
export type ReactionCallback = (reaction: ReactionMessage) => void;

function determineWinner(c1: Choice, c2: Choice): 'p1' | 'p2' | 'draw' {
  if (c1 === c2) return 'draw';
  if (
    (c1 === 'piedra' && c2 === 'tijera') ||
    (c1 === 'papel' && c2 === 'piedra') ||
    (c1 === 'tijera' && c2 === 'papel')
  ) {
    return 'p1';
  }
  return 'p2';
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class SupabaseGameEngine {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private currentRoom: RoomState | null = null;
  private myPlayerId: string | null = null;
  private isHost: boolean = false;
  private updateCallback: RoomUpdateCallback | null = null;
  private reactionCallback: ReactionCallback | null = null;

  // Stored choices on Host to avoid exposing secret choice prematurely
  private hostP1Choice: Choice | null = null;
  private hostP2Choice: Choice | null = null;

  createRoom(
    playerName: string,
    avatar: string,
    maxScore: number,
    title?: string,
    onUpdate?: RoomUpdateCallback,
    onReaction?: ReactionCallback
  ): { code: string; playerId: string; state: RoomState } {
    this.leaveRoom();

    const code = generateCode();
    const playerId = 'p1_' + Math.random().toString(36).substring(2, 9);
    this.myPlayerId = playerId;
    this.isHost = true;
    this.updateCallback = onUpdate || null;
    this.reactionCallback = onReaction || null;
    this.hostP1Choice = null;
    this.hostP2Choice = null;

    const initialState: RoomState = {
      code,
      title: title || `Sala de ${playerName}`,
      isPublic: true,
      status: 'waiting',
      p1: {
        id: playerId,
        name: playerName || 'Jugador 1',
        avatar: avatar || '🇵🇪',
        score: 0,
        choice: null,
        readyForNext: false,
        connected: true,
      },
      p2: null,
      round: 1,
      maxScore: maxScore === 3 || maxScore === 5 ? maxScore : 3,
      history: [],
      winner: null,
      lastActionTime: Date.now(),
    };

    this.currentRoom = initialState;
    this.connectChannel(code, playerId, playerName, avatar);
    return { code, playerId, state: initialState };
  }

  joinRoom(
    code: string,
    playerName: string,
    avatar: string,
    onUpdate?: RoomUpdateCallback,
    onReaction?: ReactionCallback
  ): { playerId: string } {
    this.leaveRoom();

    const playerId = 'p2_' + Math.random().toString(36).substring(2, 9);
    this.myPlayerId = playerId;
    this.isHost = false;
    this.updateCallback = onUpdate || null;
    this.reactionCallback = onReaction || null;

    this.connectChannel(code.toUpperCase(), playerId, playerName, avatar);
    return { playerId };
  }

  private connectChannel(code: string, playerId: string, name: string, avatar: string) {
    const channelName = `ykp_room_${code.toUpperCase()}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: playerId },
        broadcast: { ack: true, self: false },
      },
    });

    // 1. Sync room state updates broadcasted
    channel.on('broadcast', { event: 'room_state' }, ({ payload }) => {
      if (payload) {
        this.currentRoom = payload;
        if (this.updateCallback) this.updateCallback(payload);
      }
    });

    // 2. Peer actions sent to Host
    channel.on('broadcast', { event: 'player_action' }, ({ payload }) => {
      if (this.isHost) {
        this.handlePeerActionAsHost(payload);
      }
    });

    // 3. Reaction messages
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload && this.reactionCallback) {
        this.reactionCallback(payload);
      }
    });

    // 4. Presence
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      if (this.isHost && this.currentRoom) {
        const guest = newPresences.find((p: any) => p.id !== this.myPlayerId);
        if (guest && (!this.currentRoom.p2 || !this.currentRoom.p2.connected)) {
          this.currentRoom = {
            ...this.currentRoom,
            p2: {
              id: guest.id,
              name: guest.name || 'Jugador 2',
              avatar: guest.avatar || '🦙',
              score: 0,
              choice: null,
              readyForNext: false,
              connected: true,
            },
            status: 'roundResult', // Ready to start round 1
          };
          this.broadcastState();
        }
      }
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      if (this.isHost && this.currentRoom) {
        const guestLeft = leftPresences.find((p: any) => p.id === this.currentRoom?.p2?.id);
        if (guestLeft && this.currentRoom.p2) {
          this.currentRoom = {
            ...this.currentRoom,
            p2: {
              ...this.currentRoom.p2,
              connected: false,
            },
          };
          this.broadcastState();
        }
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: playerId,
          name,
          avatar,
          joinedAt: Date.now(),
        });

        // If guest just connected, request current state from host
        if (!this.isHost) {
          channel.send({
            type: 'broadcast',
            event: 'player_action',
            payload: { type: 'request_state', playerId, name, avatar },
          });
        }
      }
    });

    this.channel = channel;
  }

  submitChoice(choice: Choice) {
    if (!this.currentRoom || !this.myPlayerId) return;

    if (this.isHost) {
      this.hostP1Choice = choice;
      if (this.currentRoom.p1) {
        this.currentRoom.p1.choice = choice;
      }
      this.checkAndResolveRound();
    } else {
      // Send choice to host
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'player_action',
          payload: { type: 'submit_choice', playerId: this.myPlayerId, choice },
        });
      }
      // Optimistically update locally
      if (this.currentRoom && this.currentRoom.p2) {
        this.currentRoom = {
          ...this.currentRoom,
          p2: { ...this.currentRoom.p2, choice },
        };
        if (this.updateCallback) this.updateCallback(this.currentRoom);
      }
    }
  }

  setReadyForNext() {
    if (!this.currentRoom || !this.myPlayerId) return;

    if (this.isHost) {
      if (this.currentRoom.p1) this.currentRoom.p1.readyForNext = true;
      this.checkNextRoundReady();
    } else {
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'player_action',
          payload: { type: 'ready_next', playerId: this.myPlayerId },
        });
      }
    }
  }

  restartMatch() {
    if (!this.currentRoom) return;

    if (this.isHost) {
      this.hostP1Choice = null;
      this.hostP2Choice = null;
      this.currentRoom = {
        ...this.currentRoom,
        round: 1,
        status: 'roundResult',
        winner: null,
        history: [],
        p1: this.currentRoom.p1 ? { ...this.currentRoom.p1, score: 0, choice: null, readyForNext: false } : null,
        p2: this.currentRoom.p2 ? { ...this.currentRoom.p2, score: 0, choice: null, readyForNext: false } : null,
      };
      this.broadcastState();
    } else {
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'player_action',
          payload: { type: 'restart_match', playerId: this.myPlayerId },
        });
      }
    }
  }

  updateMaxScore(maxScore: number) {
    if (this.isHost && this.currentRoom) {
      this.currentRoom = {
        ...this.currentRoom,
        maxScore,
      };
      this.broadcastState();
    }
  }

  sendReaction(text: string, emoji: string, senderName: string) {
    const reaction: ReactionMessage = {
      id: Math.random().toString(36).substring(2, 9),
      senderId: this.myPlayerId || 'p1',
      senderName,
      text,
      emoji,
      timestamp: Date.now(),
    };

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: reaction,
      });
    }

    if (this.reactionCallback) {
      this.reactionCallback(reaction);
    }
  }

  private handlePeerActionAsHost(action: any) {
    if (!this.currentRoom) return;

    if (action.type === 'request_state') {
      if (!this.currentRoom.p2 || this.currentRoom.p2.id === action.playerId) {
        this.currentRoom = {
          ...this.currentRoom,
          p2: {
            id: action.playerId,
            name: action.name || 'Jugador 2',
            avatar: action.avatar || '🦙',
            score: this.currentRoom.p2?.score || 0,
            choice: null,
            readyForNext: false,
            connected: true,
          },
          status: this.currentRoom.status === 'waiting' ? 'roundResult' : this.currentRoom.status,
        };
      }
      this.broadcastState();
    } else if (action.type === 'submit_choice') {
      this.hostP2Choice = action.choice;
      if (this.currentRoom.p2) {
        this.currentRoom.p2.choice = action.choice;
      }
      this.checkAndResolveRound();
    } else if (action.type === 'ready_next') {
      if (this.currentRoom.p2) {
        this.currentRoom.p2.readyForNext = true;
      }
      this.checkNextRoundReady();
    } else if (action.type === 'restart_match') {
      this.restartMatch();
    }
  }

  private checkAndResolveRound() {
    if (!this.currentRoom || !this.hostP1Choice || !this.hostP2Choice) return;

    // Both players chose -> Trigger revealing animation
    this.currentRoom = {
      ...this.currentRoom,
      status: 'revealing',
    };
    this.broadcastState();

    setTimeout(() => {
      if (!this.currentRoom || !this.hostP1Choice || !this.hostP2Choice) return;

      const p1Choice = this.hostP1Choice;
      const p2Choice = this.hostP2Choice;
      const roundWinner = determineWinner(p1Choice, p2Choice);

      const p1Score = (this.currentRoom.p1?.score || 0) + (roundWinner === 'p1' ? 1 : 0);
      const p2Score = (this.currentRoom.p2?.score || 0) + (roundWinner === 'p2' ? 1 : 0);

      const roundResult: RoundResult = {
        round: this.currentRoom.round,
        p1Choice,
        p2Choice,
        winner: roundWinner,
        timestamp: Date.now(),
      };

      let finalStatus: RoomState['status'] = 'roundResult';
      let matchWinner: 'p1' | 'p2' | null = null;

      if (this.currentRoom.maxScore > 0 && (p1Score >= this.currentRoom.maxScore || p2Score >= this.currentRoom.maxScore)) {
        finalStatus = 'matchOver';
        matchWinner = p1Score >= this.currentRoom.maxScore ? 'p1' : 'p2';
      }

      this.currentRoom = {
        ...this.currentRoom,
        status: finalStatus,
        winner: matchWinner,
        p1: this.currentRoom.p1 ? { ...this.currentRoom.p1, score: p1Score, choice: p1Choice, readyForNext: false } : null,
        p2: this.currentRoom.p2 ? { ...this.currentRoom.p2, score: p2Score, choice: p2Choice, readyForNext: false } : null,
        history: [...this.currentRoom.history, roundResult],
        lastActionTime: Date.now(),
      };

      this.hostP1Choice = null;
      this.hostP2Choice = null;
      this.broadcastState();
    }, 1800);
  }

  private checkNextRoundReady() {
    if (!this.currentRoom) return;

    if (this.currentRoom.p1?.readyForNext && this.currentRoom.p2?.readyForNext) {
      this.currentRoom = {
        ...this.currentRoom,
        round: this.currentRoom.round + 1,
        status: 'roundResult',
        p1: this.currentRoom.p1 ? { ...this.currentRoom.p1, choice: null, readyForNext: false } : null,
        p2: this.currentRoom.p2 ? { ...this.currentRoom.p2, choice: null, readyForNext: false } : null,
      };
      this.broadcastState();
    } else {
      this.broadcastState();
    }
  }

  private broadcastState() {
    if (!this.currentRoom) return;

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'room_state',
        payload: this.currentRoom,
      });
    }

    if (this.updateCallback) {
      this.updateCallback(this.currentRoom);
    }
  }

  leaveRoom() {
    if (this.channel) {
      this.channel.unsubscribe();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.currentRoom = null;
    this.myPlayerId = null;
    this.isHost = false;
    this.hostP1Choice = null;
    this.hostP2Choice = null;
  }
}

export const gameEngine = new SupabaseGameEngine();
