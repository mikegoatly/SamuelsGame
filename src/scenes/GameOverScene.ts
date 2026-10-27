import type { RunMap } from '../logic/runSeed';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

export interface GameOverData {
  levelId: string;
  runMap?: RunMap;
  heroic?: boolean;
  level: number;
  progress: string;
  lostCoins: number;
}

export class GameOverScene extends MenuScene {
  private result: GameOverData = { levelId: 'arena', level: 1, progress: 'wave 1', lostCoins: 0 };

  constructor() {
    super('GameOver');
  }

  init(data: GameOverData): void {
    this.result = data;
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const { levelId, runMap, heroic, level, progress, lostCoins } = this.result;
    this.cameras.main.fadeIn(300);
    menuText(this, cx, height * 0.2, 'You fell', 48, '#ff6b6b');
    menuText(this, cx, height * 0.2 + 44, `Level ${level} - ${progress}`, 16, '#ffffff');
    menuText(this, cx, height * 0.2 + 64, lostCoins > 0 ? `Lost ${lostCoins} gold from this run` : 'Your level and gems are kept', 16, '#b0b0c8');
    const retry = new MenuButton(this, cx, height * 0.6, 200, 34, 'Retry', () => this.inputReady() && this.scene.start('Game', { levelId, runMap, heroic }));
    const select = new MenuButton(this, cx, height * 0.6 + 44, 200, 34, 'Level select', () => this.inputReady() && this.scene.start('LevelSelect'));
    this.menu = new MenuList(this, [retry, select], { onBack: () => this.scene.start('LevelSelect') });
  }
}
