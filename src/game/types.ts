export type ColorId =
  | 'crimson'
  | 'azure'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'tangerine'
  | 'cyan'
  | 'magenta'
  | 'lime'
  | 'indigo'
  | 'rose'
  | 'teal';

export type Bottle = ColorId[]; // Index 0 = bottom, last index = top, max length 4

export type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY';

export interface MoveRecord {
  from: number;
  to: number;
  color: ColorId;
  count: number;
}

export interface LevelConfig {
  level: number;
  colorCount: number;
  emptyCount: number;
  parMoves: number;
  bottles: Bottle[];
}

export interface PourAnimationState {
  from: number;
  to: number;
  color: ColorId;
  count: number;
  fromRect: { x: number; y: number; width: number; height: number };
  toRect: { x: number; y: number; width: number; height: number };
  direction: 'left' | 'right';
}

export interface HintSuggestion {
  from: number;
  to: number;
  message?: string;
}

export interface ActiveSession {
  level: number;
  bottles: Bottle[];
  initialBottles: Bottle[];
  history: MoveRecord[];
  extraBottlesAdded: number;
  parMoves: number;
}

export interface SaveData {
  unlockedLevel: number;
  currentLevel: number;
  coins: number;
  bestMovesByLevel: Record<number, number>;
  muted: boolean;
  colorblindMode: boolean;
  lastDailyRewardAt: number | null;
  dailyRewardCount: number;
  activeSession?: ActiveSession | null;
}
