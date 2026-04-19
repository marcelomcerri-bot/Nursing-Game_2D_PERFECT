import * as Phaser from 'phaser';
import { TILE_SIZE, SCENES } from '../constants';
import { createTilesetTexture } from '../data/gameData';
import type { NPCDef } from '../data/gameData';
import { NPC_DEFS } from '../data/gameData';

const SPRITE_W = 24;
const SPRITE_H = 28;
const SPRITE_FRAMES = 12; // 3 frames × 4 directions

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  frameIdx: number,
  bodyColor: string,
  coatColor: string,
  hairColor: string,
  skinColor: string
) {
  const x = frameIdx * SPRITE_W;
  const dir = Math.floor(frameIdx / 3); // 0=down,1=up,2=left,3=right
  const step = frameIdx % 3;           // 0=idle,1=step1,2=step2

  ctx.clearRect(x, 0, SPRITE_W, SPRITE_H);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x + 12, SPRITE_H - 3, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs (animated)
  const legOffset = step === 0 ? 0 : (step === 1 ? -2 : 2);
  ctx.fillStyle = bodyColor;
  if (dir !== 1) { // not facing up (shoes visible)
    ctx.fillRect(x + 7, SPRITE_H - 10, 4, 8 + (dir === 0 ? legOffset : 0));
    ctx.fillRect(x + 13, SPRITE_H - 10, 4, 8 - (dir === 0 ? legOffset : 0));
  } else {
    ctx.fillRect(x + 7, SPRITE_H - 8, 4, 6);
    ctx.fillRect(x + 13, SPRITE_H - 8, 4, 6);
  }

  // Coat/body
  ctx.fillStyle = coatColor;
  ctx.fillRect(x + 5, SPRITE_H - 20, 14, 12);

  // Coat collar
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 10, SPRITE_H - 20, 4, 4);

  // Arms
  ctx.fillStyle = coatColor;
  if (dir === 2 || dir === 3) { // side view - only one arm visible
    const armSide = dir === 2 ? x + 2 : x + 18;
    const armOff = step === 0 ? 0 : (step === 1 ? 2 : -2);
    ctx.fillRect(armSide, SPRITE_H - 20, 3, 8 + armOff);
  } else {
    const leftArmOff = step === 1 ? 2 : (step === 2 ? -2 : 0);
    const rightArmOff = -leftArmOff;
    ctx.fillRect(x + 2, SPRITE_H - 20, 3, 8 + leftArmOff);
    ctx.fillRect(x + 19, SPRITE_H - 20, 3, 8 + rightArmOff);
  }

  // Neck
  ctx.fillStyle = skinColor;
  ctx.fillRect(x + 10, SPRITE_H - 22, 4, 3);

  // Head
  ctx.fillStyle = skinColor;
  ctx.fillRect(x + 7, SPRITE_H - 30, 10, 9);

  // Hair
  ctx.fillStyle = hairColor;
  ctx.fillRect(x + 7, SPRITE_H - 30, 10, 4);
  if (dir === 2) ctx.fillRect(x + 7, SPRITE_H - 30, 2, 9);
  if (dir === 3) ctx.fillRect(x + 15, SPRITE_H - 30, 2, 9);

  // Eyes
  ctx.fillStyle = '#000';
  if (dir === 0) { // facing down
    ctx.fillRect(x + 9,  SPRITE_H - 24, 2, 2);
    ctx.fillRect(x + 13, SPRITE_H - 24, 2, 2);
  } else if (dir === 1) { // facing up (no eyes visible)
    // show hair back
  } else if (dir === 2) { // left
    ctx.fillRect(x + 8, SPRITE_H - 24, 2, 2);
  } else { // right
    ctx.fillRect(x + 14, SPRITE_H - 24, 2, 2);
  }

  // Stethoscope accent (small detail)
  if (dir === 0 || dir === 2 || dir === 3) {
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 10, SPRITE_H - 18, 4, 1);
    ctx.fillRect(x + 10, SPRITE_H - 17, 1, 3);
    ctx.fillRect(x + 13, SPRITE_H - 17, 1, 3);
  }
}

function createCharTexture(
  scene: Phaser.Scene,
  key: string,
  bodyColor: number,
  coatColor: number,
  hairColor: number,
  skinColor: number = 0xf5c5a3
) {
  const toHex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  const ct = scene.textures.createCanvas(
    key,
    SPRITE_W * SPRITE_FRAMES,
    SPRITE_H
  ) as Phaser.Textures.CanvasTexture;
  const ctx = ct.getContext();

  for (let i = 0; i < SPRITE_FRAMES; i++) {
    drawCharacter(
      ctx, i,
      toHex(bodyColor), toHex(coatColor), toHex(hairColor), toHex(skinColor)
    );
  }
  ct.refresh();
  // Register frames
  for (let i = 0; i < SPRITE_FRAMES; i++) {
    ct.add(i, 0, i * SPRITE_W, 0, SPRITE_W, SPRITE_H);
  }
}

function createPixelTexture(scene: Phaser.Scene, key: string, color: number, w = 2, h = 2) {
  const ct = scene.textures.createCanvas(key, w, h) as Phaser.Textures.CanvasTexture;
  const ctx = ct.getContext();
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, w, h);
  ct.refresh();
}

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.BOOT }); }

  preload() {
    // Create loading bar
    const { width, height } = this.scale;
    const barBg = this.add.rectangle(width / 2, height / 2, 400, 20, 0x222233);
    const bar = this.add.rectangle(width / 2 - 200, height / 2, 0, 20, 0x4ecdc4);
    const label = this.add.text(width / 2, height / 2 - 30, 'Carregando...', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '12px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (v: number) => {
      bar.width = 400 * v;
      bar.x = width / 2 - 200 + (400 * v) / 2;
    });

    void barBg; void label;
  }

  create() {
    // Tileset
    createTilesetTexture(this);

    // Player sprite
    createCharTexture(this, 'player', 0x2c6fad, 0x4a9ade, 0x4a3728, 0xf5c5a3);

    // NPC sprites
    for (const npc of NPC_DEFS as NPCDef[]) {
      createCharTexture(this, npc.spriteKey, npc.bodyColor, npc.coatColor, npc.hairColor, 0xf5c5a3);
    }

    // NPC portrait backgrounds (64×64 colored panels)
    for (const npc of NPC_DEFS as NPCDef[]) {
      const ct = this.textures.createCanvas('portrait_' + npc.id, 64, 64) as Phaser.Textures.CanvasTexture;
      const ctx = ct.getContext();
      const c = '#' + npc.coatColor.toString(16).padStart(6, '0');
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 48, 64, 16);
      // Draw mini character at center
      drawCharacter(ctx, 0, '#ffffff', c,
        '#' + npc.hairColor.toString(16).padStart(6, '0'), '#f5c5a3');
      ct.refresh();
    }

    // Generic pixel texture for physics bodies
    createPixelTexture(this, 'pixel', 0xffffff);

    // Minimap background
    const mmW = MAP_COLS_CONST * 3;
    const mmH = MAP_ROWS_CONST * 3;
    const mmCt = this.textures.createCanvas('minimap_bg', mmW, mmH) as Phaser.Textures.CanvasTexture;
    const mmCtx = mmCt.getContext();
    mmCtx.fillStyle = '#111';
    mmCtx.fillRect(0, 0, mmW, mmH);
    mmCt.refresh();

    this.scene.start(SCENES.MENU);
  }
}

const MAP_COLS_CONST = 50;
const MAP_ROWS_CONST = 36;
