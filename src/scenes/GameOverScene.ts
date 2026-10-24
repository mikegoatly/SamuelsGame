import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

export interface GameOverData {
  levelId: string;
  level: number;
  wave: number;
  lostCoins: number;
}

export class GameOverScene extends MenuScene {
  private result: GameOverData = { levelId: 'arena', level: 1, wave: 1, lostCoins: 0 };

  constructor() {
    super('GameOver');
  }

  init(data: GameOverData): void {
    this.result = data;
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const { levelId, level, wave, lostCoins } = this.result;
    this.cameras.main.fadeIn(300);
    menuText(this, cx, height * 0.2, 'You fell', 48, '#ff6b6b');
    menuText(this, cx, height * 0.2 + 44, `Level ${level} - wave ${wave}`, 16, '#ffffff');
    menuText(this, cx, height * 0.2 + 64, lostCoins > 0 ? `Lost ${lostCoins} ${lostCoins === 1 ? "coin" : "coins"} from this run` : 'Your level and charms are kept', 16, '#b0b0c8');
    const retry = new MenuButton(this, cx, height * 0.6, 200, 34, 'Retry', () => this.scene.start('Game', { levelId }));
    const select = new MenuButton(this, cx, height * 0.6 + 44, 200, 34, 'Level select', () => this.scene.start('LevelSelect'));
    this.menu = new MenuList(this, [retry, select], { onBack: () => this.scene.start('LevelSelect') });
  }
}
