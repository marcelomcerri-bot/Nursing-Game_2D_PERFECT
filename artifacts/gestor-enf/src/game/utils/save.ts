import type { GameState } from '../data/gameData';

const SAVE_KEY = 'gestorEnf2D_save';

export const DEFAULT_STATE: GameState = {
  prestige: 0,
  energy: 100,
  completedMissions: [],
  missionProgress: {},
  relationships: {
    dr_oliveira: 0,
    joao_farmaceutico: 0,
    diretora_alves: 0,
    enf_maria: 0,
    ana_recepcionista: 0,
  },
  gameTime: 480, // 8h = start of morning shift (in minutes)
  day: 1,
};

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (_) {}
}

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch (_) {
    return { ...DEFAULT_STATE };
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
