import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, EVENTS, MAP_COLS, MAP_ROWS, TILE_SIZE } from '../constants';
import { getLevelInfo } from '../data/gameData';
import type { GameState } from '../data/gameData';
import { generateMapTiles, ROOM_FLOOR_COLORS_HUD } from './HUDMinimapHelper';

export class HUDScene extends Phaser.Scene {
  private timeText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Rectangle;
  private energyBarBg!: Phaser.GameObjects.Rectangle;
  private prestigeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private missionText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private playerDot!: Phaser.GameObjects.Rectangle;
  private mapData: number[][] = [];
  private MM_SCALE = 3;
  private MM_X = GAME_WIDTH - 12;
  private MM_Y = 12;
  private roomLabel!: Phaser.GameObjects.Text;
  private energyIcon!: Phaser.GameObjects.Text;

  constructor() { super({ key: SCENES.HUD, active: false }); }

  create() {
    this.mapData = generateMapTiles();
    const MM_W = MAP_COLS * this.MM_SCALE;
    const MM_H = MAP_ROWS * this.MM_SCALE;
    const mm_rx = this.MM_X - MM_W;
    const mm_ry = this.MM_Y;

    // ── Minimap background
    const mmBg = this.add.rectangle(
      mm_rx + MM_W / 2,
      mm_ry + MM_H / 2,
      MM_W + 8, MM_H + 8,
      0x000000, 0.7
    );
    this.add.rectangle(
      mm_rx + MM_W / 2,
      mm_ry + MM_H / 2,
      MM_W + 8, MM_H + 8
    ).setStrokeStyle(1, 0x00b894, 0.8);

    void mmBg;

    // Draw minimap tiles
    this.minimapGfx = this.add.graphics();
    this.drawMinimap(mm_rx, mm_ry);

    // Player dot on minimap
    this.playerDot = this.add.rectangle(mm_rx, mm_ry, 5, 5, 0x4ecdc4).setDepth(5);

    // ── Minimap label
    this.add.text(mm_rx + MM_W / 2, mm_ry + MM_H + 10, 'MAPA', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '6px',
      color: '#ffffff',
      alpha: 0.6,
    }).setOrigin(0.5, 0);

    // ── TOP BAR background
    const topBar = this.add.rectangle(GAME_WIDTH / 2, 22, GAME_WIDTH, 44, 0x000000, 0.7);
    this.add.rectangle(GAME_WIDTH / 2, 44, GAME_WIDTH, 1, 0x00b894, 0.4);
    void topBar;

    // ── Day / Shift indicator
    this.dayText = this.add.text(14, 12, 'DIA 1 | MANHÃ', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '8px',
      color: '#00d2ff',
    });

    // ── Time
    this.timeText = this.add.text(14, 26, '08:00', {
      fontFamily: "'VT323', monospace",
      fontSize: '22px',
      color: '#ffffff',
    });

    // ── Energy bar
    const energyX = 200;
    this.add.text(energyX, 10, '⚡', {
      fontFamily: "'VT323', monospace",
      fontSize: '18px',
    });
    this.energyIcon = this.add.text(energyX, 10, '⚡', {
      fontFamily: "'VT323', monospace", fontSize: '18px',
    });
    this.energyBarBg = this.add.rectangle(energyX + 80, 22, 120, 12, 0x333344);
    this.energyBar    = this.add.rectangle(energyX + 80, 22, 120, 12, 0x00b894);

    this.add.text(energyX + 10, 26, 'ENERGIA', {
      fontFamily: "'VT323', monospace",
      fontSize: '15px',
      color: '#aaaaaa',
    });
    void this.energyIcon;

    // ── Prestige
    this.prestigeText = this.add.text(420, 10, '⭐ 0 pts', {
      fontFamily: "'VT323', monospace",
      fontSize: '20px',
      color: '#f9ca24',
    });

    this.levelText = this.add.text(420, 28, 'Estagiária', {
      fontFamily: "'VT323', monospace",
      fontSize: '15px',
      color: '#aaaaaa',
    });

    // ── Active mission indicator
    this.missionText = this.add.text(GAME_WIDTH / 2, 12, '', {
      fontFamily: "'VT323', monospace",
      fontSize: '17px',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5, 0);

    // ── Hint bar at bottom
    const hintBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 14, GAME_WIDTH, 28, 0x000000, 0.6);
    void hintBg;
    this.hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 14, '', {
      fontFamily: "'VT323', monospace",
      fontSize: '18px',
      color: '#00b894',
    }).setOrigin(0.5);

    // ── Room label
    this.roomLabel = this.add.text(GAME_WIDTH / 2, 54, '', {
      fontFamily: "'VT323', monospace",
      fontSize: '20px',
      color: '#ffeaa7',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Listen to events from GameScene
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
    this.dayText.setText(`DIA ${state.day} | ${shiftName}`);
    const dayColors = { 'MANHÃ': '#00d2ff', 'TARDE': '#f39c12', 'NOITE': '#9b59b6' };
    this.dayText.setColor(dayColors[shiftName as keyof typeof dayColors] || '#fff');

    // Energy bar
    const energyPct = Math.max(0, Math.min(1, state.energy / 100));
    this.energyBar.width = 120 * energyPct;
    this.energyBar.x = this.energyBarBg.x - 60 + (120 * energyPct) / 2;
    const barColor = energyPct > 0.5 ? 0x00b894 : energyPct > 0.25 ? 0xf39c12 : 0xe74c3c;
    this.energyBar.setFillStyle(barColor);

    // Prestige + level
    this.prestigeText.setText(`⭐ ${state.prestige} pts`);
    const lvInfo = getLevelInfo(state.prestige);
    this.levelText.setText(lvInfo.title);

    // Active mission
    if (activeMission) {
      this.missionText.setText(`📋 ${activeMission}`);
    } else {
      this.missionText.setText('');
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
    this.tweens.add({
      targets: this.roomLabel,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      delay: 1500,
    });
  }
}
