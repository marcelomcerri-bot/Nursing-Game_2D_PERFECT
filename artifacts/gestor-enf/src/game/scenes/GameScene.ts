import * as Phaser from 'phaser';
import {
  TILE_SIZE, MAP_COLS, MAP_ROWS,
  CAMERA_ZOOM, SCENES, EVENTS, EVENTS as EV,
  INTERACTION_DISTANCE, GAME_MINUTES_PER_SECOND, ROOM_NAMES, TILE_ID,
} from '../constants';
import { generateMapTiles, NPC_DEFS, MISSIONS, CRISIS_EVENTS, getLevelInfo } from '../data/gameData';
import type { GameState, CrisisEvent } from '../data/gameData';
import { Player } from '../objects/Player';
import { NPC } from '../objects/NPC';
import { loadGame, saveGame } from '../utils/save';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private npcs: NPC[] = [];
  private mapData: number[][] = [];
  private wallLayer?: Phaser.Physics.Arcade.StaticGroup;
  private state!: GameState;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private mKey!: Phaser.Input.Keyboard.Key;

  private timeAccum = 0;
  private currentRoom: number = TILE_ID.CORRIDOR;
  private nearbyNPC: NPC | null = null;
  private isDialogOpen = false;
  private isCrisisOpen = false;
  private missionOverlay: Phaser.GameObjects.Container | null = null;
  private crisisOverlay: Phaser.GameObjects.Container | null = null;

  private energyTimer = 0;
  private energyRestoreTimer = 0;
  private stressDecayTimer = 0;
  private lastHudEmit = 0;
  private crisisTimer = 0;
  private nextCrisisTime = 0;

  // Ambient lights/decor
  private ambientGfx!: Phaser.GameObjects.Graphics;
  private monitorLights: Array<{ obj: Phaser.GameObjects.Graphics; x: number; y: number; phase: number }> = [];

  constructor() { super({ key: SCENES.GAME }); }

  create() {
    this.state = loadGame();
    this.mapData = generateMapTiles();

    this.buildTilemap();
    this.buildWalls();
    this.buildEnvironmentalDecor();
    this.buildRoomLabels();
    this.spawnPlayer();
    this.spawnNPCs();
    this.setupInput();
    this.setupCamera();
    this.createVignette();

    this.scene.launch(SCENES.HUD);
    this.cameras.main.fadeIn(700);

    // Auto-save every 30s
    this.time.addEvent({ delay: 30000, loop: true, callback: () => saveGame(this.state) });

    // Schedule first crisis event (1-2 game minutes = 20-40s real)
    this.scheduleCrisis();

    this.emitHudUpdate();
    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  // ─── TILEMAP ──────────────────────────────────────────────────────────────
  private buildTilemap() {
    const map = this.make.tilemap({ data: this.mapData, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) return;
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) return;
    layer.setDepth(0);
    this.physics.world.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
  }

  private buildWalls() {
    this.wallLayer = this.physics.add.staticGroup();
    for (let row = 0; row < MAP_ROWS; row++) {
      let startCol = -1;
      for (let col = 0; col <= MAP_COLS; col++) {
        const isBlocked = col < MAP_COLS && (this.mapData[row][col] === TILE_ID.WALL || this.mapData[row][col] === TILE_ID.GARDEN);
        if (isBlocked && startCol === -1) {
          startCol = col;
        } else if (!isBlocked && startCol !== -1) {
          const len = col - startCol;
          const wx = (startCol + len / 2) * TILE_SIZE;
          const wy = (row + 0.5) * TILE_SIZE;
          const body = this.wallLayer!.create(wx, wy, 'pixel') as Phaser.Physics.Arcade.Image;
          body.setVisible(false).setDisplaySize(len * TILE_SIZE, TILE_SIZE).refreshBody();
          startCol = -1;
        }
      }
    }
  }

  // ─── ENVIRONMENTAL DECOR ──────────────────────────────────────────────────
  private buildEnvironmentalDecor() {
    this.ambientGfx = this.add.graphics().setDepth(1);

    const decors: Array<[number, number, number]> = [];

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tid = this.mapData[r][c];
        const bx = c * TILE_SIZE, by = r * TILE_SIZE;

        if (tid === TILE_ID.ICU && Math.random() < 0.12) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.WARD && Math.random() < 0.15) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.ADMIN && Math.random() < 0.10) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.BREAK && Math.random() < 0.12) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.NURSING && Math.random() < 0.08) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.LAB && Math.random() < 0.12) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.CME && Math.random() < 0.10) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.MATERNITY && Math.random() < 0.13) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.ONCOLOGY && Math.random() < 0.10) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.RECEPTION && Math.random() < 0.08) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.EMERGENCY && Math.random() < 0.08) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.GARDEN && Math.random() < 0.08) {
          decors.push([bx, by, tid]);
        } else if (tid === TILE_ID.REHAB && Math.random() < 0.10) {
          decors.push([bx, by, tid]);
        }
      }
    }

    for (const [bx, by, tid] of decors) {
      this.placeDecor(bx, by, tid);
    }
  }

  private placeDecor(bx: number, by: number, tid: number) {
    const g = this.add.graphics().setDepth(1);

    if (tid === TILE_ID.ICU) {
      // Monitor with screen
      g.fillStyle(0x2c3e50, 1); g.fillRoundedRect(bx + 4, by + 3, 16, 14, 2);
      g.fillStyle(0x1dd0e0, 0.8); g.fillRect(bx + 5, by + 4, 14, 10);
      // ECG line
      g.lineStyle(1.5, 0x00ff88, 1);
      g.beginPath(); g.moveTo(bx + 6, by + 9);
      g.lineTo(bx + 9, by + 9); g.lineTo(bx + 10, by + 5); g.lineTo(bx + 11, by + 13);
      g.lineTo(bx + 13, by + 9); g.lineTo(bx + 18, by + 9); g.strokePath();
      // Blinking light
      const light = g.fillStyle(0xff0000, 1); void light;
      const lightObj = this.add.graphics().setDepth(2);
      lightObj.fillStyle(0xe74c3c, 1);
      lightObj.fillCircle(bx + 14, by + 22, 2);
      this.monitorLights.push({ obj: lightObj, x: bx + 14, y: by + 22, phase: Math.random() * Math.PI * 2 });
      // Stand
      g.fillStyle(0x95a5a6, 1); g.fillRect(bx + 10, by + 17, 2, 8); g.fillRect(bx + 6, by + 24, 10, 3);

    } else if (tid === TILE_ID.WARD) {
      // Hospital bed
      g.fillStyle(0xbdc3c7, 1); g.fillRoundedRect(bx + 3, by + 4, 26, 24, 3);
      g.fillStyle(0xecf0f1, 1); g.fillRoundedRect(bx + 5, by + 10, 22, 16, 2);
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(bx + 7, by + 5, 16, 7, 2); // pillow
      g.fillStyle(0x3498db, 0.35); g.fillRect(bx + 5, by + 18, 22, 5); // blanket
      // Bedside rail
      g.lineStyle(1.5, 0xaab0b8, 1);
      g.beginPath(); g.moveTo(bx + 3, by + 10); g.lineTo(bx + 3, by + 28); g.strokePath();

    } else if (tid === TILE_ID.ADMIN) {
      // Desk
      g.fillStyle(0xc6a55c, 1); g.fillRect(bx + 2, by + 12, 28, 12);
      // Computer
      g.fillStyle(0x2c3e50, 1); g.fillRect(bx + 8, by + 4, 14, 10); // monitor
      g.fillStyle(0x3498db, 0.7); g.fillRect(bx + 9, by + 5, 12, 8);
      g.fillStyle(0x95a5a6, 1); g.fillRect(bx + 13, by + 14, 4, 2); // stand
      g.fillStyle(0x7f8c8d, 1); g.fillRect(bx + 4, by + 22, 22, 3); // keyboard

    } else if (tid === TILE_ID.BREAK) {
      // Table + chairs
      g.fillStyle(0xe8c87a, 1); g.fillRoundedRect(bx + 6, by + 10, 20, 14, 4);
      g.fillStyle(0x8B6914, 1);
      g.fillRoundedRect(bx + 3, by + 8, 6, 12, 3); // chair L
      g.fillRoundedRect(bx + 23, by + 8, 6, 12, 3); // chair R
      // Coffee cup
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(bx + 12, by + 12, 6, 7, 2);
      g.fillStyle(0x5b2c0c, 0.8); g.fillRect(bx + 13, by + 13, 4, 3);

    } else if (tid === TILE_ID.NURSING) {
      // Nursing station counter
      g.fillStyle(0xd5e8c8, 1); g.fillRect(bx + 2, by + 14, 28, 14);
      g.fillStyle(0xb8d4a8, 1); g.fillRect(bx + 2, by + 12, 28, 4);
      // Files/binders
      g.fillStyle(0x1abc9c, 1); g.fillRect(bx + 5, by + 15, 4, 9);
      g.fillStyle(0xe74c3c, 1); g.fillRect(bx + 11, by + 15, 4, 9);
      g.fillStyle(0xf39c12, 1); g.fillRect(bx + 17, by + 15, 4, 9);

    } else if (tid === TILE_ID.LAB) {
      // Lab equipment - microscope
      g.fillStyle(0x2c3e50, 1); g.fillRect(bx + 9, by + 12, 5, 14);
      g.fillStyle(0x95a5a6, 1); g.fillRoundedRect(bx + 6, by + 6, 10, 8, 3);
      g.fillStyle(0x3498db, 0.6); g.fillCircle(bx + 11, by + 8, 4);
      // Test tubes rack
      g.fillStyle(0xecf0f1, 1); g.fillRect(bx + 18, by + 10, 9, 16);
      g.fillStyle(0xe74c3c, 0.7); g.fillRect(bx + 19, by + 12, 2, 10);
      g.fillStyle(0xf39c12, 0.7); g.fillRect(bx + 22, by + 12, 2, 10);
      g.fillStyle(0x27ae60, 0.7); g.fillRect(bx + 25, by + 12, 2, 10);

    } else if (tid === TILE_ID.CME) {
      // Autoclave
      g.fillStyle(0xc8c8c8, 1); g.fillRoundedRect(bx + 4, by + 4, 24, 22, 4);
      g.fillStyle(0x95a5a6, 1); g.fillRoundedRect(bx + 7, by + 7, 18, 16, 2);
      g.fillStyle(0x2ecc71, 0.8); g.fillCircle(bx + 23, by + 10, 3);
      g.lineStyle(2, 0x7f8c8d, 1);
      g.beginPath(); g.moveTo(bx + 6, by + 26); g.lineTo(bx + 26, by + 26); g.strokePath();

    } else if (tid === TILE_ID.MATERNITY) {
      // Bassinet
      g.fillStyle(0xf0d0e0, 1); g.fillRoundedRect(bx + 5, by + 8, 22, 18, 6);
      g.fillStyle(0xffeef8, 1); g.fillRoundedRect(bx + 7, by + 10, 18, 14, 4);
      g.fillStyle(0xffc0d0, 0.5); g.fillRoundedRect(bx + 7, by + 10, 18, 4, 4);
      g.lineStyle(1, 0xe8a0b8, 1);
      g.beginPath(); g.moveTo(bx + 5, by + 26); g.lineTo(bx + 5, by + 32); g.strokePath();
      g.beginPath(); g.moveTo(bx + 27, by + 26); g.lineTo(bx + 27, by + 32); g.strokePath();

    } else if (tid === TILE_ID.ONCOLOGY) {
      // Chemo chair
      g.fillStyle(0x4a9e7e, 1); g.fillRoundedRect(bx + 4, by + 10, 20, 18, 5);
      g.fillStyle(0x3a8e6e, 1); g.fillRoundedRect(bx + 4, by + 6, 20, 6, 5);
      // IV pole
      g.fillStyle(0xaab0b8, 1); g.fillRect(bx + 24, by + 4, 2, 24);
      g.fillStyle(0xd5e8f8, 0.8); g.fillEllipse(bx + 25, by + 6, 8, 10);

    } else if (tid === TILE_ID.RECEPTION) {
      // Reception desk
      g.fillStyle(0xd4b896, 1); g.fillRoundedRect(bx + 2, by + 12, 28, 16, 4);
      g.fillStyle(0xc8a878, 1); g.fillRect(bx + 2, by + 12, 28, 5); // counter edge
      // Sign/computer
      g.fillStyle(0x2c3e50, 1); g.fillRect(bx + 8, by + 4, 10, 8);
      g.fillStyle(0x1dd0e0, 0.6); g.fillRect(bx + 9, by + 5, 8, 6);

    } else if (tid === TILE_ID.EMERGENCY) {
      // Crash cart
      g.fillStyle(0xe74c3c, 1); g.fillRoundedRect(bx + 3, by + 8, 16, 18, 2);
      g.fillStyle(0xecf0f1, 1); g.fillRect(bx + 5, by + 10, 12, 14);
      g.fillStyle(0x2c3e50, 1); g.fillRect(bx + 5, by + 10, 12, 3);
      g.fillStyle(0x27ae60, 1); g.fillRect(bx + 5, by + 15, 12, 3);
      g.fillStyle(0xe74c3c, 1); g.fillRect(bx + 5, by + 20, 12, 3);

    } else if (tid === TILE_ID.GARDEN) {
      // Trees / plants
      const kinds = Math.floor(Math.random() * 3);
      if (kinds === 0) {
        // Big tree
        g.fillStyle(0x27ae60, 1); g.fillCircle(bx + 16, bx < 64 ? 14 : 12, 12);
        g.fillStyle(0x2ecc71, 0.7); g.fillCircle(bx + 16, 10, 9);
        g.fillStyle(0x795548, 1); g.fillRect(bx + 14, by + 18, 4, 10);
      } else if (kinds === 1) {
        // Bush
        g.fillStyle(0x2ecc71, 1); g.fillCircle(bx + 10, by + 18, 9);
        g.fillStyle(0x27ae60, 1); g.fillCircle(bx + 20, by + 18, 9);
        g.fillStyle(0x2ecc71, 1); g.fillCircle(bx + 15, by + 13, 8);
      } else {
        // Flower bed
        g.fillStyle(0x27ae60, 1);
        for (let j = 0; j < 5; j++) {
          g.fillCircle(bx + 4 + j * 6, by + 20, 4);
        }
        const colors = [0xff9dc5, 0xffeb80, 0xff8c69, 0xffffff, 0xc8a8e8];
        for (let j = 0; j < 5; j++) {
          g.fillStyle(colors[j % colors.length], 1);
          g.fillCircle(bx + 4 + j * 6, by + 18, 3);
        }
      }

    } else if (tid === TILE_ID.REHAB) {
      // Exercise equipment
      g.fillStyle(0x7f8c8d, 1); g.fillRect(bx + 4, by + 16, 24, 4); // parallel bars
      g.fillRect(bx + 4, by + 8, 2, 12); g.fillRect(bx + 26, by + 8, 2, 12);
    }
  }

  // ─── ROOM LABELS ─────────────────────────────────────────────────────────
  private buildRoomLabels() {
    const labels: { col: number; row: number; text: string }[] = [
      { col: 6, row: 2,   text: '🚪 Recepção & Triagem' },
      { col: 18, row: 2,  text: '🚑 Pronto-Socorro' },
      { col: 30, row: 2,  text: '💊 Farmácia' },
      { col: 43, row: 2,  text: '🔬 Laboratório' },
      { col: 55, row: 2,  text: '📷 Imagem' },
      { col: 67, row: 2,  text: '🗂️ Diretoria' },
      { col: 5, row: 17,  text: '🔧 CME' },
      { col: 16, row: 17, text: '☕ Copa & Nutrição' },
      { col: 30, row: 17, text: '🛏️ Enfermaria' },
      { col: 45, row: 17, text: '🫀 UTI Adulto' },
      { col: 63, row: 17, text: '📋 Posto Enf. Central' },
      { col: 7, row: 31,  text: '🏥 Ambulatório' },
      { col: 20, row: 31, text: '👶 Maternidade' },
      { col: 34, row: 31, text: '💉 Oncologia' },
      { col: 48, row: 31, text: '🏃 Reabilitação' },
      { col: 64, row: 31, text: '🧠 Saúde Mental' },
    ];

    for (const lbl of labels) {
      this.add.text((lbl.col + 0.5) * TILE_SIZE, lbl.row * TILE_SIZE + 6, lbl.text, {
        fontFamily: "'VT323', monospace",
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0).setDepth(2).setAlpha(0.75);
    }
  }

  // ─── SPAWN ────────────────────────────────────────────────────────────────
  private spawnPlayer() {
    const startX = (7 + 0.5) * TILE_SIZE;
    const startY = (14 + 0.5) * TILE_SIZE;
    this.player = new Player(this, startX, startY);
    if (this.wallLayer) this.physics.add.collider(this.player, this.wallLayer);
  }

  private spawnNPCs() {
    for (const def of NPC_DEFS) {
      const npc = new NPC(this, def);
      if (this.wallLayer) this.physics.add.collider(npc, this.wallLayer);
      npc.updateMissionStatus(this.state);
      this.npcs.push(npc);
    }
  }

  // ─── INPUT ────────────────────────────────────────────────────────────────
  private setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      if (this.isDialogOpen || this.isCrisisOpen) return;
      saveGame(this.state);
      this.cameras.main.fadeOut(400, 0, 0, 0, (_c: unknown, p: number) => {
        if (p === 1) this.scene.start(SCENES.MENU);
      });
    });
  }

  // ─── CAMERA ───────────────────────────────────────────────────────────────
  private setupCamera() {
    this.cameras.main
      .startFollow(this.player, true, 0.08, 0.08)
      .setZoom(CAMERA_ZOOM)
      .setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
  }

  // ─── VIGNETTE ─────────────────────────────────────────────────────────────
  private createVignette() {
    const W = this.scale.width, H = this.scale.height;
    if (this.textures.exists('__vignette')) this.textures.remove('__vignette');
    const ct = this.textures.createCanvas('__vignette', W, H) as Phaser.Textures.CanvasTexture;
    const ctx = ct.getContext();
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ct.refresh();
    this.add.image(W / 2, H / 2, '__vignette').setDepth(100).setScrollFactor(0);
  }

  // ─── CRISIS SYSTEM ────────────────────────────────────────────────────────
  private scheduleCrisis() {
    // Next crisis in 60-120 game minutes (= 20-40 real seconds at 3 min/sec)
    this.nextCrisisTime = this.state.gameTime + Phaser.Math.Between(60, 120);
  }

  private triggerCrisis() {
    if (this.isCrisisOpen || this.isDialogOpen) {
      this.scheduleCrisis(); return;
    }

    const available = CRISIS_EVENTS.filter(e => {
      const lvl = getLevelInfo(this.state.prestige).level;
      return e.minCareerLevel <= lvl;
    });
    if (available.length === 0) { this.scheduleCrisis(); return; }

    const event = available[Phaser.Math.Between(0, available.length - 1)];
    this.showCrisisOverlay(event);
    this.state.crisisCount = (this.state.crisisCount || 0) + 1;
    this.scheduleCrisis();
  }

  private showCrisisOverlay(event: CrisisEvent) {
    this.isCrisisOpen = true;

    const W = this.scale.width, H = this.scale.height;
    const panelW = 680, panelH = 420;

    const container = this.add.container(W / 2, H / 2).setDepth(500).setScrollFactor(0);

    // Dimmer
    const dimmer = this.add.rectangle(0, 0, W * 2, H * 2, 0x000000, 0.7).setScrollFactor(0).setDepth(499);

    // Panel bg
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.5);
    shadow.fillRoundedRect(-panelW / 2 + 8, -panelH / 2 + 8, panelW, panelH, 16);

    const bg = this.add.graphics();
    bg.fillStyle(event.urgent ? 0x1a0505 : 0x0a1a2e, 1);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    bg.lineStyle(4, event.urgent ? 0xe74c3c : 0xf39c12, 1);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);

    // Urgent pulse effect
    if (event.urgent) {
      this.tweens.add({
        targets: bg, alpha: 0.85, duration: 300, yoyo: true, repeat: 5,
      });
    }

    // Title
    const titleText = this.add.text(0, -panelH / 2 + 30, event.title, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '13px',
      color: event.urgent ? '#ff6b6b' : '#f39c12',
      wordWrap: { width: panelW - 40 },
      align: 'center',
    }).setOrigin(0.5);

    // Description
    const desc = this.add.text(0, -panelH / 2 + 75, event.description, {
      fontFamily: "'VT323', monospace",
      fontSize: '22px',
      color: '#ecf0f1',
      wordWrap: { width: panelW - 60 },
      align: 'center',
    }).setOrigin(0.5);

    // Choices
    const choiceItems: Phaser.GameObjects.GameObject[] = [];
    const startY = -panelH / 2 + 145;
    const btnH = 68;
    const btnW = panelW - 60;

    event.choices.forEach((choice, idx) => {
      const cy = startY + idx * (btnH + 8);

      const btnBg = this.add.graphics();
      btnBg.fillStyle(0x1e3a5f, 1);
      btnBg.fillRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 8);
      btnBg.lineStyle(2, 0x3498db, 1);
      btnBg.strokeRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 8);

      const numTxt = this.add.text(-btnW / 2 + 16, cy, `${idx + 1}`, {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '13px',
        color: '#f39c12',
      }).setOrigin(0, 0.5);

      const choiceTxt = this.add.text(-btnW / 2 + 36, cy, choice.text, {
        fontFamily: "'VT323', monospace",
        fontSize: '20px',
        color: '#ecf0f1',
        wordWrap: { width: btnW - 50 },
        lineSpacing: 2,
      }).setOrigin(0, 0.5);

      // Interactive zone
      const zone = this.add.zone(-btnW / 2, cy - btnH / 2, btnW, btnH).setOrigin(0)
        .setInteractive({ cursor: 'pointer' });

      zone.on('pointerover', () => {
        btnBg.clear();
        btnBg.fillStyle(0x2563a8, 1);
        btnBg.fillRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 8);
        btnBg.lineStyle(3, 0xf1c40f, 1);
        btnBg.strokeRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 8);
      });

      zone.on('pointerout', () => {
        btnBg.clear();
        btnBg.fillStyle(0x1e3a5f, 1);
        btnBg.fillRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 8);
        btnBg.lineStyle(2, 0x3498db, 1);
        btnBg.strokeRoundedRect(-btnW / 2, cy - btnH / 2, btnW, btnH, 8);
      });

      zone.on('pointerdown', () => this.resolveCrisis(event, idx, container, dimmer));
      this.input.keyboard?.once(`keydown-${idx + 1}`, () => this.resolveCrisis(event, idx, container, dimmer));

      choiceItems.push(btnBg, numTxt, choiceTxt, zone);
    });

    // Countdown timer bar
    const timerBg = this.add.graphics();
    timerBg.fillStyle(0x2c3e50, 1);
    timerBg.fillRoundedRect(-panelW / 2 + 20, panelH / 2 - 30, panelW - 40, 15, 7);

    const timerFill = this.add.graphics();
    const timerDur = event.urgent ? 15000 : 25000;
    let elapsed = 0;

    const timerUpdate = () => {
      elapsed += 200;
      const pct = Math.max(0, 1 - elapsed / timerDur);
      const col = pct > 0.5 ? 0x2ecc71 : pct > 0.25 ? 0xf39c12 : 0xe74c3c;
      timerFill.clear();
      timerFill.fillStyle(col, 1);
      timerFill.fillRoundedRect(-panelW / 2 + 20, panelH / 2 - 30, (panelW - 40) * pct, 15, 7);
      if (pct === 0 && this.isCrisisOpen) {
        // Auto-resolve with worst choice on timeout
        this.resolveCrisis(event, event.choices.length - 1, container, dimmer);
      }
    };

    const timerEvent = this.time.addEvent({ delay: 200, repeat: timerDur / 200, callback: timerUpdate });

    container.add([shadow, bg, titleText, desc, ...choiceItems, timerBg, timerFill]);

    // Animate in
    container.setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut' });

    container.setData('timerEvent', timerEvent);
    this.crisisOverlay = container;
  }

  private resolveCrisis(event: CrisisEvent, choiceIdx: number, container: Phaser.GameObjects.Container, dimmer: Phaser.GameObjects.Rectangle) {
    if (!this.isCrisisOpen) return;
    this.isCrisisOpen = false;

    const choice = event.choices[choiceIdx];
    const timerEv = container.getData('timerEvent') as Phaser.Time.TimerEvent;
    timerEv?.remove();

    // Apply effects
    this.state.prestige = Math.max(0, this.state.prestige + choice.prestigeEffect);
    this.state.energy = Math.max(0, Math.min(100, this.state.energy + choice.energyEffect));
    this.state.stress = Math.max(0, Math.min(100, (this.state.stress || 0) + choice.stressEffect));
    this.state.decisionLog = [...(this.state.decisionLog || []), `${event.id}:${choiceIdx}`].slice(-20);

    // Show feedback panel
    this.showCrisisFeedback(choice.feedback, choice.correct, choice.prestigeEffect, container, dimmer);
  }

  private showCrisisFeedback(text: string, correct: boolean, pts: number, crisisContainer: Phaser.GameObjects.Container, dimmer: Phaser.GameObjects.Rectangle) {
    // Remove crisis panel
    this.tweens.add({
      targets: crisisContainer, alpha: 0, y: crisisContainer.y - 20, duration: 200,
      onComplete: () => crisisContainer.destroy(),
    });

    const W = this.scale.width, H = this.scale.height;
    const fbW = 600, fbH = 140;
    const fb = this.add.container(W / 2, H / 2 - 80).setDepth(501).setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(correct ? 0x0a2a1a : 0x2a0a0a, 1);
    bg.fillRoundedRect(-fbW / 2, -fbH / 2, fbW, fbH, 12);
    bg.lineStyle(3, correct ? 0x2ecc71 : 0xe74c3c, 1);
    bg.strokeRoundedRect(-fbW / 2, -fbH / 2, fbW, fbH, 12);

    const icon = this.add.text(-fbW / 2 + 30, 0, correct ? '✅' : '⚠️', { fontSize: '32px' }).setOrigin(0, 0.5);

    const ptsSign = pts >= 0 ? '+' : '';
    const ptsLabel = this.add.text(-fbW / 2 + 70, -fbH / 2 + 18,
      `${correct ? 'CORRETO!' : 'ATENÇÃO!'} ${ptsSign}${pts} pts`, {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '11px',
        color: correct ? '#2ecc71' : '#e74c3c',
      });

    const feedTxt = this.add.text(-fbW / 2 + 70, -fbH / 2 + 48, text, {
      fontFamily: "'VT323', monospace",
      fontSize: '19px',
      color: '#ecf0f1',
      wordWrap: { width: fbW - 90 },
    });

    fb.add([bg, icon, ptsLabel, feedTxt]);
    fb.setScale(0.9).setAlpha(0);
    this.tweens.add({
      targets: fb, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: [fb, dimmer], alpha: 0, duration: 400, delay: 4000,
          onComplete: () => { fb.destroy(); dimmer.destroy(); this.crisisOverlay = null; },
        });
      },
    });

    // Show prestige change
    const colorStr = pts >= 0 ? '#2ecc71' : '#e74c3c';
    this.showFloatingText(this.player.x, this.player.y - 40, `${pts >= 0 ? '+' : ''}${pts} pts`, colorStr, 28);
    this.emitHudUpdate();
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  update(time: number, delta: number) {
    if (this.isDialogOpen || this.isCrisisOpen) return;

    // Movement
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const sprint = this.shiftKey.isDown && this.state.energy > 10;
    this.player.move(up, down, left, right, delta, sprint);

    // NPC AI update
    for (const npc of this.npcs) npc.update(delta);

    // Detect nearby NPC
    this.detectNearbyNPC();

    // Interaction
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.nearbyNPC) {
      this.openDialog(this.nearbyNPC);
    }

    // Mission overlay toggle
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      this.toggleMissionOverlay();
    }

    // Game time advance
    this.timeAccum += delta;
    if (this.timeAccum >= 1000) {
      this.timeAccum -= 1000;
      this.state.gameTime += GAME_MINUTES_PER_SECOND;
      if (this.state.gameTime >= 1440) {
        this.state.gameTime -= 1440;
        this.state.day = (this.state.day || 1) + 1;
      }
    }

    // Crisis timer
    this.crisisTimer += delta;
    if (this.crisisTimer >= 1000) {
      this.crisisTimer -= 1000;
      if (this.state.gameTime >= this.nextCrisisTime) {
        this.triggerCrisis();
      }
    }

    // Energy depletion (every 6s = 1 point; sprint costs more)
    this.energyTimer += delta;
    const energyDrain = sprint ? 3000 : 7000;
    if (this.energyTimer >= energyDrain && this.state.energy > 0) {
      this.energyTimer = 0;
      this.state.energy = Math.max(0, this.state.energy - 1);
    }

    // Room detection
    const col = Math.floor(this.player.x / TILE_SIZE);
    const row = Math.floor(this.player.y / TILE_SIZE);
    const tileId = (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS)
      ? this.mapData[row][col] : TILE_ID.CORRIDOR;

    // Break room: restore energy and reduce stress
    if (tileId === TILE_ID.BREAK) {
      this.energyRestoreTimer += delta;
      if (this.energyRestoreTimer >= 1500 && this.state.energy < 100) {
        this.energyRestoreTimer = 0;
        this.state.energy = Math.min(100, this.state.energy + 6);
        this.showFloatingText(this.player.x, this.player.y - 30, '+6 ⚡', '#f1c40f');
      }
      // Also reduce stress
      this.stressDecayTimer += delta;
      if (this.stressDecayTimer >= 3000 && this.state.stress > 0) {
        this.stressDecayTimer = 0;
        this.state.stress = Math.max(0, this.state.stress - 3);
      }
    } else {
      this.energyRestoreTimer = 0;
      this.stressDecayTimer = 0;
    }

    // Garden: gentle stress reduction
    if (tileId === TILE_ID.GARDEN) {
      this.stressDecayTimer += delta;
      if (this.stressDecayTimer >= 5000 && this.state.stress > 0) {
        this.stressDecayTimer = 0;
        this.state.stress = Math.max(0, this.state.stress - 1);
      }
    }

    // Room change event
    if (tileId !== this.currentRoom) {
      this.currentRoom = tileId;
      const roomName = ROOM_NAMES[tileId] || '';
      if (roomName) this.events.emit(EV.ROOM_CHANGE, roomName);
    }

    // Animate monitor lights
    for (const ml of this.monitorLights) {
      const pulse = 0.4 + 0.6 * Math.sin(time / 800 + ml.phase);
      ml.obj.setAlpha(pulse);
    }

    // HUD update (throttled)
    if (time - this.lastHudEmit > 300) {
      this.lastHudEmit = time;
      this.emitHudUpdate();
    }
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  private detectNearbyNPC() {
    let closest: NPC | null = null, minDist = INTERACTION_DISTANCE;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < minDist) { minDist = d; closest = npc; }
    }
    if (closest !== this.nearbyNPC) {
      this.nearbyNPC = closest;
      if (closest) {
        this.events.emit(EV.INTERACTION_HINT, `[E] Falar com ${closest.def.name}`);
      } else {
        this.events.emit(EV.INTERACTION_HINT, 'WASD/Setas: Mover  |  SHIFT: Correr  |  E: Interagir  |  M: Missões  |  ESC: Menu');
      }
    }
  }

  private openDialog(npc: NPC) {
    this.isDialogOpen = true;
    const dialogue = npc.getDialogue(this.state);
    this.scene.launch(SCENES.DIALOG, {
      npcDef: npc.def,
      dialogue,
      state: this.state,
      onClose: (updates: Partial<GameState>) => {
        this.state = { ...this.state, ...updates };
        this.isDialogOpen = false;
        for (const n of this.npcs) n.updateMissionStatus(this.state);
        saveGame(this.state);
        this.emitHudUpdate();
        this.events.emit(EV.INTERACTION_HINT, '');
        this.checkMilestones();
      },
    });
  }

  private checkMilestones() {
    if (this.state.completedMissions.length === MISSIONS.length) {
      this.showFloatingText(this.player.x, this.player.y - 60, '🏆 TODAS AS MISSÕES CONCLUÍDAS!', '#f1c40f', 24);
    }
  }

  private toggleMissionOverlay() {
    if (this.missionOverlay) { this.missionOverlay.destroy(); this.missionOverlay = null; return; }

    const W = this.scale.width, H = this.scale.height;
    const panelW = 520, panelH = Math.min(560, H - 80);
    const c = this.add.container(W / 2, H / 2).setDepth(300).setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f1e, 0.97);
    bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);
    bg.lineStyle(3, 0x1abc9c, 1);
    bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 16);

    const title = this.add.text(0, -panelH / 2 + 22, '📋  MISSÕES  DO  HUAP', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '11px',
      color: '#1abc9c',
    }).setOrigin(0.5);

    const lvInfo = getLevelInfo(this.state.prestige);
    const careerTxt = this.add.text(0, -panelH / 2 + 44,
      `${lvInfo.title} · ⭐ ${this.state.prestige} pts`, {
        fontFamily: "'VT323', monospace",
        fontSize: '19px',
        color: '#f1c40f',
      }).setOrigin(0.5);

    const closeBtn = this.add.text(panelW / 2 - 18, -panelH / 2 + 16, '✕', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '11px',
      color: '#e74c3c',
    }).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => { c.destroy(); this.missionOverlay = null; });

    const items: Phaser.GameObjects.Text[] = [];
    let y = -panelH / 2 + 68;

    // Group by category
    const categories = [...new Set(MISSIONS.map(m => m.category))];
    for (const cat of categories) {
      const catMissions = MISSIONS.filter(m => m.category === cat);
      const catLabel = this.add.text(-panelW / 2 + 14, y, `── ${cat}`, {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '8px',
        color: '#7f8c8d',
      });
      items.push(catLabel);
      y += 16;

      for (const m of catMissions) {
        const done = this.state.completedMissions.includes(m.id);
        const active = !!this.state.missionProgress[m.id] && !done;
        const locked = !done && !active && m.prerequisiteIds.some(id => !this.state.completedMissions.includes(id));

        const icon = done ? '✅' : active ? '▶' : locked ? '🔒' : '○';
        const col = done ? '#2ecc71' : active ? '#f1c40f' : locked ? '#636e72' : '#bdc3c7';

        const line = this.add.text(-panelW / 2 + 14, y, `${icon} ${m.title} (+${m.prestige}pts)`, {
          fontFamily: "'VT323', monospace",
          fontSize: '17px',
          color: col,
        });
        items.push(line);
        y += 19;
      }
      y += 4;
    }

    const done = this.state.completedMissions.length;
    const total = MISSIONS.length;
    const pct = (done / total * 100) | 0;

    const prog = this.add.text(0, panelH / 2 - 22,
      `Progresso: ${done}/${total} (${pct}%)  |  Stress: ${Math.floor(this.state.stress || 0)}%`, {
        fontFamily: "'VT323', monospace",
        fontSize: '16px',
        color: '#bdc3c7',
      }).setOrigin(0.5);

    c.add([bg, title, careerTxt, closeBtn, ...items, prog]);
    this.mKey.once('down', () => { c.destroy(); this.missionOverlay = null; });
    this.missionOverlay = c;
  }

  private emitHudUpdate() {
    const activeMission = MISSIONS.find(m =>
      this.state.missionProgress[m.id] && !this.state.completedMissions.includes(m.id)
    );
    this.events.emit(EVENTS.HUD_UPDATE, {
      state: this.state,
      playerX: this.player.x,
      playerY: this.player.y,
      activeMission: activeMission?.title,
    });
  }

  private showFloatingText(x: number, y: number, msg: string, color: string, size = 22) {
    const txt = this.add.text(x, y, msg, {
      fontFamily: "'VT323', monospace",
      fontSize: `${size}px`,
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: txt, y: y - 50, alpha: 0, duration: 1800,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });
  }
}
