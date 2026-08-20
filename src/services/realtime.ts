import { supabase } from '../lib/supabase';
import { Choice, ReactionMessage, RoomState } from '../types';

export type RealtimeListener = {
  onStateUpdate: (room: RoomState) => void;
  onReaction: (reaction: ReactionMessage) => void;
  onPlayerLeft?: () => void;
};

class SupabaseRealtimeService {
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private currentRoomCode: string | null = null;

  /**
   * Subscribe to a room channel on Supabase Realtime
   */
  joinRoom(
    code: string,
    playerId: string,
    name: string,
    avatar: string,
    listeners: RealtimeListener
  ) {
    this.leaveRoom();
    this.currentRoomCode = code;

    const channelName = `room-${code.toUpperCase()}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: playerId },
        broadcast: { ack: true, self: false },
      },
    });

    // Listen for broadcasted room state updates
    channel.on('broadcast', { event: 'roomState' }, ({ payload }) => {
      if (payload) {
        listeners.onStateUpdate(payload);
      }
    });

    // Listen for quick emoji/chat reactions
    channel.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload) {
        listeners.onReaction(payload);
      }
    });

    // Listen to presence events (opponent joins or leaves)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      console.log('Supabase Presence sync:', state);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: playerId,
          name,
          avatar,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    this.channel = channel;
  }

  /**
   * Broadcast updated room state to all peers in the room
   */
  broadcastState(state: RoomState) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'roomState',
      payload: state,
    });
  }

  /**
   * Broadcast a reaction to all peers in the room
   */
  broadcastReaction(reaction: ReactionMessage) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: reaction,
    });
  }

  /**
   * Leave the current room channel
   */
  leaveRoom() {
    if (this.channel) {
      this.channel.unsubscribe();
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.currentRoomCode = null;
    }
  }
}

export const realtimeService = new SupabaseRealtimeService();
