import { SaveData } from './types';

const STORAGE_KEY = 'prism_pour_save_v1';

const DEFAULT_SAVE: SaveData = {
  unlockedLevel: 1,
  currentLevel: 1,
  coins: 100,
  bestMovesByLevel: {},
  muted: false,
  colorblindMode: false,
  activeSession: null,
};

export function loadSaveData(): SaveData {
  if (typeof window === 'undefined') return { ...DEFAULT_SAVE };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      unlockedLevel: typeof parsed.unlockedLevel === 'number' && parsed.unlockedLevel >= 1 ? parsed.unlockedLevel : 1,
      currentLevel: typeof parsed.currentLevel === 'number' && parsed.currentLevel >= 1 ? parsed.currentLevel : 1,
      coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? parsed.coins : 100,
      bestMovesByLevel:
        parsed.bestMovesByLevel && typeof parsed.bestMovesByLevel === 'object' ? parsed.bestMovesByLevel : {},
      muted: Boolean(parsed.muted),
      colorblindMode: Boolean(parsed.colorblindMode),
      activeSession: parsed.activeSession ?? null,
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function persistSaveData(data: SaveData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota errors cleanly
  }
}
