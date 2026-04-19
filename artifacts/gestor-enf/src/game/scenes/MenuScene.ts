import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from '../constants';
import { hasSave, clearSave } from '../utils/save';

const DEEP_BLUE   = 0x0a0a1a;
const MID_BLUE    = 0x0d1b3e;
const TEAL        = 0x00b894;
const TEAL_DARK   = 0x007a64;
const RED_ACCENT  = 0xe84393;
const WHITE       = 0xffffff;
const GOLD        = 0xf9ca24;

export class MenuScene extends Phaser.Scene {
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() { super({ key: SCENES.MENU }); }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // ── Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(DEEP_BLUE, DEEP_BLUE, MID_BLUE, MID_BLUE, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // ── Animated floor grid lines
    const gridGfx = this.add.graphics();
    const GRID = 48;
    for (let x = 0; x < GAME_WIDTH; x += GRID) {
      gridGfx.lineStyle(1, TEAL_DARK, 0.15);
      gridGfx.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += GRID) {
      gridGfx.lineStyle(1, TEAL_DARK, 0.15);
      gridGfx.lineBetween(0, y, GAME_WIDTH, y);
    }

    // ── Hospital silhouette (decorative background)
    this.drawHospitalSilhouette(cx, 420);

    // ── Particle cross symbols (medical)
    this.createMedicalParticles();

    // ── Top separator line
    this.add.graphics()
      .lineStyle(2, TEAL, 0.8)
      .lineBetween(cx - 300, 80, cx + 300, 80);

    // ── TITLE
    this.add.text(cx, 130, 'GESTOR ENF', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '52px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 196, 'GERÊNCIA HOSPITALAR 2D', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '14px',
      color: '#00d2ff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Animated pulse circle behind title
    const pulse = this.add.circle(cx, 152, 8, TEAL, 0.6).setDepth(-1);
    this.tweens.add({
      targets: pulse,
      scaleX: 30, scaleY: 10, alpha: 0,
      duration: 2000, repeat: -1,
    });

    // ── Buttons
    const btnY = 340;
    const btnSpacing = 70;

    this.createButton(cx, btnY, 'NOVO JOGO', TEAL, () => {
      clearSave();
      this.startGame();
    });

    if (hasSave()) {
      this.createButton(cx, btnY + btnSpacing, 'CONTINUAR', 0x6c5ce7, () => {
        this.startGame();
      });
    }

    this.createButton(cx, btnY + btnSpacing * (hasSave() ? 2 : 1), 'COMO JOGAR', 0x636e72, () => {
      this.showHelp();
    });

    // ── Credits line
    this.add.text(cx, GAME_HEIGHT - 24, 'Baseado em: Kurcgant (2016) · Marquis & Huston (2015) · COFEN', {
      fontFamily: "'VT323', monospace",
      fontSize: '14px',
      color: '#636e72',
    }).setOrigin(0.5);

    // ── Version
    this.add.text(GAME_WIDTH - 12, GAME_HEIGHT - 12, 'v2.0', {
      fontFamily: "'VT323', monospace",
      fontSize: '14px',
      color: '#4a4a6a',
    }).setOrigin(1, 1);

    // Scan-line overlay
    const scanlines = this.add.graphics().setDepth(100).setAlpha(0.04);
    for (let y = 0; y < GAME_HEIGHT; y += 2) {
      scanlines.lineStyle(1, WHITE, 1);
      scanlines.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Camera fade in
    this.cameras.main.fadeIn(800);
  }

  private drawHospitalSilhouette(cx: number, cy: number) {
    const g = this.add.graphics().setAlpha(0.07);
    g.fillStyle(0x4ecdc4);
    // Main building
    g.fillRect(cx - 200, cy - 80, 400, 100);
    // Tower
    g.fillRect(cx - 40, cy - 140, 80, 80);
    // Cross
    g.fillStyle(0xe84393);
    g.fillRect(cx - 10, cy - 165, 20, 50);
    g.fillRect(cx - 25, cy - 150, 50, 20);
    // Windows
    g.fillStyle(0x2d3436);
    for (let i = 0; i < 8; i++) {
      g.fillRect(cx - 180 + i * 46, cy - 60, 24, 28);
    }
  }

  private createMedicalParticles() {
    // Floating + symbols
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const plus = this.add.text(x, y, '+', {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: Phaser.Math.Between(8, 16) + 'px',
        color: '#00b89455',
        alpha: Phaser.Math.FloatBetween(0.1, 0.3),
      }).setAlpha(Phaser.Math.FloatBetween(0.1, 0.3));

      this.tweens.add({
        targets: plus,
        y: y - Phaser.Math.Between(80, 200),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 8000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          plus.setY(Phaser.Math.Between(GAME_HEIGHT * 0.5, GAME_HEIGHT));
          plus.setAlpha(Phaser.Math.FloatBetween(0.1, 0.3));
        },
      });
    }
  }

  private createButton(
    x: number, y: number, label: string,
    color: number, callback: () => void
  ) {
    const W = 280, H = 48;
    const container = this.add.container(x, y);

    const shadow = this.add.rectangle(4, 4, W, H, 0x000000, 0.4);
    const bg = this.add.rectangle(0, 0, W, H, color);
    const border = this.add.rectangle(0, 0, W, H).setStrokeStyle(2, 0xffffff, 0.6);
    const txt = this.add.text(0, 0, label, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '11px',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([shadow, bg, border, txt]);
    container.setSize(W, H).setInteractive({ cursor: 'pointer' });

    container.on('pointerover', () => {
      bg.setScale(1.04);
      txt.setScale(1.04);
      border.setStrokeStyle(2, 0xffffff, 1);
      this.tweens.add({ targets: container, y: y - 2, duration: 80 });
    });

    container.on('pointerout', () => {
      bg.setScale(1);
      txt.setScale(1);
      border.setStrokeStyle(2, 0xffffff, 0.6);
      this.tweens.add({ targets: container, y, duration: 80 });
    });

    container.on('pointerdown', () => {
      this.cameras.main.flash(100, 255, 255, 255, false);
      this.time.delayedCall(100, callback);
    });
  }

  private startGame() {
    this.cameras.main.fadeOut(500, 0, 0, 0, (_cam: unknown, progress: number) => {
      if (progress === 1) {
        this.scene.start(SCENES.GAME);
      }
    });
  }

  private showHelp() {
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH * 0.8, GAME_HEIGHT * 0.8,
      0x0a0a2a, 0.97
    ).setDepth(50).setInteractive();

    this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH * 0.8, GAME_HEIGHT * 0.8,
    ).setStrokeStyle(2, TEAL, 1).setDepth(51);

    const helpText = [
      'COMO JOGAR',
      '',
      '  WASD / Setas — Mover',
      '  E — Falar com NPC',
      '  M — Ver missões',
      '  ESC — Pausar',
      '',
      'Explore o hospital, fale com os NPCs',
      'e complete missões para ganhar Prestígio.',
      '',
      'Cada missão traz feedback pedagógico',
      'baseado na literatura de enfermagem.',
      '',
      'Gerencie sua Energia — descanse',
      'na Copa para recuperar.',
      '',
      '  [ Clique para fechar ]',
    ].join('\n');

    const txt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, helpText, {
      fontFamily: "'VT323', monospace",
      fontSize: '22px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5).setDepth(52);

    const close = () => { overlay.destroy(); txt.destroy(); };
    overlay.on('pointerdown', close);
    this.input.keyboard?.once('keydown-ESC', close);
  }
}
