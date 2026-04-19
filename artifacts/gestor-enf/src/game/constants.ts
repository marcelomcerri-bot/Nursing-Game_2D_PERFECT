export const TILE_SIZE = 32;
export const MAP_COLS = 50;
export const MAP_ROWS = 36;
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const CAMERA_ZOOM = 1.6;

export const TILE_ID = {
  GARDEN: 0,
  WALL: 1,
  CORRIDOR: 2,
  ICU: 3,
  PHARMACY: 4,
  ADMIN: 5,
  WARD: 6,
  BREAK: 7,
  NURSING: 8,
  RECEPTION: 9,
  EMERGENCY: 10,
} as const;

export type TileId = typeof TILE_ID[keyof typeof TILE_ID];

export const ROOM_FLOOR_COLORS: Record<number, number> = {
  [TILE_ID.GARDEN]:    0x4a7c59,
  [TILE_ID.WALL]:      0x2d3436,
  [TILE_ID.CORRIDOR]:  0xd4c9b0,
  [TILE_ID.ICU]:       0xa8d8ea,
  [TILE_ID.PHARMACY]:  0xcba4d0,
  [TILE_ID.ADMIN]:     0xf5b87a,
  [TILE_ID.WARD]:      0xd0cce8,
  [TILE_ID.BREAK]:     0xfceaaa,
  [TILE_ID.NURSING]:   0x9edca0,
  [TILE_ID.RECEPTION]: 0xf8e080,
  [TILE_ID.EMERGENCY]: 0xf4a0a0,
};

export const ROOM_NAMES: Record<number, string> = {
  [TILE_ID.ICU]:       'UTI',
  [TILE_ID.PHARMACY]:  'Farmácia',
  [TILE_ID.ADMIN]:     'Administrativo',
  [TILE_ID.WARD]:      'Enfermaria',
  [TILE_ID.BREAK]:     'Copa & Descanso',
  [TILE_ID.NURSING]:   'Posto de Enfermagem',
  [TILE_ID.RECEPTION]: 'Recepção',
  [TILE_ID.EMERGENCY]: 'Pronto-Socorro',
  [TILE_ID.CORRIDOR]:  'Corredor',
  [TILE_ID.GARDEN]:    'Jardim',
};

export const PLAYER_SPEED = 150;
export const INTERACTION_DISTANCE = 52;
export const GAME_MINUTES_PER_SECOND = 4;
export const SHIFT_DURATION_MINUTES = 480; // 8h shift

export const SCENES = {
  BOOT:   'BootScene',
  MENU:   'MenuScene',
  GAME:   'GameScene',
  HUD:    'HUDScene',
  DIALOG: 'DialogScene',
} as const;

export const EVENTS = {
  HUD_UPDATE:        'hud-update',
  OPEN_DIALOG:       'open-dialog',
  CLOSE_DIALOG:      'close-dialog',
  MISSION_COMPLETE:  'mission-complete',
  INTERACTION_HINT:  'interaction-hint',
  ROOM_CHANGE:       'room-change',
} as const;

export type Direction = 'up' | 'down' | 'left' | 'right';
