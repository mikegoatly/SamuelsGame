import type { SecretId } from '../logic/secrets';
import { promptMetrics } from '../logic/promptLayout';
import { gameText } from '../ui/gameText';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import type { GameScene } from './GameScene';

const INPUT_DELAY_MS = 300;

interface PromptText {
  title: string;
  question: string;
  yes: string;
  border: number;
  titleColor: string;
}

const PROMPTS: Record<SecretId, PromptText> = {
  sewer: { title: 'Sewer grate', question: 'A rusty grate. Climb down into the sewer?', yes: 'Climb down', border: 0x7dd86a, titleColor: '#7dd86a' },
  mines: { title: "Nab's gate", question: 'Follow Nab into the mines?', yes: 'Follow', border: 0xb98cff, titleColor: '#c8a8ff' },
};

/** Modal over the paused game at a secret way in (the sewer grate, Nab's gate): go in, or Not now (the default, so a mashed button never loses a run). */
export class SecretPromptScene extends MenuScene {
  private chosen = false;
  private secret: SecretId = 'sewer';

  constructor() {
    super('SecretPrompt');
  }

  init(data?: { secret?: SecretId }): void {
    this.secret = data?.secret ?? 'sewer';
  }

  override create(): void {
    this.chosen = false;
    super.create();
  }

  protected build(): void {
    const { width, height } = this.scale;
    const text = PROMPTS[this.secret];
    const m = promptMetrics(this.scale.displayScale.x, width);
    const cx = width / 2;
    const cy = height / 2;
    const pad = Math.round((m.textSize * 3) / 4);
    this.add.rectangle(cx, cy, width, height, 0x14121c, 0.75);
    const panel = this.add.rectangle(cx, cy, m.panelWidth, 0, 0x2a2540).setStrokeStyle(4, text.border);
    const title = menuText(this, cx, 0, text.title, m.titleSize, text.titleColor);
    const question = gameText(this, cx, 0, text.question, m.textSize, { color: '#d8d8e8' })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(m.panelWidth - pad * 2)
      .setAlign('center');
    const panelHeight = pad + title.height + pad / 2 + question.height + pad + m.buttonHeight + pad;
    const top = cy - panelHeight / 2;
    panel.setSize(m.panelWidth, panelHeight);
    title.setY(top + pad + title.height / 2);
    question.setY(title.y + title.height / 2 + pad / 2);
    const gap = Math.max(8, pad / 2);
    const buttonWidth = Math.floor((m.panelWidth - pad * 2 - gap) / 2);
    const buttonY = top + panelHeight - pad - m.buttonHeight / 2;
    const go = new MenuButton(this, cx - (buttonWidth + gap) / 2, buttonY, buttonWidth, m.buttonHeight, text.yes, () => this.choose(true), m.textSize);
    const stay = new MenuButton(this, cx + (buttonWidth + gap) / 2, buttonY, buttonWidth, m.buttonHeight, 'Not now', () => this.choose(false), m.textSize);
    this.menu = new MenuList(this, [go, stay], { columns: 2, initialFocus: 1, onBack: () => this.choose(false) });
  }

  private choose(go: boolean): void {
    if (this.chosen || !this.inputReady(INPUT_DELAY_MS)) return;
    this.chosen = true;
    (this.scene.get('Game') as GameScene).resolveSecret(this.secret, go);
  }
}
