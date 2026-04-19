import * as Phaser from 'phaser';
import { TILE_SIZE, SCENES } from '../constants';
import { createTilesetTexture, NPC_DEFS } from '../data/gameData';

const SPR_W = 32;
const SPR_H = 40;
const FRAMES = 12;

// ── Canvas helper: rounded rect (fill) ────────────────────────────────────────
function rrFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 0 || h < 0) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

// ── Canvas helper: rounded rect (stroke) ──────────────────────────────────────
function rrStroke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 0 || h < 0) return;
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.stroke();
}

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: SCENES.BOOT }); }

  preload() {
    const W = this.scale.width, H = this.scale.height;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x2c3e50, 1);
    barBg.fillRoundedRect(W / 2 - 250, H / 2 - 15, 500, 30, 8);
    const barFill = this.add.graphics();
    const loadLabel = this.add.text(W / 2, H / 2 - 40, 'CARREGANDO HUAP...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#1abc9c',
    }).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      barFill.clear();
      barFill.fillStyle(0x1abc9c, 1);
      barFill.fillRoundedRect(W / 2 - 248, H / 2 - 13, 496 * v, 26, 6);
    });
    void loadLabel;
  }

  create() {
    createTilesetTexture(this);
    this.createPlayerSprite();
    this.createNPCSprites();
    this.createPortraits();
    this.createPixelTexture();
    this.scene.start(SCENES.MENU);
  }

  // ── PLAYER SPRITE ─────────────────────────────────────────────────────────
  private createPlayerSprite() {
    const key = 'player';
    if (this.textures.exists(key)) this.textures.remove(key);
    const ct = this.textures.createCanvas(key, SPR_W * FRAMES, SPR_H) as Phaser.Textures.CanvasTexture;
    const ctx = ct.getContext();

    for (let dir = 0; dir < 4; dir++) {
      for (let step = 0; step < 3; step++) {
        this.drawCharacter(ctx, dir * 3 + step, dir, step, {
          skin: '#f5c5a3', coat: '#1abc9c', coatDark: '#16a085',
          hair: '#4a3728', shoe: '#2c3e50', role: 'nurse', isPlayer: true,
        });
      }
    }
    ct.refresh();
    for (let i = 0; i < FRAMES; i++) ct.add(i, 0, i * SPR_W, 0, SPR_W, SPR_H);
  }

  // ── NPC SPRITES ───────────────────────────────────────────────────────────
  private createNPCSprites() {
    for (const def of NPC_DEFS) {
      const key = def.spriteKey;
      if (this.textures.exists(key)) this.textures.remove(key);
      const ct = this.textures.createCanvas(key, SPR_W * FRAMES, SPR_H) as Phaser.Textures.CanvasTexture;
      const ctx = ct.getContext();

      const hex = (n: number) => `rgb(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff})`;
      const darker = (n: number, p = 0.2) => {
        const r = Math.max(0, ((n >> 16) & 0xff) * (1 - p)) | 0;
        const g = Math.max(0, ((n >> 8) & 0xff) * (1 - p)) | 0;
        const b = Math.max(0, (n & 0xff) * (1 - p)) | 0;
        return `rgb(${r},${g},${b})`;
      };

      for (let dir = 0; dir < 4; dir++) {
        for (let step = 0; step < 3; step++) {
          this.drawCharacter(ctx, dir * 3 + step, dir, step, {
            skin: def.skinColor ? hex(def.skinColor) : '#f5c5a3',
            coat: hex(def.coatColor),
            coatDark: darker(def.coatColor),
            hair: hex(def.hairColor),
            shoe: '#2c3e50',
            role: def.role,
            isPlayer: false,
          });
        }
      }
      ct.refresh();
      for (let i = 0; i < FRAMES; i++) ct.add(i, 0, i * SPR_W, 0, SPR_W, SPR_H);
    }
  }

  // ── SHARED CHARACTER DRAWING ───────────────────────────────────────────────
  private drawCharacter(
    ctx: CanvasRenderingContext2D,
    fi: number, dir: number, step: number,
    c: { skin: string; coat: string; coatDark: string; hair: string; shoe: string; role: string; isPlayer: boolean },
  ) {
    const x = fi * SPR_W;
    ctx.clearRect(x, 0, SPR_W, SPR_H);

    const isDown = dir === 0, isUp = dir === 1;
    const isLeft = dir === 2, isRight = dir === 3;
    const isLR = isLeft || isRight;
    const moving = step > 0;
    const facing = isRight ? 1 : -1;

    const legA = moving ? (step === 1 ? 2.5 : -2.5) : 0;
    const legB = -legA;
    const armA = moving ? (step === 1 ? 1.5 : -1.5) : 0;
    const bob = moving ? 0.5 : 0;
    const cx = x + SPR_W / 2;

    // Shadow
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(cx, 39, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Shoes
    ctx.fillStyle = c.shoe;
    if (isLR) {
      rrFill(ctx, cx - 1 + facing * legA, 34 + bob, 9, 5, 2);
      rrFill(ctx, cx - 8 - facing * legA, 34 + bob, 9, 5, 2);
    } else {
      rrFill(ctx, cx - 8, 34 + bob, 7, 5, 2);
      rrFill(ctx, cx + 1, 34 + bob, 7, 5, 2);
    }

    // Legs
    ctx.fillStyle = c.coatDark;
    if (isLR) {
      ctx.fillRect(cx - 5, 25 + bob + legA, 5, 11);
      ctx.fillRect(cx + 1, 25 + bob + legB, 5, 11);
    } else {
      ctx.fillRect(cx - 7, 25 + bob, 5, 11);
      ctx.fillRect(cx + 2, 25 + bob, 5, 11);
    }

    // Torso
    ctx.fillStyle = c.coat;
    rrFill(ctx, cx - 9, 14 + bob, 18, 13, 3);

    // V-neck underlay
    if (!isUp) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.moveTo(cx - 2, 15 + bob); ctx.lineTo(cx + 2, 15 + bob);
      ctx.lineTo(cx, 20 + bob); ctx.closePath(); ctx.fill();
    }

    // Doctor white lapels
    if (c.role === 'doctor' && !isUp) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.moveTo(cx - 2, 14 + bob); ctx.lineTo(cx - 9, 20 + bob); ctx.lineTo(cx - 9, 14 + bob);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 2, 14 + bob); ctx.lineTo(cx + 9, 20 + bob); ctx.lineTo(cx + 9, 14 + bob);
      ctx.closePath(); ctx.fill();
    }

    // Badge
    if (!isUp && (c.role === 'nurse' || c.role === 'admin' || c.role === 'receptionist' || c.isPlayer)) {
      ctx.fillStyle = '#e74c3c';
      rrFill(ctx, cx - 8, 17 + bob, 5, 4, 1);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 7, 18 + bob, 3, 2);
      ctx.fillRect(cx - 6, 17 + bob, 1, 4);
    }

    // Stethoscope
    if (!isUp && (c.role === 'nurse' || c.role === 'doctor' || c.isPlayer)) {
      ctx.strokeStyle = '#34495e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, 20 + bob, 3.5, 0, Math.PI); ctx.stroke();
    }

    // Arms
    ctx.fillStyle = c.coat;
    if (isLR) {
      rrFill(ctx, cx - 14, 15 + bob + armA, 6, 11, 2);
      rrFill(ctx, cx + 9, 15 + bob - armA, 6, 11, 2);
    } else {
      rrFill(ctx, cx - 13, 16 + bob, 5, 10, 2);
      rrFill(ctx, cx + 9, 16 + bob, 5, 10, 2);
    }

    // Clipboard (admin)
    if (c.role === 'admin' && !isUp) {
      const clipX = isRight ? cx + 9 : isLeft ? cx - 14 : cx + 9;
      ctx.fillStyle = '#f1c40f';
      rrFill(ctx, clipX, 16 + bob, 6, 7, 1);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(clipX + 1, 18 + bob, 4, 1);
      ctx.fillRect(clipX + 1, 20 + bob, 4, 1);
    }

    // Hands
    ctx.fillStyle = c.skin;
    if (isLR) {
      ctx.beginPath(); ctx.arc(cx - 11, 26 + bob + armA, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 12, 26 + bob - armA, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(cx - 11, 25 + bob, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 12, 25 + bob, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Neck
    ctx.fillStyle = c.skin;
    ctx.fillRect(cx - 3, 10 + bob, 6, 5);

    // Head
    ctx.fillStyle = c.skin;
    ctx.beginPath(); ctx.ellipse(cx, 6 + bob, 9, 10, 0, 0, Math.PI * 2); ctx.fill();

    // Head shading
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.beginPath(); ctx.ellipse(cx + 6, 7 + bob, 3, 7, 0.3, 0, Math.PI * 2); ctx.fill();

    // Hair
    ctx.fillStyle = c.hair;
    if (isDown) {
      ctx.beginPath(); ctx.ellipse(cx, 1 + bob, 9, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - 9, 1 + bob, 18, 5);
      ctx.beginPath(); ctx.arc(cx, -3 + bob, 4.5, 0, Math.PI * 2); ctx.fill(); // bun
    } else if (isUp) {
      ctx.beginPath(); ctx.ellipse(cx, 1 + bob, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - 9, 1 + bob, 18, 8);
    } else {
      const hdir = facing > 0 ? -1 : 1;
      ctx.beginPath(); ctx.ellipse(cx + hdir * 2, 2 + bob, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Face features
    if (!isUp) {
      ctx.fillStyle = '#2c3e50';
      if (isDown) {
        ctx.fillRect(cx - 5, 7 + bob, 3, 2); ctx.fillRect(cx + 2, 7 + bob, 3, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 5, 7 + bob, 1, 1); ctx.fillRect(cx + 2, 7 + bob, 1, 1);
        ctx.fillStyle = '#c47a5a';
        ctx.fillRect(cx - 2, 11 + bob, 4, 1);
        ctx.fillStyle = 'rgba(210,80,80,0.22)';
        ctx.fillRect(cx - 8, 9 + bob, 4, 2); ctx.fillRect(cx + 4, 9 + bob, 4, 2); // blush
      } else if (isLeft) {
        ctx.fillRect(cx - 5, 7 + bob, 3, 2);
      } else {
        ctx.fillRect(cx + 2, 7 + bob, 3, 2);
      }
    }

    // Glasses (doctor)
    if (c.role === 'doctor' && isDown) {
      ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 0.8;
      rrStroke(ctx, cx - 7, 6 + bob, 4, 3, 1);
      rrStroke(ctx, cx + 3, 6 + bob, 4, 3, 1);
      ctx.beginPath(); ctx.moveTo(cx - 3, 7 + bob); ctx.lineTo(cx + 3, 7 + bob); ctx.stroke();
    }

    // Nurse cap stripe
    if ((c.role === 'nurse' || c.isPlayer) && !isUp) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(cx - 9, -0.5 + bob, 18, 2.5);
    }
  }

  // ── PORTRAITS ─────────────────────────────────────────────────────────────
  private createPortraits() {
    for (const def of NPC_DEFS) {
      const key = `portrait_${def.id}`;
      if (this.textures.exists(key)) this.textures.remove(key);
      const ct = this.textures.createCanvas(key, 90, 90) as Phaser.Textures.CanvasTexture;
      const ctx = ct.getContext();

      const hex = (n: number) => `rgb(${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff})`;
      const skinC = def.skinColor ? hex(def.skinColor) : '#f5c5a3';
      const coatC = hex(def.coatColor);
      const hairC = hex(def.hairColor);
      const r0 = (def.coatColor >> 16) & 0xff;
      const g0 = (def.coatColor >> 8) & 0xff;
      const b0 = def.coatColor & 0xff;

      // BG
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, 90, 90);
      const bgGrad = ctx.createLinearGradient(0, 0, 90, 90);
      bgGrad.addColorStop(0, `rgba(${r0},${g0},${b0},0.1)`);
      bgGrad.addColorStop(1, `rgba(${r0},${g0},${b0},0.38)`);
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, 90, 90);

      // Grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 0.5;
      for (let j = 0; j < 90; j += 10) {
        ctx.beginPath(); ctx.moveTo(j, 0); ctx.lineTo(j, 90); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(90, j); ctx.stroke();
      }

      // Shoulders
      ctx.fillStyle = coatC;
      ctx.beginPath();
      ctx.moveTo(0, 90); ctx.lineTo(0, 58);
      ctx.bezierCurveTo(5, 50, 35, 48, 45, 50);
      ctx.bezierCurveTo(55, 48, 85, 50, 90, 58);
      ctx.lineTo(90, 90); ctx.closePath(); ctx.fill();

      // Doctor lapels
      if (def.role === 'doctor') {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.moveTo(42, 50); ctx.lineTo(0, 62); ctx.lineTo(0, 50); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(48, 50); ctx.lineTo(90, 62); ctx.lineTo(90, 50); ctx.closePath(); ctx.fill();
      }

      // V-neck
      ctx.fillStyle = skinC;
      ctx.beginPath(); ctx.moveTo(40, 50); ctx.lineTo(45, 60); ctx.lineTo(50, 50); ctx.closePath(); ctx.fill();

      // Neck
      ctx.fillStyle = skinC; rrFill(ctx, 38, 38, 14, 16, 4);

      // Head
      ctx.fillStyle = skinC;
      ctx.beginPath(); ctx.ellipse(45, 25, 18, 22, 0, 0, Math.PI * 2); ctx.fill();

      // Hair
      ctx.fillStyle = hairC;
      ctx.beginPath(); ctx.ellipse(45, 8, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(27, 8, 36, 18);

      // Eyes
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(36, 22, 5, 4); ctx.fillRect(49, 22, 5, 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(36, 22, 2, 2); ctx.fillRect(49, 22, 2, 2);

      // Eyebrows
      ctx.fillStyle = hairC;
      ctx.fillRect(35, 18, 8, 2); ctx.fillRect(47, 18, 8, 2);

      // Nose
      ctx.fillStyle = 'rgba(160,80,50,0.3)';
      ctx.beginPath(); ctx.arc(45, 30, 2, 0, Math.PI * 2); ctx.fill();

      // Smile
      ctx.strokeStyle = '#c47a5a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(45, 35, 6, 0.2, Math.PI - 0.2); ctx.stroke();

      // Glasses (doctor)
      if (def.role === 'doctor') {
        ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 1.5;
        rrStroke(ctx, 34, 20, 9, 6, 2);
        rrStroke(ctx, 47, 20, 9, 6, 2);
        ctx.beginPath(); ctx.moveTo(43, 23); ctx.lineTo(47, 23); ctx.stroke();
      }

      // Stethoscope
      if (def.role === 'doctor' || def.role === 'nurse') {
        ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(45, 58, 8, 0, Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(45, 66, 4, 0, Math.PI * 2); ctx.stroke();
      }

      // Badge
      if (def.role === 'nurse' || def.role === 'admin' || def.role === 'receptionist') {
        ctx.fillStyle = '#e74c3c';
        rrFill(ctx, 28, 52, 14, 18, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(30, 56, 10, 2); ctx.fillRect(30, 60, 8, 2); ctx.fillRect(30, 64, 10, 2);
      }

      ct.refresh();
    }

    // Player portrait
    const pk = 'portrait_player';
    if (!this.textures.exists(pk)) {
      const ct = this.textures.createCanvas(pk, 90, 90) as Phaser.Textures.CanvasTexture;
      const ctx = ct.getContext();
      ctx.fillStyle = '#e0faf4'; ctx.fillRect(0, 0, 90, 90);
      ctx.fillStyle = '#1abc9c';
      ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(0, 58);
      ctx.bezierCurveTo(5, 50, 35, 48, 45, 50);
      ctx.bezierCurveTo(55, 48, 85, 50, 90, 58);
      ctx.lineTo(90, 90); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f5c5a3';
      ctx.beginPath(); ctx.ellipse(45, 25, 18, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(38, 38, 14, 14);
      ctx.fillStyle = '#4a3728';
      ctx.beginPath(); ctx.ellipse(45, 8, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(27, 8, 36, 16);
      ctx.beginPath(); ctx.arc(45, -4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2c3e50'; ctx.fillRect(36, 22, 5, 4); ctx.fillRect(49, 22, 5, 4);
      ctx.fillStyle = '#e74c3c'; ctx.fillRect(27, 3, 36, 3);
      ct.refresh();
    }
  }

  // ── PIXEL TEXTURE ─────────────────────────────────────────────────────────
  private createPixelTexture() {
    const key = 'pixel';
    if (this.textures.exists(key)) this.textures.remove(key);
    const ct = this.textures.createCanvas(key, TILE_SIZE, TILE_SIZE) as Phaser.Textures.CanvasTexture;
    ct.getContext().fillStyle = '#fff'; ct.getContext().fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ct.refresh();
  }
}
