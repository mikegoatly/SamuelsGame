import { CONTROLS_HELP, DEVICE_ORDER, GOAL_LINES } from '../content/controlsHelp';
import { gameText } from '../ui/gameText';
import { lastInputDevice } from '../systems/inputDevice';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

const PANEL_GAP = 8;

export class HowToPlayScene extends MenuScene {
  constructor() {
    super('HowToPlay');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    menuText(this, cx, 26, 'How to play', 26, '#b48cff');
    const wrap = Math.min(width - 40, 560);
    GOAL_LINES.forEach((line, i) => {
      gameText(this, cx, 52 + i * 20, line, 16, { color: '#d8d8e8' }).setWordWrapWidth(wrap).setAlign('center').setOrigin(0.5, 0);
    });

    const active = lastInputDevice();
    const panelWidth = Math.min(200, (width - 20 - 2 * PANEL_GAP) / DEVICE_ORDER.length);
    const panelTop = 118;
    const panelHeight = Math.min(170, height - panelTop - 56);
    DEVICE_ORDER.forEach((device, i) => {
      const x = cx + (i - 1) * (panelWidth + PANEL_GAP);
      const highlighted = device === active;
      const panel = CONTROLS_HELP[device];
      this.add
        .rectangle(x, panelTop + panelHeight / 2, panelWidth, panelHeight, highlighted ? 0x3a3166 : 0x201c33)
        .setStrokeStyle(2, highlighted ? 0xb48cff : 0x4a4468);
      menuText(this, x, panelTop + 16, panel.title, 14, highlighted ? '#ffe066' : '#9090b0');
      panel.lines.forEach(([action, how], row) => {
        const y = panelTop + 40 + row * 17;
        menuText(this, x - panelWidth / 2 + 8, y, action, 11, highlighted ? '#c8c8e8' : '#7878a0').setOrigin(0, 0.5);
        menuText(this, x + panelWidth / 2 - 8, y, how, 11, highlighted ? '#ffffff' : '#8888a8').setOrigin(1, 0.5);
      });
      if (highlighted) menuText(this, x, panelTop + panelHeight - 10, 'in use', 10, '#7dffb0');
    });
    const back = new MenuButton(this, cx, height - 28, 140, 30, 'Back', () => this.scene.start('MainMenu'));
    this.menu = new MenuList(this, [back], { onBack: () => this.scene.start('MainMenu') });
  }
}
