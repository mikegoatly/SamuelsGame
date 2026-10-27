import { formatTime } from '../logic/format';
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
  /** Heroic Survival runs: how long the hero lasted. */
  survival?: { timeMs: number; bestMs: number; newBest: boolean; kills: number };
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
    const { levelId, runMap, heroic, level, progress, lostCoins, survival } = this.result;
    this.cameras.main.fadeIn(300);
    if (survival) this.survivalSummary(cx, height * 0.2, survival, level);
    else {
      menuText(this, cx, height * 0.2, 'You fell', 48, '#ff6b6b');
      menuText(this, cx, height * 0.2 + 44, `Level ${level} - ${progress}`, 16, '#ffffff');
    }
    menuText(this, cx, height * 0.2 + (survival ? 112 : 64), lostCoins > 0 ? `Lost ${lostCoins} gold from this run` : 'Your level and gems are kept', 16, '#b0b0c8');
    const retry = new MenuButton(this, cx, height * 0.6, 200, 34, 'Retry', () => this.inputReady() && this.scene.start('Game', { levelId, runMap, heroic }));
    const select = new MenuButton(this, cx, height * 0.6 + 44, 200, 34, 'Level select', () => this.inputReady() && this.scene.start('LevelSelect'));
    this.menu = new MenuList(this, [retry, select], { onBack: () => this.scene.start('LevelSelect') });
  }

  private survivalSummary(cx: number, y: number, run: NonNullable<GameOverData['survival']>, level: number): void {
    menuText(this, cx, y, `You survived ${formatTime(run.timeMs)}`, 32, '#ffe066');
    if (run.newBest) menuText(this, cx, y + 38, 'New record!', 32, '#7dffb0');
    else menuText(this, cx, y + 38, `Best ${formatTime(run.bestMs)}`, 16, '#d8d8e8');
    menuText(this, cx, y + 70, `Defeated ${run.kills} ${run.kills === 1 ? 'monster' : 'monsters'} - Level ${level}`, 16, '#ffffff');
  }
}
