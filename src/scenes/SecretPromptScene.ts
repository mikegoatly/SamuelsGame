import type { SecretId } from '../logic/secrets';
import { gameText } from '../ui/gameText';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import type { GameScene } from './GameScene';

const INPUT_DELAY_MS = 300;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 150;

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
    const cx = width / 2;
    const cy = height / 2;
    const top = cy - PANEL_HEIGHT / 2;
    this.add.rectangle(cx, cy, width, height, 0x14121c, 0.75);
    this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, 0x2a2540).setStrokeStyle(4, text.border);
    menuText(this, cx, top + 20, text.title, 24, text.titleColor);
    gameText(this, cx, top + 46, text.question, 16, { color: '#d8d8e8' })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(PANEL_WIDTH - 32)
      .setAlign('center');
    const go = new MenuButton(this, cx - 84, top + PANEL_HEIGHT - 30, 152, 30, text.yes, () => this.choose(true));
    const stay = new MenuButton(this, cx + 84, top + PANEL_HEIGHT - 30, 152, 30, 'Not now', () => this.choose(false));
    this.menu = new MenuList(this, [go, stay], { columns: 2, initialFocus: 1, onBack: () => this.choose(false) });
  }

  private choose(go: boolean): void {
    if (this.chosen || !this.inputReady(INPUT_DELAY_MS)) return;
    this.chosen = true;
    (this.scene.get('Game') as GameScene).resolveSecret(this.secret, go);
  }
}
