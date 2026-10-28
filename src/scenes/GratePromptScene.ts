import { gameText } from '../ui/gameText';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import type { GameScene } from './GameScene';

const INPUT_DELAY_MS = 300;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 150;
const BORDER = 0x7dd86a;

/** Modal over the paused game when the player steps onto the sewer grate: Climb down, or Not now (the default, so a mashed button never loses a desert run). */
export class GratePromptScene extends MenuScene {
  constructor() {
    super('GratePrompt');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const top = cy - PANEL_HEIGHT / 2;
    this.add.rectangle(cx, cy, width, height, 0x14121c, 0.75);
    this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, 0x2a2540).setStrokeStyle(4, BORDER);
    menuText(this, cx, top + 20, 'Sewer grate', 24, '#7dd86a');
    gameText(this, cx, top + 46, 'A rusty grate. Climb down into the sewer?', 16, { color: '#d8d8e8' })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(PANEL_WIDTH - 32)
      .setAlign('center');
    const climb = new MenuButton(this, cx - 84, top + PANEL_HEIGHT - 30, 152, 30, 'Climb down', () => this.choose(true));
    const stay = new MenuButton(this, cx + 84, top + PANEL_HEIGHT - 30, 152, 30, 'Not now', () => this.choose(false));
    this.menu = new MenuList(this, [climb, stay], { columns: 2, initialFocus: 1, onBack: () => this.choose(false) });
  }

  private choose(climb: boolean): void {
    if (!this.inputReady(INPUT_DELAY_MS)) return;
    (this.scene.get('Game') as GameScene).resolveGrate(climb);
  }
}
