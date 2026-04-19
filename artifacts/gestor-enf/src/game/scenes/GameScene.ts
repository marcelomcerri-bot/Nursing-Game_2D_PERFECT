import * as Phaser from 'phaser';
import {
  TILE_SIZE, MAP_COLS, MAP_ROWS,
  CAMERA_ZOOM, SCENES, EVENTS, EVENTS as EV,
  INTERACTION_DISTANCE, GAME_MINUTES_PER_SECOND, ROOM_NAMES,
} from '../constants';
import { generateMapTiles } from '../data/gameData';
import { NPC_DEFS, MISSIONS } from '../data/gameData';
import type { GameState } from '../data/gameData';
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
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private eKey!: Phaser.Input.Keyboard.Key;
  private mKey!: Phaser.Input.Keyboard.Key;
  private timeAccum = 0;
  private currentRoom = 2; // CORRIDOR
  private nearbyNPC: NPC | null = null;
  private isDialogOpen = false;
  private missionOverlay: Phaser.GameObjects.Container | null = null;
  private energyTimer = 0;
  private energyRestoreTimer = 0;
  private roomDecals: Phaser.GameObjects.Text[] = [];
  private doorParticles: Phaser.GameObjects.Graphics[] = [];
  private lastHudEmit = 0;

  constructor() { super({ key: SCENES.GAME }); }

  create() {
    this.state = loadGame();
    this.mapData = generateMapTiles();

    this.buildTilemap();
    this.buildWalls();
    this.buildRoomDecals();
    this.spawnPlayer();
    this.spawnNPCs();
    this.setupInput();
    this.setupCamera();
    this.buildDoorEffects();

    // Start HUD (parallel scene)
    this.scene.launch(SCENES.HUD);

    // Ambient lighting overlay
    this.createAmbientOverlay();

    // Camera fade in
    this.cameras.main.fadeIn(600);

    // Auto-save every 30 seconds
    this.time.addEvent({
      delay: 30000,
      loop: true,
      callback: () => saveGame(this.state),
    });

    // Initial HUD update
    this.emitHudUpdate();

    // Mission panel keybind
    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  }

  // ─── TILEMAP ─────────────────────────────────────────────────────────────
  private buildTilemap() {
    const map = this.make.tilemap({
      data: this.mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) return;
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) return;
    layer.setDepth(0);
    // Set world bounds
    this.physics.world.setBounds(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
  }

  private buildWalls() {
    this.wallLayer = this.physics.add.staticGroup();
    const WALL = 1;

    // Merge adjacent wall columns in same row for better performance
    for (let row = 0; row < MAP_ROWS; row++) {
      let startCol = -1;
      for (let col = 0; col <= MAP_COLS; col++) {
        const isWall = col < MAP_COLS && (this.mapData[row][col] === WALL || this.mapData[row][col] === 0);
        if (isWall && startCol === -1) {
          startCol = col;
        } else if (!isWall && startCol !== -1) {
          const length = col - startCol;
          const wx = (startCol + length / 2) * TILE_SIZE;
          const wy = (row + 0.5) * TILE_SIZE;
          const body = this.wallLayer!.create(wx, wy, 'pixel') as Phaser.Physics.Arcade.Image;
          body.setVisible(false);
          body.setDisplaySize(length * TILE_SIZE, TILE_SIZE);
          body.refreshBody();
          startCol = -1;
        }
      }
    }
  }

  private buildRoomDecals() {
    const ROOM_LABEL_POSITIONS: { tileId: number; col: number; row: number; icon: string }[] = [
      { tileId: 3,  col: 11, row: 7,  icon: '🫀 UTI' },
      { tileId: 4,  col: 30, row: 7,  icon: '💊 Farmácia' },
      { tileId: 5,  col: 42, row: 7,  icon: '🗂️ Administrativo' },
      { tileId: 6,  col: 11, row: 25, icon: '🛏️ Enfermaria' },
      { tileId: 7,  col: 30, row: 21, icon: '☕ Copa & Descanso' },
      { tileId: 8,  col: 30, row: 30, icon: '📋 Posto de Enfermagem' },
      { tileId: 9,  col: 42, row: 20, icon: '🚪 Recepção' },
      { tileId: 10, col: 42, row: 29, icon: '🚑 Pronto-Socorro' },
    ];

    for (const def of ROOM_LABEL_POSITIONS) {
      const x = (def.col + 0.5) * TILE_SIZE;
      const y = def.row * TILE_SIZE - 8;
      const txt = this.add.text(x, y, def.icon, {
        fontFamily: "'VT323', monospace",
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
        alpha: 0.7,
      }).setOrigin(0.5, 1).setDepth(1);
      this.roomDecals.push(txt);
    }
  }

  private buildDoorEffects() {
    const DOOR_POSITIONS = [
      { col: 10, row: 13 }, { col: 11, row: 13 },
      { col: 21, row: 7 },
      { col: 29, row: 13 }, { col: 30, row: 13 },
      { col: 24, row: 7 },
      { col: 41, row: 13 }, { col: 42, row: 13 },
      { col: 36, row: 7 },
      { col: 10, row: 16 }, { col: 11, row: 16 },
      { col: 21, row: 25 },
      { col: 29, row: 16 }, { col: 30, row: 16 },
      { col: 24, row: 21 },
      { col: 29, row: 27 }, { col: 30, row: 27 },
      { col: 24, row: 30 },
      { col: 41, row: 16 }, { col: 42, row: 16 },
      { col: 36, row: 20 },
      { col: 41, row: 24 }, { col: 42, row: 24 },
      { col: 36, row: 28 },
    ];

    for (const dp of DOOR_POSITIONS) {
      const gfx = this.add.graphics().setDepth(0.5).setAlpha(0.5);
      gfx.fillStyle(0x8ecae6, 0.6);
      gfx.fillRect(dp.col * TILE_SIZE + 2, dp.row * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      this.doorParticles.push(gfx);
    }
  }

  private createAmbientOverlay() {
    // Subtle vignette
    const vignette = this.add.graphics().setDepth(100).setScrollFactor(0);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    vignette.fillRect(0, 0, this.scale.width, this.scale.height);
  }

  // ─── SPAWN ────────────────────────────────────────────────────────────────
  private spawnPlayer() {
    const startX = 23 * TILE_SIZE + TILE_SIZE / 2;
    const startY = 20 * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, startX, startY);
    if (this.wallLayer) {
      this.physics.add.collider(this.player, this.wallLayer);
    }
  }

  private spawnNPCs() {
    for (const def of NPC_DEFS) {
      const npc = new NPC(this, def);
      if (this.wallLayer) {
        this.physics.add.collider(npc, this.wallLayer);
      }
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
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    Phaser.Input.Keyboard.JustDown; // ensure imported

    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => {
        if (this.isDialogOpen) return;
        saveGame(this.state);
        this.cameras.main.fadeOut(400, 0, 0, 0, (_c: unknown, p: number) => {
          if (p === 1) this.scene.start(SCENES.MENU);
        });
      });
  }

  // ─── CAMERA ──────────────────────────────────────────────────────────────
  private setupCamera() {
    const worldW = MAP_COLS * TILE_SIZE;
    const worldH = MAP_ROWS * TILE_SIZE;
    this.cameras.main
      .startFollow(this.player, true, 0.08, 0.08)
      .setZoom(CAMERA_ZOOM)
      .setBounds(0, 0, worldW, worldH);
  }

  // ─── UPDATE LOOP ─────────────────────────────────────────────────────────
  update(time: number, delta: number) {
    if (this.isDialogOpen) return;

    // Player movement
    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    this.player.move(up, down, left, right, delta);

    // NPC updates
    for (const npc of this.npcs) npc.update(delta);

    // Detect nearby NPC
    this.detectNearbyNPC();

    // Interaction
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.nearbyNPC) {
      this.openDialog(this.nearbyNPC);
    }

    // Mission panel
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      this.toggleMissionOverlay();
    }

    // Time advance
    this.timeAccum += delta;
    if (this.timeAccum >= 1000) {
      this.timeAccum -= 1000;
      this.state.gameTime += GAME_MINUTES_PER_SECOND;
      // Day rollover at midnight (24:00 = 1440 min)
      if (this.state.gameTime >= 1440) {
        this.state.gameTime -= 1440;
        this.state.day += 1;
      }
    }

    // Energy depletion
    this.energyTimer += delta;
    if (this.energyTimer >= 8000 && this.state.energy > 0) {
      this.energyTimer = 0;
      this.state.energy = Math.max(0, this.state.energy - 1);
    }

    // Energy restore in break room
    const col = Math.floor(this.player.x / TILE_SIZE);
    const row = Math.floor(this.player.y / TILE_SIZE);
    const tileId = row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS
      ? this.mapData[row][col] : 2;

    if (tileId === 7 /* BREAK */) {
      this.energyRestoreTimer += delta;
      if (this.energyRestoreTimer >= 2000 && this.state.energy < 100) {
        this.energyRestoreTimer = 0;
        this.state.energy = Math.min(100, this.state.energy + 5);
        this.showFloatingText(this.player.x, this.player.y - 30, '+5 ⚡', '#00b894');
      }
    } else {
      this.energyRestoreTimer = 0;
    }

    // Room detection
    if (tileId !== this.currentRoom) {
      this.currentRoom = tileId;
      const roomName = ROOM_NAMES[tileId] || '';
      if (roomName) this.events.emit(EV.ROOM_CHANGE, roomName);
    }

    // HUD update (throttled)
    if (time - this.lastHudEmit > 200) {
      this.lastHudEmit = time;
      this.emitHudUpdate();
    }
  }

  private detectNearbyNPC() {
    let closest: NPC | null = null;
    let minDist = INTERACTION_DISTANCE;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < minDist) { minDist = d; closest = npc; }
    }

    if (closest !== this.nearbyNPC) {
      this.nearbyNPC = closest;
      if (closest) {
        this.events.emit(EV.INTERACTION_HINT, `Pressione [E] para falar com ${closest.def.name}`);
      } else {
        this.events.emit(EV.INTERACTION_HINT, 'WASD/Setas: Mover  |  E: Interagir  |  M: Missões  |  ESC: Menu');
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
        // Check mission completion achievements
        this.checkMissionNotifications();
      },
    });
  }

  private checkMissionNotifications() {
    const recentlyDone = this.state.completedMissions;
    const total = MISSIONS.length;
    if (recentlyDone.length === total) {
      this.showFloatingText(this.player.x, this.player.y - 50,
        '🏆 TODAS AS MISSÕES CONCLUÍDAS!', '#f9ca24', 26);
    }
  }

  private toggleMissionOverlay() {
    if (this.missionOverlay) {
      this.missionOverlay.destroy();
      this.missionOverlay = null;
      return;
    }

    const W = 500, H = 400;
    const cx = this.cameras.main.worldView.x + this.scale.width / (2 * CAMERA_ZOOM);
    const cy = this.cameras.main.worldView.y + this.scale.height / (2 * CAMERA_ZOOM);

    const container = this.add.container(cx, cy).setDepth(200).setScrollFactor(0);
    const bg = this.add.rectangle(0, 0, W, H, 0x0a0a1e, 0.96)
      .setStrokeStyle(2, 0x00b894);
    const title = this.add.text(0, -H / 2 + 20, '📋 MISSÕES', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '14px',
      color: '#00b894',
    }).setOrigin(0.5);

    const closeBtn = this.add.text(W / 2 - 20, -H / 2 + 14, '✕', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '12px',
      color: '#e84393',
    }).setInteractive({ cursor: 'pointer' })
      .on('pointerdown', () => { container.destroy(); this.missionOverlay = null; });

    const items: Phaser.GameObjects.Text[] = [];
    let y = -H / 2 + 55;

    for (const mission of MISSIONS) {
      const isDone = this.state.completedMissions.includes(mission.id);
      const isActive = !!this.state.missionProgress[mission.id] && !isDone;
      const isLocked = mission.prerequisiteIds.some(
        id => !this.state.completedMissions.includes(id)
      ) && !isDone && !isActive;

      const icon = isDone ? '✅' : isActive ? '🔄' : isLocked ? '🔒' : '○';
      const color = isDone ? '#00b894' : isActive ? '#f9ca24' : isLocked ? '#636e72' : '#ffffff';

      const line = this.add.text(
        -W / 2 + 20, y,
        `${icon} ${mission.title}`,
        {
          fontFamily: "'VT323', monospace",
          fontSize: '18px',
          color,
        }
      );
      items.push(line);

      const catLine = this.add.text(
        -W / 2 + 36, y + 18,
        `${mission.category} · ⭐ ${mission.prestige} pts`,
        {
          fontFamily: "'VT323', monospace",
          fontSize: '14px',
          color: '#aaaaaa',
        }
      );
      items.push(catLine);
      y += 42;
    }

    const completedCount = this.state.completedMissions.length;
    const totalCount = MISSIONS.length;
    const summary = this.add.text(
      0, H / 2 - 24,
      `Concluídas: ${completedCount}/${totalCount}  |  Total: ${this.state.prestige} pts`,
      {
        fontFamily: "'VT323', monospace",
        fontSize: '17px',
        color: '#f9ca24',
      }
    ).setOrigin(0.5);

    container.add([bg, title, closeBtn, ...items, summary]);

    // Close on M key again
    this.mKey.once('down', () => {
      container.destroy();
      this.missionOverlay = null;
    });

    this.missionOverlay = container;
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

  private showFloatingText(x: number, y: number, msg: string, color: string, size = 20) {
    const txt = this.add.text(x, y, msg, {
      fontFamily: "'VT323', monospace",
      fontSize: `${size}px`,
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 1800,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }
}
