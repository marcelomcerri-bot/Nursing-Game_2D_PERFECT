import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, EVENTS, MAP_COLS, MAP_ROWS, TILE_SIZE } from '../constants';
import { getLevelInfo } from '../data/gameData';
import type { GameState } from '../data/gameData';
import { generateMapTiles, ROOM_FLOOR_COLORS_HUD } from './HUDMinimapHelper';

export class HUDScene extends Phaser.Scene {
  private timeText!: Phaser.GameObjects.Text;
  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBarFill!: Phaser.GameObjects.Graphics;
  private prestigeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private missionText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private playerDot!: Phaser.GameObjects.Rectangle;
  private mapData: number[][] = [];
  private MM_SCALE = 3;
  private MM_X = GAME_WIDTH - 16;
  private MM_Y = 16;
  private roomLabel!: Phaser.GameObjects.Text;
  private roomLabelBg!: Phaser.GameObjects.Graphics;

  constructor() { super({ key: SCENES.HUD, active: false }); }

  create() {
    this.mapData = generateMapTiles();
    const MM_W = MAP_COLS * this.MM_SCALE;
    const MM_H = MAP_ROWS * this.MM_SCALE;
    const mm_rx = this.MM_X - MM_W;
    const mm_ry = this.MM_Y;

    // ── Minimap
    const mmBg = this.add.graphics();
    mmBg.fillStyle(0x2c3e50, 0.85);
    mmBg.fillRoundedRect(mm_rx - 4, mm_ry - 4, MM_W + 8, MM_H + 8, 8);
    mmBg.lineStyle(3, 0xf39c12, 1);
    mmBg.strokeRoundedRect(mm_rx - 4, mm_ry - 4, MM_W + 8, MM_H + 8, 8);

    this.minimapGfx = this.add.graphics();
    this.drawMinimap(mm_rx, mm_ry);

    this.playerDot = this.add.rectangle(mm_rx, mm_ry, 6, 6, 0xffffff).setDepth(5);
    this.tweens.add({
      targets: this.playerDot,
      scaleX: 1.5, scaleY: 1.5,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    this.add.text(mm_rx + MM_W / 2, mm_ry + MM_H + 12, 'MAPA HOSPITALAR', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '8px',
      color: '#f39c12',
      stroke: '#000',
      strokeThickness: 2
    }).setOrigin(0.5, 0);

    // ── TOP BAR background
    const topBar = this.add.graphics();
    topBar.fillStyle(0x2c3e50, 0.9);
    topBar.fillRoundedRect(16, 16, GAME_WIDTH - 200, 56, 12);
    topBar.lineStyle(3, 0x1abc9c, 1);
    topBar.strokeRoundedRect(16, 16, GAME_WIDTH - 200, 56, 12);

    // ── Day / Shift indicator
    const dayBg = this.add.graphics();
    dayBg.fillStyle(0x1a252f, 1);
    dayBg.fillRoundedRect(28, 26, 120, 36, 8);

    this.dayText = this.add.text(88, 34, 'DIA 1\nMANHÃ', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '10px',
      color: '#3498db',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);

    // ── Time
    this.timeText = this.add.text(160, 44, '08:00', {
      fontFamily: "'VT323', monospace",
      fontSize: '34px',
      color: '#f1c40f',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0, 0.5);

    // ── Energy bar
    const energyX = 260;
    this.add.text(energyX, 44, '⚡', {
      fontFamily: "'VT323', monospace",
      fontSize: '26px',
    }).setOrigin(0, 0.5);
    
    this.energyBarBg = this.add.graphics();
    this.energyBarBg.fillStyle(0x1a252f, 1);
    this.energyBarBg.fillRoundedRect(energyX + 30, 34, 150, 20, 10);
    
    this.energyBarFill = this.add.graphics();

    this.add.text(energyX + 105, 44, 'ENERGIA', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '8px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    // ── Prestige
    const prestigeBg = this.add.graphics();
    prestigeBg.fillStyle(0x1a252f, 1);
    prestigeBg.fillRoundedRect(470, 26, 180, 36, 8);

    this.prestigeText = this.add.text(560, 36, '⭐ 0 pts', {
      fontFamily: "'VT323', monospace",
      fontSize: '24px',
      color: '#f39c12',
    }).setOrigin(0.5, 0.5);

    this.levelText = this.add.text(560, 52, 'Estagiária', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '8px',
      color: '#bdc3c7',
    }).setOrigin(0.5, 0.5);

    // ── Active mission indicator
    const missionBg = this.add.graphics();
    missionBg.fillStyle(0x1a252f, 1);
    missionBg.fillRoundedRect(670, 26, 380, 36, 8);

    this.missionText = this.add.text(860, 44, '', {
      fontFamily: "'VT323', monospace",
      fontSize: '22px',
      color: '#1abc9c',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    // ── Hint bar at bottom
    const hintBg = this.add.graphics();
    hintBg.fillStyle(0x2c3e50, 0.9);
    hintBg.fillRoundedRect(GAME_WIDTH / 2 - 350, GAME_HEIGHT - 46, 700, 36, 18);
    hintBg.lineStyle(2, 0xf39c12, 1);
    hintBg.strokeRoundedRect(GAME_WIDTH / 2 - 350, GAME_HEIGHT - 46, 700, 36, 18);

    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, '', {
      fontFamily: "'VT323', monospace",
      fontSize: '22px',
      color: '#f39c12',
    }).setOrigin(0.5);

    // ── Room label
    this.roomLabelBg = this.add.graphics();
    this.roomLabelBg.setAlpha(0);

    this.roomLabel = this.add.text(GAME_WIDTH / 2, 120, '', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);
    this.roomLabel.setShadow(3, 3, '#000', 0, false, true);

    const gameScene = this.scene.get(SCENES.GAME);
    gameScene.events.on(EVENTS.HUD_UPDATE, this.onHudUpdate, this);
    gameScene.events.on(EVENTS.INTERACTION_HINT, this.onHint, this);
    gameScene.events.on(EVENTS.ROOM_CHANGE, this.onRoomChange, this);
  }

  private drawMinimap(ox: number, oy: number) {
    this.minimapGfx.clear();
    const S = this.MM_SCALE;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tid = this.mapData[r][c];
        const col = ROOM_FLOOR_COLORS_HUD[tid] ?? 0x333333;
        this.minimapGfx.fillStyle(col, 1);
        this.minimapGfx.fillRect(ox + c * S, oy + r * S, S, S);
      }
    }
  }

  private onHudUpdate(data: {
    state: GameState;
    playerX: number;
    playerY: number;
    activeMission?: string;
  }) {
    const { state, playerX, playerY, activeMission } = data;

    // Time
    const totalMin = Math.floor(state.gameTime) % (24 * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    this.timeText.setText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

    // Shift
    const shiftName = h >= 7 && h < 15 ? 'MANHÃ' : h >= 15 && h < 23 ? 'TARDE' : 'NOITE';
    this.dayText.setText(`DIA ${state.day}\n${shiftName}`);
    const dayColors = { 'MANHÃ': '#3498db', 'TARDE': '#e67e22', 'NOITE': '#9b59b6' };
    this.dayText.setColor(dayColors[shiftName as keyof typeof dayColors] || '#fff');

    // Energy bar
    const energyPct = Math.max(0, Math.min(1, state.energy / 100));
    const barColor = energyPct > 0.5 ? 0x2ecc71 : energyPct > 0.25 ? 0xf1c40f : 0xe74c3c;
    
    this.energyBarFill.clear();
    this.energyBarFill.fillStyle(barColor, 1);
    this.energyBarFill.fillRoundedRect(260 + 30, 34, 150 * energyPct, 20, 10);

    // Prestige + level
    this.prestigeText.setText(`⭐ ${state.prestige} pts`);
    const lvInfo = getLevelInfo(state.prestige);
    this.levelText.setText(lvInfo.title);

    // Active mission
    if (activeMission) {
      this.missionText.setText(`📋 ${activeMission}`);
    } else {
      this.missionText.setText('Nenhuma missão ativa');
      this.missionText.setColor('#7f8c8d');
    }

    // Minimap player dot
    const MM_W = MAP_COLS * this.MM_SCALE;
    const mm_rx = this.MM_X - MM_W;
    const dotX = mm_rx + (playerX / TILE_SIZE) * this.MM_SCALE;
    const dotY = this.MM_Y + (playerY / TILE_SIZE) * this.MM_SCALE;
    this.playerDot.setPosition(dotX, dotY);
  }

  private onHint(msg: string) {
    this.hintText.setText(msg);
  }

  private onRoomChange(roomName: string) {
    this.roomLabel.setText(roomName);
    const tw = this.roomLabel.width + 40;
    
    this.roomLabelBg.clear();
    this.roomLabelBg.fillStyle(0x2c3e50, 0.9);
    this.roomLabelBg.fillRoundedRect(GAME_WIDTH/2 - tw/2, 120 - 24, tw, 48, 12);
    this.roomLabelBg.lineStyle(3, 0x1abc9c, 1);
    this.roomLabelBg.strokeRoundedRect(GAME_WIDTH/2 - tw/2, 120 - 24, tw, 48, 12);

    this.roomLabelBg.setAlpha(1);
    this.roomLabel.setAlpha(1);
    
    this.roomLabelBg.setY(-20);
    this.roomLabel.setY(100);

    this.tweens.killTweensOf([this.roomLabelBg, this.roomLabel]);

    this.tweens.add({
      targets: [this.roomLabelBg, this.roomLabel],
      y: '+=20',
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [this.roomLabelBg, this.roomLabel],
          alpha: 0,
          y: '-=10',
          duration: 500,
          delay: 2000,
        });
      }
    });
  }
}
