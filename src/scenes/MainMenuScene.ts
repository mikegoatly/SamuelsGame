import { GAME_TITLE } from '../content/config';
import { saveSystem } from '../systems/SaveSystem';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

export class MainMenuScene extends MenuScene {
  constructor() {
    super('MainMenu');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const { progress, coins } = saveSystem.data;
    menuText(this, cx, height * 0.24, GAME_TITLE, 40, '#b48cff');
    menuText(this, cx, height * 0.24 + 40, `Level ${progress.level}   -   ${coins} coins`, 16, '#d8d8e8');
    const play = new MenuButton(this, cx, height * 0.62, 180, 40, 'Play', () => this.scene.start('LevelSelect'));
    menuText(this, cx, height - 20, 'Click / tap / Enter / A to select', 16, '#8080a0');
    this.menu = new MenuList(this, [play]);
  }
}
