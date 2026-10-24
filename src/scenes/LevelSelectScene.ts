import { Music } from '../content/assetKeys';
import { getLevel, levels } from '../content/levels';
import { isLevelUnlocked, visibleLevels } from '../logic/levelRules';
import { musicOf } from '../systems/MusicPlayer';
import { CHARMS_NOTICE } from '../logic/save';
import { CHARMS_CARD } from './NoticeScene';
import { saveSystem } from '../systems/SaveSystem';
import { LevelCard } from '../ui/LevelCard';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { drawCounts, walletEntries } from '../ui/Wallet';
import { MenuScene } from '../ui/MenuScene';

const COLUMNS = 2;
const MAX_CARD_HEIGHT = 98;
const HEADER = 66;
const FOOTER = 50;
const GAP = 10;

export class LevelSelectScene extends MenuScene {
  constructor() {
    super('LevelSelect');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const { progress, coins, gems, levels: levelSave } = saveSystem.data;
    const cx = width / 2;
    musicOf(this.game).crossfadeTo(Music.menu);
    menuText(this, cx, 20, 'Choose a level', 24, '#b48cff');
    menuText(this, cx, 44, `Level ${progress.level}`, 16, '#d8d8e8').setX(cx - 150);
    drawCounts(this, cx + 40, 44, walletEntries(coins, gems));

    const cardWidth = Math.min(280, (width - 3 * GAP - 20) / COLUMNS);
    const shown = visibleLevels(levels, levelSave.cleared);
    const rows = Math.ceil(shown.length / COLUMNS);
    const cardHeight = Math.min(MAX_CARD_HEIGHT, Math.floor((height - HEADER - FOOTER - (rows - 1) * GAP) / rows));
    const top = HEADER + cardHeight / 2;
    const cards = shown.map((level, i) => {
      const x = cx + (i % COLUMNS === 0 ? -1 : 1) * (cardWidth / 2 + GAP / 2);
      const y = top + Math.floor(i / COLUMNS) * (cardHeight + GAP);
      const state = {
        unlocked: isLevelUnlocked(level, levelSave.cleared),
        cleared: levelSave.cleared.includes(level.id),
        playerLevel: progress.level,
        requirementName: level.unlockedBy ? getLevel(level.unlockedBy).name : undefined,
      };
      return new LevelCard(this, x, y, cardWidth, cardHeight, level, state, () => this.scene.start('Loadout', { levelId: level.id }));
    });
    const lastRowY = top + (rows - 1) * (cardHeight + GAP);
    const footerY = Math.min(height - 24, lastRowY + cardHeight / 2 + 26);
    const slot = (index: number): { x: number; y: number } => ({
      x: cx + (index % COLUMNS === 0 ? -1 : 1) * (cardWidth / 2 + GAP / 2),
      y: index < rows * COLUMNS ? lastRowY : footerY,
    });
    const campAt = slot(cards.length);
    const backAt = slot(cards.length + 1);
    const camp = new MenuButton(this, campAt.x, campAt.y, Math.min(cardWidth, 160), 28, 'Camp', () => this.scene.start('Camp'));
    const back = new MenuButton(this, backAt.x, backAt.y, Math.min(cardWidth, 160), 28, 'Back', () => this.goBack());
    this.showPendingNotice();
    this.menu = new MenuList(this, [...cards, camp, back], { columns: COLUMNS, onBack: () => this.goBack() });
  }

  /** First visit after charms became gems: a card over this screen, which waits underneath. */
  private showPendingNotice(): void {
    if (!saveSystem.data.pendingNotices.includes(CHARMS_NOTICE) || this.scene.isActive('Notice')) return;
    this.time.delayedCall(0, () => {
      this.scene.launch('Notice', { ...CHARMS_CARD, under: 'LevelSelect', noticeId: CHARMS_NOTICE });
      this.scene.pause();
    });
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
