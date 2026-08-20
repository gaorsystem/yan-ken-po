export type Choice = 'piedra' | 'papel' | 'tijera';

export type GameMode = 'bestOf3' | 'bestOf5' | 'freePlay';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  choice: Choice | null;
  hasChosen?: boolean;
  readyForNext: boolean;
  connected: boolean;
}

export interface RoundResult {
  round: number;
  p1Choice: Choice;
  p2Choice: Choice;
  winner: 'p1' | 'p2' | 'draw';
  timestamp: number;
}

export interface ReactionMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  emoji?: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  title?: string;
  isPublic?: boolean;
  status: 'waiting' | 'countdown' | 'revealing' | 'roundResult' | 'matchOver';
  p1: Player | null;
  p2: Player | null;
  round: number;
  maxScore: number; // 3 for bestOf3, 5 for bestOf5, 0 for freePlay
  history: RoundResult[];
  winner: 'p1' | 'p2' | null;
  countdownValue?: number;
  lastActionTime: number;
}

export interface PublicRoomItem {
  code: string;
  title: string;
  hostName: string;
  hostAvatar: string;
  maxScore: number;
  createdAt: number;
}

export interface WsMessage {
  type:
    | 'join'
    | 'leave'
    | 'playChoice'
    | 'nextRound'
    | 'restartMatch'
    | 'reaction'
    | 'state'
    | 'error'
    | 'ping'
    | 'pong';
  payload?: any;
}
