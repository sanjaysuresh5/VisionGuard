
export interface AWEvent {
  id: number;
  timestamp: string;
  duration: number;
  data: {
    app: string;
    title: string;
  };
}

export interface AWBucket {
  id: string;
  name: string;
  type: string;
  hostname: string;
  client: string;
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface AppState {
  currentStreak: number; // minutes
  isAway: boolean;
  lastActive: Date;
  status: ConnectionStatus;
  activeApp: string;
  activeTitle: string;
}

export interface BreakSuggestion {
  title: string;
  instruction: string;
  type: 'eye' | 'stretch' | 'mindful';
}
