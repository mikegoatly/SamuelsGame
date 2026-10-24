import { Tex } from '../content/assetKeys';
import type { Reward } from '../content/rewards';
import { formatTime } from '../logic/format';
import { playSfx } from '../systems/sfx';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

export interface LevelCompleteData {
  title: string;
  timeMs: number;
  kills: number;
  coins: number;
  xp: number;
  level: number;
  reward?: Reward;
}

const INPUT_DELAY_MS = 700;
const EMPTY: LevelCompleteData = { title: 'Level complete!', timeMs: 0, kills: 0, coins: 0, xp: 0, level: 1 };

export class LevelCompleteScene extends MenuScene {
  private result = EMPTY;

  constructor() {
    super('LevelComplete');
  }

  init(data: LevelCompleteData): void {
    this.result = data;
  }

  override create(): void {
    super.create();
    playSfx(this, 'victory');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const { title, timeMs, kills, coins, xp, level, reward } = this.result;
    this.cameras.main.fadeIn(400);
    menuText(this, cx, height * 0.16, title, 32, '#ffe066');
    const rows: [string, string][] = [
      ['Time', formatTime(timeMs)],
      ['Monsters defeated', String(kills)],
      ['Coins banked', String(coins)],
      ['XP gained', String(xp)],
      ['Level now', String(level)],
    ];
    rows.forEach(([label, value], i) => {
      const y = height * 0.32 + i * 24;
      menuText(this, cx - 12, y, label, 16, '#b0b0c8').setOrigin(1, 0.5);
      menuText(this, cx + 12, y, value, 16, '#ffffff').setOrigin(0, 0.5);
    });
    if (reward) this.showReward(cx, height * 0.32 + rows.length * 24 + 22, reward);
    const next = new MenuButton(this, cx, height * 0.82, 200, 34, 'Continue', () => this.leave());
    this.menu = new MenuList(this, [next], { onBack: () => this.leave() });
  }

  /** Icon plus headline for the weapon or power this level handed out. */
  private showReward(cx: number, y: number, reward: Reward): void {
    const icon = this.add.image(cx - 8, y, Tex.tiles, reward.frame).setScale(2);
    if (reward.tint !== null) icon.setTint(reward.tint);
    const text = menuText(this, cx + 10, y, reward.headline, 20, '#ffb060').setOrigin(0, 0.5);
    icon.x = cx - text.width / 2 - 12;
    text.x = cx - text.width / 2 + 4;
  }

  /** Ignores the first moments so a held dash/fire key does not skip the results. */
  private leave(): void {
    if (this.inputReady(INPUT_DELAY_MS)) this.scene.start('LevelSelect');
  }
}
