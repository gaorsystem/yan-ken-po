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
  private mySelectedChoice: Choice | null = null;

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
    this.mySelectedChoice = null;

    const initialState: RoomState = {
      code,
      title: title || `Sala de ${playerName}`,
      isPublic: true,
      status: 'waiting',
      p1: {
        id: playerId,
        name: playerName || 'Jugador 1',
        avatar: avatar || '🔥',
        score: 0,
        choice: null,
        hasChosen: false,
        readyForNext: false,
        connected: true,
      },
      p2: null,
      round: 1,
      maxScore: maxScore >= 0 ? maxScore : 3,
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
    this.mySelectedChoice = null;

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
        const receivedRoom: RoomState = { ...payload };

        // For guest: if in active round and guest has selected a choice, preserve it locally
        if (!this.isHost && this.mySelectedChoice && receivedRoom.status !== 'revealing' && receivedRoom.status !== 'roundResult' && receivedRoom.status !== 'matchOver') {
          if (receivedRoom.p2) {
            receivedRoom.p2.choice = this.mySelectedChoice;
            receivedRoom.p2.hasChosen = true;
          }
        }

        if (receivedRoom.status === 'roundResult' || receivedRoom.status === 'matchOver') {
          this.mySelectedChoice = null;
        }

        this.currentRoom = receivedRoom;
        if (this.updateCallback) this.updateCallback(receivedRoom);
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

    // 4. Room Closed / Opponent Left
    channel.on('broadcast', { event: 'room_closed' }, ({ payload }) => {
      if (payload?.isHost) {
        // Host left/closed the room -> notify guest that room is closed and deleted
        if (this.currentRoom) {
          const closedRoom: RoomState = {
            ...this.currentRoom,
            status: 'roomClosed',
          };
          this.currentRoom = closedRoom;
          if (this.updateCallback) this.updateCallback(closedRoom);
        }
      } else if (this.isHost && this.currentRoom) {
        // Guest left -> reset guest slot to null and wait for new player
        this.currentRoom = {
          ...this.currentRoom,
          p2: null,
          status: 'waiting',
        };
        this.hostP2Choice = null;
        this.broadcastState();
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
              avatar: guest.avatar || '⚡',
              score: 0,
              choice: null,
              hasChosen: false,
              readyForNext: false,
              connected: true,
            },
            status: 'roundResult', // Ready for round 1
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

    this.mySelectedChoice = choice;

    if (this.isHost) {
      this.hostP1Choice = choice;
      if (this.currentRoom.p1) {
        this.currentRoom.p1.choice = choice;
        this.currentRoom.p1.hasChosen = true;
      }

      // If both players have picked -> trigger reveal
      if (this.hostP1Choice && this.hostP2Choice) {
        this.checkAndResolveRound();
      } else {
        // Broadcast that P1 has chosen (without revealing choice to P2 yet)
        this.broadcastState();
      }
    } else {
      // Guest submits choice
      if (this.currentRoom && this.currentRoom.p2) {
        this.currentRoom = {
          ...this.currentRoom,
          p2: { ...this.currentRoom.p2, choice, hasChosen: true },
        };
        if (this.updateCallback) this.updateCallback(this.currentRoom);
      }

      // Send choice to host via broadcast
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'player_action',
          payload: { type: 'submit_choice', playerId: this.myPlayerId, choice },
        });
      }
    }
  }

  setReadyForNext() {
    if (!this.currentRoom || !this.myPlayerId) return;

    if (this.isHost) {
      this.hostP1Choice = null;
      this.hostP2Choice = null;
      this.mySelectedChoice = null;
      this.currentRoom = {
        ...this.currentRoom,
        round: this.currentRoom.round + 1,
        status: 'roundResult',
        p1: this.currentRoom.p1 ? { ...this.currentRoom.p1, choice: null, hasChosen: false, readyForNext: false } : null,
        p2: this.currentRoom.p2 ? { ...this.currentRoom.p2, choice: null, hasChosen: false, readyForNext: false } : null,
      };
      this.broadcastState();
    } else {
      this.mySelectedChoice = null;
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

    this.mySelectedChoice = null;
    if (this.isHost) {
      this.hostP1Choice = null;
      this.hostP2Choice = null;
      this.currentRoom = {
        ...this.currentRoom,
        round: 1,
        status: 'roundResult',
        winner: null,
        history: [],
        p1: this.currentRoom.p1 ? { ...this.currentRoom.p1, score: 0, choice: null, hasChosen: false, readyForNext: false } : null,
        p2: this.currentRoom.p2 ? { ...this.currentRoom.p2, score: 0, choice: null, hasChosen: false, readyForNext: false } : null,
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
    if (this.currentRoom) {
      this.currentRoom = {
        ...this.currentRoom,
        maxScore,
      };
      if (this.isHost) {
        this.broadcastState();
      } else if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'player_action',
          payload: { type: 'update_max_score', maxScore, playerId: this.myPlayerId },
        });
      }
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
            avatar: action.avatar || '⚡',
            score: this.currentRoom.p2?.score || 0,
            choice: null,
            hasChosen: false,
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
        this.currentRoom.p2.hasChosen = true;
      }

      if (this.hostP1Choice && this.hostP2Choice) {
        this.checkAndResolveRound();
      } else {
        this.broadcastState();
      }
    } else if (action.type === 'ready_next') {
      this.setReadyForNext();
    } else if (action.type === 'restart_match') {
      this.restartMatch();
    } else if (action.type === 'update_max_score') {
      this.currentRoom = {
        ...this.currentRoom,
        maxScore: action.maxScore,
      };
      this.broadcastState();
    }
  }

  private checkAndResolveRound() {
    if (!this.currentRoom || !this.hostP1Choice || !this.hostP2Choice) return;

    // Both players chose -> Trigger revealing animation
    this.currentRoom = {
      ...this.currentRoom,
      status: 'revealing',
      p1: this.currentRoom.p1 ? { ...this.currentRoom.p1, choice: this.hostP1Choice, hasChosen: true } : null,
      p2: this.currentRoom.p2 ? { ...this.currentRoom.p2, choice: this.hostP2Choice, hasChosen: true } : null,
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
        round: this.currentRoom.round + 1,
        status: finalStatus,
        winner: matchWinner,
        p1: this.currentRoom.p1 ? { ...this.currentRoom.p1, score: p1Score, choice: null, hasChosen: false, readyForNext: false } : null,
        p2: this.currentRoom.p2 ? { ...this.currentRoom.p2, score: p2Score, choice: null, hasChosen: false, readyForNext: false } : null,
        history: [...this.currentRoom.history, roundResult],
        lastActionTime: Date.now(),
      };

      this.hostP1Choice = null;
      this.hostP2Choice = null;
      this.mySelectedChoice = null;
      this.broadcastState();
    }, 1800);
  }

  private broadcastState() {
    if (!this.currentRoom) return;

    if (this.channel) {
      // Build sanitized room payload for remote players (mask hidden choices before reveal)
      const isRevealed =
        this.currentRoom.status === 'revealing' ||
        this.currentRoom.status === 'roundResult' ||
        this.currentRoom.status === 'matchOver';

      const sanitizedPayload: RoomState = {
        ...this.currentRoom,
        p1: this.currentRoom.p1
          ? {
              ...this.currentRoom.p1,
              choice: isRevealed ? (this.currentRoom.p1.choice || this.hostP1Choice) : null,
              hasChosen: Boolean(this.hostP1Choice || this.currentRoom.p1.hasChosen),
            }
          : null,
        p2: this.currentRoom.p2
          ? {
              ...this.currentRoom.p2,
              choice: isRevealed ? (this.currentRoom.p2.choice || this.hostP2Choice) : null,
              hasChosen: Boolean(this.hostP2Choice || this.currentRoom.p2.hasChosen),
            }
          : null,
      };

      this.channel.send({
        type: 'broadcast',
        event: 'room_state',
        payload: sanitizedPayload,
      });
    }

    if (this.updateCallback) {
      this.updateCallback(this.currentRoom);
    }
  }

  leaveRoom() {
    if (this.channel) {
      try {
        this.channel.send({
          type: 'broadcast',
          event: 'room_closed',
          payload: {
            code: this.currentRoom?.code,
            isHost: this.isHost,
            playerId: this.myPlayerId,
          },
        });
      } catch (e) {
        // ignore errors on close
      }
      this.channel.unsubscribe();
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.currentRoom = null;
    this.myPlayerId = null;
    this.isHost = false;
    this.hostP1Choice = null;
    this.hostP2Choice = null;
    this.mySelectedChoice = null;
  }
}

export const gameEngine = new SupabaseGameEngine();
