export interface Player {
  id: string;
  name: string;
  y: number; // Vertical position (0-100)
  x: number; // Horizontal position (0-100)
  color: string;
  isTalking: boolean;
  isSelf: boolean;
  role: 'SEEKER' | 'HIDER' | 'SPECTATOR';
  status: 'ALIVE' | 'CAUGHT';
  facing: 'left' | 'right';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export enum GameStatus {
  LOBBY = 'LOBBY',
  HIDING = 'HIDING', // 15s phase
  SEEKING = 'SEEKING', // 45s phase
  GAME_OVER = 'GAME_OVER',
}

export interface Obstacle {
  id: string;
  type: 'TREE' | 'BUSH' | 'WALL' | 'WATER' | 'GRAVESTONE' | 'TRASH';
  x: number; // %
  y: number; // %
  w: number; // % width
  h: number; // % height
  isSolid: boolean; // Cannot walk through
  isHidingSpot: boolean; // Makes player invisible
}
