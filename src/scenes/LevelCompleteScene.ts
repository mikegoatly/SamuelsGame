import { Tex } from '../content/assetKeys';
import type { Reward } from '../content/rewards';
import { noGems, type Gems } from '../logic/gems';
import { formatTime } from '../logic/format';
import Phaser from 'phaser';
import { playSfx } from '../systems/sfx';
import { revealNextHero } from './heroReveal';
import { heroicRewardCard, type HeroicReward } from './heroicRewardCard';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import { drawCounts, walletEntries } from '../ui/Wallet';

export interface LevelCompleteData {
  title: string;
  timeMs: number;
  kills: number;
  coins: number;
  gems: Gems;
  xp: number;
  level: number;
  rewards?: Reward[];
  /** Random map runs only. */
  seed?: number;
  heroic?: boolean;
  /** Set on the first Heroic clear of a level. */
  heroicReward?: HeroicReward;
  /** The crown went straight onto the hero (the Head slot was empty). */
  crownWorn?: boolean;
  levelName?: string;
}

const INPUT_DELAY_MS = 700;
const FADE_IN_MS = 400;
const EMPTY: LevelCompleteData = { title: 'Level complete!', timeMs: 0, kills: 0, coins: 0, gems: noGems(), xp: 0, level: 1 };

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
    const { heroicReward, levelName = '', crownWorn } = this.result;
    if (!heroicReward) return revealNextHero(this, FADE_IN_MS + 300);
    this.time.delayedCall(FADE_IN_MS + 300, () => {
      this.events.once(Phaser.Scenes.Events.RESUME, () => revealNextHero(this));
      this.scene.launch('Notice', { ...heroicRewardCard(heroicReward, levelName, crownWorn), under: 'LevelComplete', noticeId: 'heroicReward' });
      this.scene.bringToTop('Notice');
      this.scene.pause();
    });
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const { title, timeMs, kills, coins, gems, xp, level, rewards = [], seed, heroic } = this.result;
    this.cameras.main.fadeIn(400);
    menuText(this, cx, height * 0.16, title, 32, '#ffe066');
    if (heroic) menuText(this, cx, height * 0.16 - 26, 'HEROIC', 16, '#ffd84a');
    const rows: [string, string][] = [
      ['Time', formatTime(timeMs)],
      ['Monsters defeated', String(kills)],
      ['XP gained', String(xp)],
      ['Level now', String(level)],
    ];
    rows.forEach(([label, value], i) => {
      const y = height * 0.28 + i * 21;
      menuText(this, cx - 12, y, label, 16, '#b0b0c8').setOrigin(1, 0.5);
      menuText(this, cx + 12, y, value, 16, '#ffffff').setOrigin(0, 0.5);
    });
    const earnedY = height * 0.28 + rows.length * 21;
    menuText(this, cx, earnedY + 2, 'Gold and gems found', 16, '#b0b0c8');
    drawCounts(this, cx, earnedY + 22, walletEntries(coins, gems, '+'));
    let rewardY = earnedY + 50;
    for (const reward of rewards) {
      this.showReward(cx, rewardY, reward);
      rewardY += reward.note ? 46 : 26;
    }
    if (seed !== undefined) menuText(this, cx, height * 0.16 + 26, `Map #${seed}`, 16, '#6c6c88');
    const next = new MenuButton(this, cx - 104, height * 0.88, 200, 34, 'Continue', () => this.leave());
    const camp = new MenuButton(this, cx + 104, height * 0.88, 200, 34, 'Visit Camp', () => this.inputReady(INPUT_DELAY_MS) && this.scene.start('Camp'));
    this.menu = new MenuList(this, [next, camp], { columns: 2, onBack: () => this.leave() });
  }

  /** Icon plus headline for a weapon or skill this level handed out. */
  private showReward(cx: number, y: number, reward: Reward): void {
    const icon = this.add.image(cx - 8, y, Tex.tiles, reward.frame).setScale(2);
    if (reward.tint !== null) icon.setTint(reward.tint);
    const text = menuText(this, cx + 10, y, reward.headline, 20, '#ffb060').setOrigin(0, 0.5);
    icon.x = cx - text.width / 2 - 12;
    text.x = cx - text.width / 2 + 4;
    if (reward.note) menuText(this, cx, y + 22, reward.note, 16, '#d8c8f0');
  }

  /** Ignores the first moments so a held dash/fire key does not skip the results. */
  private leave(): void {
    if (this.inputReady(INPUT_DELAY_MS)) this.scene.start('LevelSelect');
  }
}
