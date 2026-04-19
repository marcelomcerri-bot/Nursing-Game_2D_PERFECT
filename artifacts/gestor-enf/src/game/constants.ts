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
  [TILE_ID.GARDEN]:    0x5c946e,
  [TILE_ID.WALL]:      0x4a4a5a,
  [TILE_ID.CORRIDOR]:  0xf4e8c1,
  [TILE_ID.ICU]:       0xbdf2f6,
  [TILE_ID.PHARMACY]:  0xebb9f8,
  [TILE_ID.ADMIN]:     0xffd19a,
  [TILE_ID.WARD]:      0xe2d9f3,
  [TILE_ID.BREAK]:     0xfff2bd,
  [TILE_ID.NURSING]:   0xb5f2b8,
  [TILE_ID.RECEPTION]: 0xffef9e,
  [TILE_ID.EMERGENCY]: 0xffb5b5,
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
