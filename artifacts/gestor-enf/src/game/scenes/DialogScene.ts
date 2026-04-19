import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, EVENTS } from '../constants';
import type { DialogueDef, GameState } from '../data/gameData';
import { MISSIONS } from '../data/gameData';
import type { NPCDef } from '../data/gameData';

const BOX_H = 180;
const BOX_Y = GAME_HEIGHT - BOX_H - 10;
const CHAR_INTERVAL = 28; // ms per character

interface DialogData {
  npcDef: NPCDef;
  dialogue: DialogueDef;
  state: GameState;
}

export class DialogScene extends Phaser.Scene {
  private boxBg!: Phaser.GameObjects.Rectangle;
  private portrait!: Phaser.GameObjects.Image;
  private nameBox!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private continueArrow!: Phaser.GameObjects.Text;
  private pedagogyText!: Phaser.GameObjects.Text;
  private npcDef!: NPCDef;
  private dialogue!: DialogueDef;
  private state!: GameState;
  private lines: string[] = [];
  private lineIdx = 0;
  private charIdx = 0;
  private charTimer = 0;
  private isTyping = false;
  private showingChoices = false;
  private overlay!: Phaser.GameObjects.Rectangle;
  private onClose!: (newState: Partial<GameState>) => void;

  constructor() { super({ key: SCENES.DIALOG, active: false }); }

  init(data: DialogData & { onClose: (s: Partial<GameState>) => void }) {
    this.npcDef = data.npcDef;
    this.dialogue = data.dialogue;
    this.state = { ...data.state };
    this.onClose = data.onClose;
    this.lines = [...data.dialogue.text];
    this.lineIdx = 0;
    this.charIdx = 0;
    this.isTyping = false;
    this.showingChoices = false;
    this.choiceButtons = [];
  }

  create() {
    // Semi-transparent overlay darkening the game
    this.overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.35);

    // ── Dialog Box
    this.boxBg = this.add.rectangle(
      GAME_WIDTH / 2, BOX_Y + BOX_H / 2,
      GAME_WIDTH - 40, BOX_H,
      0x0a0a1e, 0.97
    ).setStrokeStyle(2, 0x00b894, 1);

    // ── Decorative corner accents
    const cx = 20;
    const cornerColor = 0x00b894;
    [
      [cx,                BOX_Y],
      [GAME_WIDTH - cx,   BOX_Y],
      [cx,                BOX_Y + BOX_H],
      [GAME_WIDTH - cx,   BOX_Y + BOX_H],
    ].forEach(([x, y]) => {
      this.add.rectangle(x, y, 12, 2, cornerColor);
      this.add.rectangle(x, y, 2, 12, cornerColor);
    });

    // ── Portrait
    const portraitX = 90;
    const portraitY = BOX_Y + BOX_H / 2;
    this.add.rectangle(portraitX, portraitY, 78, 78, 0x1a1a3e)
      .setStrokeStyle(2, 0x00b894, 0.8);
    this.portrait = this.add.image(portraitX, portraitY, 'portrait_' + this.npcDef.id)
      .setDisplaySize(72, 72);

    // Portrait glow
    const portraitGlow = this.add.rectangle(portraitX, portraitY, 78, 78)
      .setStrokeStyle(3, 0x4ecdc4, 0.3);
    this.tweens.add({
      targets: portraitGlow,
      alpha: { from: 0.3, to: 0.8 },
      duration: 1000,
      repeat: -1,
      yoyo: true,
    });

    // ── Name box
    this.nameBox = this.add.rectangle(portraitX + 50 + 90, BOX_Y + 18, 200, 26, 0x00b894);
    this.nameText = this.add.text(
      portraitX + 50 + 90 - 100 + 10, BOX_Y + 10,
      `${this.npcDef.name}  ·  ${this.npcDef.title}`,
      {
        fontFamily: "'VT323', monospace",
        fontSize: '18px',
        color: '#000000',
      }
    );

