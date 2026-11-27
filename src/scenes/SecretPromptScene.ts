import type { SecretId } from '../logic/secrets';
import { buildConfirmPanel } from '../ui/ConfirmPanel';
import { MenuList } from '../ui/MenuList';
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
  glitch: { title: 'Broken floor', question: 'The floor is... broken? Fall through?', yes: 'Fall in', border: 0xff40d0, titleColor: '#ff80e8' },
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
    const text = PROMPTS[this.secret];
    const [go, stay] = buildConfirmPanel(this, { ...text, no: 'Not now', onYes: () => this.choose(true), onNo: () => this.choose(false) });
    this.menu = new MenuList(this, [go, stay], { columns: 2, initialFocus: 1, onBack: () => this.choose(false) });
  }

  private choose(go: boolean): void {
    if (this.chosen || !this.inputReady(INPUT_DELAY_MS)) return;
    this.chosen = true;
    (this.scene.get('Game') as GameScene).resolveSecret(this.secret, go);
  }
}
