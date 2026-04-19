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
  const dir = Math.floor(frameIdx / 3); // 0=down, 1=up, 2=left, 3=right
  const step = frameIdx % 3;           // 0=idle, 1=step1, 2=step2

  ctx.clearRect(x, 0, SPRITE_W, SPRITE_H);

  // Soft shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(x + 12, SPRITE_H - 2, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helper for darkening hex colors
  const darken = (color: string, amount: number) => {
    let c = color.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    let r = (num >> 16) - amount;
    let g = ((num >> 8) & 0x00FF) - amount;
    let b = (num & 0x0000FF) - amount;
    r = Math.max(0, r);
    g = Math.max(0, g);
    b = Math.max(0, b);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };

  const skinDark = darken(skinColor, 30);
  const coatDark = darken(coatColor, 30);
  const pantsColor = '#4a5568';
  const shoesColor = '#2d3748';

  const bounce = step === 0 ? 0 : 1;
  const legBounce1 = step === 1 ? -2 : 0;
  const legBounce2 = step === 2 ? -2 : 0;

  // Legs/Shoes
  if (dir !== 1) { // down, left, right
    // Left leg
    ctx.fillStyle = pantsColor;
    ctx.fillRect(x + 7, SPRITE_H - 10 + legBounce1, 4, 8 - legBounce1);
    ctx.fillStyle = shoesColor;
    ctx.fillRect(x + 7, SPRITE_H - 4 + legBounce1, 4, 3);
    // Right leg
    ctx.fillStyle = pantsColor;
    ctx.fillRect(x + 13, SPRITE_H - 10 + legBounce2, 4, 8 - legBounce2);
    ctx.fillStyle = shoesColor;
    ctx.fillRect(x + 13, SPRITE_H - 4 + legBounce2, 4, 3);
  } else { // up
    ctx.fillStyle = pantsColor;
    ctx.fillRect(x + 7, SPRITE_H - 10 + legBounce1, 4, 8 - legBounce1);
    ctx.fillStyle = shoesColor;
    ctx.fillRect(x + 7, SPRITE_H - 4 + legBounce1, 4, 3);
    ctx.fillStyle = pantsColor;
    ctx.fillRect(x + 13, SPRITE_H - 10 + legBounce2, 4, 8 - legBounce2);
    ctx.fillStyle = shoesColor;
    ctx.fillRect(x + 13, SPRITE_H - 4 + legBounce2, 4, 3);
  }

  // Torso / Coat
  ctx.fillStyle = coatDark;
  ctx.fillRect(x + 5, SPRITE_H - 20 - bounce, 14, 12);
  ctx.fillStyle = coatColor;
  ctx.fillRect(x + 6, SPRITE_H - 20 - bounce, 12, 11);

  // V-neck & Undershirt
  if (dir === 0) {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 10, SPRITE_H - 20 - bounce, 4, 5);
    // Stethoscope
    ctx.fillStyle = '#718096'; // gray
    ctx.fillRect(x + 9, SPRITE_H - 19 - bounce, 1, 4);
    ctx.fillRect(x + 14, SPRITE_H - 19 - bounce, 1, 4);
    ctx.fillRect(x + 10, SPRITE_H - 15 - bounce, 4, 1);
    // Pocket
    ctx.fillStyle = coatDark;
    ctx.fillRect(x + 14, SPRITE_H - 14 - bounce, 3, 3);
  } else if (dir === 2) {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 8, SPRITE_H - 20 - bounce, 2, 5);
  } else if (dir === 3) {
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 14, SPRITE_H - 20 - bounce, 2, 5);
  }

  // Arms
  ctx.fillStyle = coatColor;
  if (dir === 2) {
    const armOff = step === 0 ? 0 : (step === 1 ? 2 : -2);
    ctx.fillRect(x + 9, SPRITE_H - 20 - bounce, 4, 8 + armOff);
    // hand
    ctx.fillStyle = skinColor;
    ctx.fillRect(x + 9, SPRITE_H - 12 - bounce + armOff, 4, 3);
  } else if (dir === 3) {
    const armOff = step === 0 ? 0 : (step === 1 ? 2 : -2);
    ctx.fillRect(x + 11, SPRITE_H - 20 - bounce, 4, 8 + armOff);
    ctx.fillStyle = skinColor;
    ctx.fillRect(x + 11, SPRITE_H - 12 - bounce + armOff, 4, 3);
  } else {
    const leftArmOff = step === 1 ? 2 : (step === 2 ? -2 : 0);
    const rightArmOff = -leftArmOff;
    // Left arm
    ctx.fillStyle = coatDark;
    ctx.fillRect(x + 3, SPRITE_H - 20 - bounce, 3, 8 + leftArmOff);
    ctx.fillStyle = coatColor;
    ctx.fillRect(x + 4, SPRITE_H - 20 - bounce, 2, 7 + leftArmOff);
    ctx.fillStyle = skinColor;
    ctx.fillRect(x + 3, SPRITE_H - 13 - bounce + leftArmOff, 3, 3);
    
    // Right arm
    ctx.fillStyle = coatDark;
    ctx.fillRect(x + 18, SPRITE_H - 20 - bounce, 3, 8 + rightArmOff);
    ctx.fillStyle = coatColor;
    ctx.fillRect(x + 18, SPRITE_H - 20 - bounce, 2, 7 + rightArmOff);
    ctx.fillStyle = skinColor;
    ctx.fillRect(x + 18, SPRITE_H - 13 - bounce + rightArmOff, 3, 3);
  }

  // Head Base
  ctx.fillStyle = skinDark;
  ctx.fillRect(x + 6, SPRITE_H - 30 - bounce, 12, 11);
  ctx.fillStyle = skinColor;
  ctx.fillRect(x + 7, SPRITE_H - 30 - bounce, 10, 10);

  // Eyes & Face
  if (dir === 0) { // down
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x + 8, SPRITE_H - 25 - bounce, 2, 2); // left eye
    ctx.fillRect(x + 14, SPRITE_H - 25 - bounce, 2, 2); // right eye
    // blush
    ctx.fillStyle = 'rgba(245, 101, 101, 0.4)';
    ctx.fillRect(x + 7, SPRITE_H - 23 - bounce, 2, 1);
    ctx.fillRect(x + 15, SPRITE_H - 23 - bounce, 2, 1);
    // mouth
    ctx.fillStyle = '#a0aec0';
    ctx.fillRect(x + 11, SPRITE_H - 22 - bounce, 2, 1);
  } else if (dir === 2) { // left
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x + 7, SPRITE_H - 25 - bounce, 2, 2);
  } else if (dir === 3) { // right
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x + 15, SPRITE_H - 25 - bounce, 2, 2);
  }

  // Hair
  const hairDark = darken(hairColor, 20);
  ctx.fillStyle = hairDark;
  ctx.fillRect(x + 5, SPRITE_H - 31 - bounce, 14, 5);
  ctx.fillStyle = hairColor;
  ctx.fillRect(x + 6, SPRITE_H - 32 - bounce, 12, 4);
  
  if (dir === 0) {
    ctx.fillRect(x + 6, SPRITE_H - 28 - bounce, 2, 3);
    ctx.fillRect(x + 16, SPRITE_H - 28 - bounce, 2, 3);
  } else if (dir === 1) {
    ctx.fillRect(x + 6, SPRITE_H - 28 - bounce, 12, 6);
  } else if (dir === 2) {
    ctx.fillRect(x + 6, SPRITE_H - 28 - bounce, 4, 5);
    ctx.fillRect(x + 12, SPRITE_H - 28 - bounce, 4, 3);
  } else if (dir === 3) {
    ctx.fillRect(x + 14, SPRITE_H - 28 - bounce, 4, 5);
    ctx.fillRect(x + 8, SPRITE_H - 28 - bounce, 4, 3);
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
      
      // Detailed background
      const gradient = ctx.createLinearGradient(0, 0, 0, 64);
      gradient.addColorStop(0, '#fdfbfb');
      gradient.addColorStop(1, '#ebedee');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);

      // Sunburst pattern
      ctx.save();
      ctx.translate(32, 32);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for(let i=0; i<12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, 40);
        ctx.lineTo(-10, 40);
        ctx.fill();
      }
      ctx.restore();

      // Border
      ctx.strokeStyle = c;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 60, 60);

      // Draw mini character at center (scaled up)
      ctx.save();
      ctx.translate(20, 15); // Center the 24x28 sprite
      ctx.scale(1.5, 1.5); // make it bigger
      drawCharacter(ctx, 0, '#ffffff', c,
        '#' + npc.hairColor.toString(16).padStart(6, '0'), '#f5c5a3');
      ctx.restore();

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