    // ── Body text
    this.bodyText = this.add.text(
      portraitX + 55, BOX_Y + 40,
      '',
      {
        fontFamily: "'VT323', monospace",
        fontSize: '22px',
        color: '#ffffff',
        wordWrap: { width: GAME_WIDTH - portraitX * 2 - 60 },
        lineSpacing: 4,
      }
    );

    // ── Continue arrow
    this.continueArrow = this.add.text(
      GAME_WIDTH - 55, BOX_Y + BOX_H - 24,
      '▼',
      {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '10px',
        color: '#00b894',
      }
    ).setVisible(false);
    this.tweens.add({
      targets: this.continueArrow,
      y: BOX_Y + BOX_H - 20,
      duration: 500,
      repeat: -1,
      yoyo: true,
    });

    // ── Input
    this.input.keyboard?.on('keydown-E', this.handleAdvance, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleAdvance, this);
    this.input.on('pointerdown', this.handleAdvance, this);

    // Start typing first line
    this.startLine(0);

    // Slide in
    this.tweens.add({
      targets: [this.boxBg, this.bodyText, this.nameText, this.nameBox],
      y: '-=10',
      alpha: { from: 0, to: 1 },
      duration: 200,
    });
  }

  private startLine(idx: number) {
    this.lineIdx = idx;
    this.charIdx = 0;
    this.isTyping = true;
    this.bodyText.setText('');
    this.continueArrow.setVisible(false);
    this.showingChoices = false;
  }

  update(_t: number, delta: number) {
    if (!this.isTyping) return;
    if (this.lineIdx >= this.lines.length) return;

    this.charTimer += delta;
    const currentLine = this.lines[this.lineIdx];

    while (this.charTimer >= CHAR_INTERVAL && this.charIdx <= currentLine.length) {
      this.charTimer -= CHAR_INTERVAL;
      this.bodyText.setText(currentLine.substring(0, this.charIdx));
      this.charIdx++;
    }

    if (this.charIdx > currentLine.length) {
      this.isTyping = false;
      this.bodyText.setText(currentLine);
      this.continueArrow.setVisible(this.lineIdx < this.lines.length - 1);

      if (this.lineIdx >= this.lines.length - 1) {
        this.time.delayedCall(200, () => {
          this.showChoices();
        });
      }
    }
  }

  private handleAdvance() {
    if (this.showingChoices) return;

    if (this.isTyping) {
      // Skip to end of current line
      this.bodyText.setText(this.lines[this.lineIdx]);
      this.charIdx = this.lines[this.lineIdx].length + 1;
      this.isTyping = false;
      this.continueArrow.setVisible(this.lineIdx < this.lines.length - 1);
      if (this.lineIdx >= this.lines.length - 1) {
        this.time.delayedCall(200, () => this.showChoices());
      }
      return;
    }

    if (this.lineIdx < this.lines.length - 1) {
      this.startLine(this.lineIdx + 1);
    }
  }

  private showChoices() {
    this.showingChoices = true;
    this.continueArrow.setVisible(false);
    this.clearChoiceButtons();

    const choices = this.dialogue.choices;
    const startY = BOX_Y + 100;
    const btnW = Math.min(320, (GAME_WIDTH - 160) / choices.length - 16);
    const totalW = choices.length * (btnW + 12) - 12;
    const startX = (GAME_WIDTH - totalW) / 2;

    choices.forEach((choice, i) => {
      const bx = startX + i * (btnW + 12) + btnW / 2;
      const by = startY;

      const container = this.add.container(bx, by);
      const bgRect = this.add.rectangle(0, 0, btnW, 40, 0x1a1a3e);
      const border = this.add.rectangle(0, 0, btnW, 40).setStrokeStyle(1, 0x00b894, 0.8);
      const num = this.add.text(-btnW / 2 + 8, 0, `${i + 1}.`, {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '8px',
        color: '#00b894',
      }).setOrigin(0, 0.5);
      const txt = this.add.text(btnW / 2 - 8, 0, choice.text, {
        fontFamily: "'VT323', monospace",
        fontSize: '18px',
        color: '#ffffff',
        wordWrap: { width: btnW - 30 },
        align: 'right',
      }).setOrigin(1, 0.5);

      container.add([bgRect, border, num, txt]);
      container.setSize(btnW, 40).setInteractive({ cursor: 'pointer' });

      container.on('pointerover', () => {
        bgRect.setFillStyle(0x2d3e5f);
        border.setStrokeStyle(2, 0x4ecdc4, 1);
      });
      container.on('pointerout', () => {
        bgRect.setFillStyle(0x1a1a3e);
        border.setStrokeStyle(1, 0x00b894, 0.8);
      });
      container.on('pointerdown', () => this.selectChoice(i));

      // Number keys
      this.input.keyboard?.once(`keydown-${i + 1}`, () => this.selectChoice(i));

      // Animate in
      container.setAlpha(0).setY(by + 10);
      this.tweens.add({ targets: container, alpha: 1, y: by, duration: 150, delay: i * 60 });

      this.choiceButtons.push(container);
    });
  }

  private selectChoice(idx: number) {
    const choice = this.dialogue.choices[idx];
    let stateUpdate: Partial<GameState> = {};

    // Apply effect
    if (choice.effect) {
      stateUpdate = choice.effect(this.state);
    }

    // Apply mission effect
    if (choice.missionEffect) {
      const [missionId, action] = choice.missionEffect.split(':');
      const progress = { ...this.state.missionProgress };
      const completed = [...this.state.completedMissions];

      if (action === 'start') {
        progress[missionId] = 1;
      } else if (action?.startsWith('step')) {
        const step = parseInt(action.replace('step', ''), 10);
        progress[missionId] = step;
      } else if (action === 'complete') {
        const mission = MISSIONS.find(m => m.id === missionId);
        if (mission && !completed.includes(missionId)) {
          completed.push(missionId);
          stateUpdate.prestige = (stateUpdate.prestige ?? this.state.prestige) + mission.prestige;
          this.showPedagogyNote(mission.pedagogy, mission.title);
        }
      }

      stateUpdate.missionProgress = progress;
      stateUpdate.completedMissions = completed;
    }

    // Update relationship
    const rel = { ...this.state.relationships };
    rel[this.npcDef.id] = (rel[this.npcDef.id] ?? 0) + 1;
    stateUpdate.relationships = rel;

    this.closeDialog(stateUpdate);
  }

  private showPedagogyNote(text: string, title: string) {
    const panel = this.add.rectangle(
      GAME_WIDTH / 2, BOX_Y - 60,
      GAME_WIDTH - 80, 80,
      0x0d3b2e, 0.97
    ).setStrokeStyle(2, 0x00b894).setDepth(30);

    const icon = this.add.text(60, BOX_Y - 75, '🎓', {
      fontSize: '22px',
    }).setDepth(31);

    const titleTxt = this.add.text(
      90, BOX_Y - 80,
      `✅ MISSÃO CONCLUÍDA: ${title}`,
      { fontFamily: "'VT323', monospace", fontSize: '18px', color: '#00b894' }
    ).setDepth(31);

    const noteTxt = this.add.text(
      GAME_WIDTH / 2, BOX_Y - 48,
      text,
      {
        fontFamily: "'VT323', monospace",
        fontSize: '15px',
        color: '#aaaaaa',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 120 },
      }
    ).setOrigin(0.5).setDepth(31);

    this.tweens.add({
      targets: [panel, icon, titleTxt, noteTxt],
      alpha: 0,
      duration: 600,
      delay: 3500,
      onComplete: () => {
        panel.destroy(); icon.destroy();
        titleTxt.destroy(); noteTxt.destroy();
      },
    });
  }

  private closeDialog(stateUpdate: Partial<GameState>) {
    this.input.keyboard?.off('keydown-E', this.handleAdvance, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleAdvance, this);

    this.tweens.add({
      targets: this.children.list,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.scene.stop();
        this.onClose(stateUpdate);
      },
    });
  }

  private clearChoiceButtons() {
    this.choiceButtons.forEach(b => b.destroy());
    this.choiceButtons = [];
  }
}
