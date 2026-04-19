import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES, EVENTS } from '../constants';
import type { DialogueDef, GameState } from '../data/gameData';
import { MISSIONS } from '../data/gameData';
import type { NPCDef } from '../data/gameData';

const BOX_H = 180;
const BOX_Y = GAME_HEIGHT - BOX_H - 20;
const CHAR_INTERVAL = 25; // ms per character

interface DialogData {
  npcDef: NPCDef;
  dialogue: DialogueDef;
  state: GameState;
}

export class DialogScene extends Phaser.Scene {
  private boxContainer!: Phaser.GameObjects.Container;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private cursor!: Phaser.GameObjects.Text;
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
    // ── Overlay
    this.overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2c3e50, 0.4);

    this.boxContainer = this.add.container(0, 0);

    // ── Main Box
    const W = GAME_WIDTH - 80;
    const boxX = GAME_WIDTH / 2;
    const boxY = BOX_Y + BOX_H / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.3);
    shadow.fillRoundedRect(boxX - W/2 + 6, boxY - BOX_H/2 + 6, W, BOX_H, 16);

    const bg = this.add.graphics();
    bg.fillStyle(0xecf0f1, 1);
    bg.fillRoundedRect(boxX - W/2, boxY - BOX_H/2, W, BOX_H, 16);
    bg.fillStyle(0xffffff, 0.3);
    bg.fillRoundedRect(boxX - W/2, boxY - BOX_H/2, W, BOX_H * 0.4, 16);
    
    const border = this.add.graphics();
    border.lineStyle(4, 0x34495e, 1);
    border.strokeRoundedRect(boxX - W/2, boxY - BOX_H/2, W, BOX_H, 16);

    // ── Portrait Box
    const pSize = 100;
    const px = boxX - W/2 + 70;
    const py = boxY;

    const pBg = this.add.graphics();
    pBg.fillStyle(0x34495e, 1);
    pBg.fillRoundedRect(px - pSize/2 - 4, py - pSize/2 - 4, pSize + 8, pSize + 8, 12);
    
    // Pattern background for portrait
    const pInner = this.add.graphics();
    pInner.fillStyle(0xecf0f1, 1);
    pInner.fillRoundedRect(px - pSize/2, py - pSize/2, pSize, pSize, 8);
    for(let i=0; i<pSize; i+=10) {
      pInner.lineStyle(1, 0xbdc3c7, 0.5);
      pInner.lineBetween(px - pSize/2, py - pSize/2 + i, px + pSize/2, py - pSize/2 + i);
      pInner.lineBetween(px - pSize/2 + i, py - pSize/2, px - pSize/2 + i, py + pSize/2);
    }

    const portrait = this.add.image(px, py, 'portrait_' + this.npcDef.id).setDisplaySize(pSize - 10, pSize - 10);

    // ── Name Badge
    const nameBg = this.add.graphics();
    const nx = px + pSize/2 + 20;
    const ny = boxY - BOX_H/2 + 25;
    nameBg.fillStyle(0xe74c3c, 1);
    nameBg.fillRoundedRect(nx, ny - 15, 240, 30, 8);
    nameBg.lineStyle(2, 0xffffff, 1);
    nameBg.strokeRoundedRect(nx, ny - 15, 240, 30, 8);

    const nameText = this.add.text(nx + 120, ny, `${this.npcDef.name} - ${this.npcDef.title}`, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '10px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);

    // ── Body text
    this.bodyText = this.add.text(
      nx, ny + 30,
      '',
      {
        fontFamily: "'VT323', monospace",
        fontSize: '28px',
        color: '#2c3e50',
        wordWrap: { width: W - pSize - 120 },
        lineSpacing: 4,
      }
    );

    // ── Cursor
    this.cursor = this.add.text(0, 0, '▼', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '12px',
      color: '#e74c3c',
    }).setVisible(false);
    this.tweens.add({
      targets: this.cursor,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: -1
    });

    this.boxContainer.add([shadow, bg, border, pBg, pInner, portrait, nameBg, nameText, this.bodyText, this.cursor]);

    // ── Input
    this.input.keyboard?.on('keydown-E', this.handleAdvance, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleAdvance, this);
    this.input.on('pointerdown', this.handleAdvance, this);

    // Start typing first line
    this.startLine(0);

    // Slide in
    this.boxContainer.setY(100).setAlpha(0);
    this.tweens.add({
      targets: this.boxContainer,
      y: 0,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
  }

  private startLine(idx: number) {
    this.lineIdx = idx;
    this.charIdx = 0;
    this.isTyping = true;
    this.bodyText.setText('');
    this.cursor.setVisible(false);
    this.showingChoices = false;
  }

  update(_t: number, delta: number) {
    if (!this.isTyping) {
      if (this.cursor.visible) {
        const bRect = this.bodyText.getBounds();
        this.cursor.setPosition(bRect.right + 5, bRect.bottom - 15);
      }
      return;
    }
    if (this.lineIdx >= this.lines.length) return;

    this.charTimer += delta;
    const currentLine = this.lines[this.lineIdx];

    while (this.charTimer >= CHAR_INTERVAL && this.charIdx <= currentLine.length) {
      this.charTimer -= CHAR_INTERVAL;
      this.bodyText.setText(currentLine.substring(0, this.charIdx));
      this.charIdx++;
    }

    const bRect = this.bodyText.getBounds();
    this.cursor.setPosition(bRect.right + 5, bRect.bottom - 15);
    this.cursor.setVisible(true);

    if (this.charIdx > currentLine.length) {
      this.isTyping = false;
      this.bodyText.setText(currentLine);

      if (this.lineIdx >= this.lines.length - 1) {
        this.cursor.setVisible(false);
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
      if (this.lineIdx >= this.lines.length - 1) {
        this.cursor.setVisible(false);
        this.time.delayedCall(200, () => this.showChoices());
      } else {
        this.cursor.setVisible(true);
      }
      return;
    }

    if (this.lineIdx < this.lines.length - 1) {
      this.startLine(this.lineIdx + 1);
    }
  }

  private showChoices() {
    this.showingChoices = true;
    this.cursor.setVisible(false);
    this.clearChoiceButtons();

    const choices = this.dialogue.choices;
    const startY = BOX_Y + BOX_H - 30;
    const btnW = Math.min(400, (GAME_WIDTH - 200) / choices.length - 16);
    const totalW = choices.length * (btnW + 16) - 16;
    const startX = (GAME_WIDTH - totalW) / 2;

    choices.forEach((choice, i) => {
      const bx = startX + i * (btnW + 16) + btnW / 2;
      const by = startY;

      const container = this.add.container(bx, by);
      
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.2);
      shadow.fillRoundedRect(-btnW/2 + 2, -22, btnW, 44, 8);

      const bgRect = this.add.graphics();
      bgRect.fillStyle(0x34495e, 1);
      bgRect.fillRoundedRect(-btnW/2, -24, btnW, 44, 8);
      
      const border = this.add.graphics();
      border.lineStyle(2, 0x1abc9c, 1);
      border.strokeRoundedRect(-btnW/2, -24, btnW, 44, 8);

      const num = this.add.text(-btnW / 2 + 12, 0, `${i + 1}.`, {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '10px',
        color: '#f39c12',
      }).setOrigin(0, 0.5);
      
      const txt = this.add.text(btnW / 2 - 12, 0, choice.text, {
        fontFamily: "'VT323', monospace",
        fontSize: '22px',
        color: '#ffffff',
        wordWrap: { width: btnW - 40 },
        align: 'right',
      }).setOrigin(1, 0.5);

      container.add([shadow, bgRect, border, num, txt]);
      container.setSize(btnW, 44).setInteractive({ cursor: 'pointer' });

      container.on('pointerover', () => {
        this.tweens.add({ targets: container, scale: 1.05, y: by - 4, duration: 100 });
        bgRect.clear(); bgRect.fillStyle(0x2c3e50, 1); bgRect.fillRoundedRect(-btnW/2, -24, btnW, 44, 8);
        border.clear(); border.lineStyle(3, 0xf1c40f, 1); border.strokeRoundedRect(-btnW/2, -24, btnW, 44, 8);
      });
      container.on('pointerout', () => {
        this.tweens.add({ targets: container, scale: 1, y: by, duration: 100 });
        bgRect.clear(); bgRect.fillStyle(0x34495e, 1); bgRect.fillRoundedRect(-btnW/2, -24, btnW, 44, 8);
        border.clear(); border.lineStyle(2, 0x1abc9c, 1); border.strokeRoundedRect(-btnW/2, -24, btnW, 44, 8);
      });
      container.on('pointerdown', () => this.selectChoice(i));

      // Number keys
      this.input.keyboard?.once(`keydown-${i + 1}`, () => this.selectChoice(i));

      // Animate in
      container.setAlpha(0).setY(by + 20);
      this.tweens.add({ targets: container, alpha: 1, y: by, duration: 200, delay: i * 80, ease: 'Back.easeOut' });

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
    const w = 600;
    const h = 120;
    const container = this.add.container(GAME_WIDTH/2, GAME_HEIGHT/2 - 100).setDepth(100);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-w/2 + 8, -h/2 + 8, w, h, 16);

    const bg = this.add.graphics();
    bg.fillStyle(0xf1c40f, 1);
    bg.fillRoundedRect(-w/2, -h/2, w, h, 16);
    bg.lineStyle(4, 0xffffff, 1);
    bg.strokeRoundedRect(-w/2, -h/2, w, h, 16);

    const iconBg = this.add.circle(-w/2 + 50, 0, 30, 0xffffff);
    const icon = this.add.text(-w/2 + 50, 0, '🎓', { fontSize: '32px' }).setOrigin(0.5);

    const titleTxt = this.add.text(
      -w/2 + 90, -h/2 + 20,
      `SUCESSO: ${title}`,
      { fontFamily: "'Press Start 2P', monospace", fontSize: '12px', color: '#d35400' }
    );

    const noteTxt = this.add.text(
      -w/2 + 90, -h/2 + 50,
      text,
      {
        fontFamily: "'VT323', monospace",
        fontSize: '20px',
        color: '#2c3e50',
        wordWrap: { width: w - 110 },
      }
    );

    container.add([shadow, bg, iconBg, icon, titleTxt, noteTxt]);
    
    container.setScale(0.8).setAlpha(0);
    this.tweens.add({
      targets: container,
      scale: 1, alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: container,
          scale: 0.9, alpha: 0, y: '-=30',
          duration: 400,
          delay: 4000,
          ease: 'Back.easeIn',
          onComplete: () => container.destroy()
        });
      }
    });
  }

  private closeDialog(stateUpdate: Partial<GameState>) {
    this.input.keyboard?.off('keydown-E', this.handleAdvance, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleAdvance, this);

    this.tweens.add({
      targets: [this.boxContainer, this.overlay, ...this.choiceButtons],
      y: '+=20',
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
