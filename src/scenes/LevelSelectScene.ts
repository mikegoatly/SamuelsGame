import Phaser from 'phaser';
import { Music } from '../content/assetKeys';
import { getLevel, levels } from '../content/levels';
import { offersHeroic } from '../logic/heroicSwitch';
import { isLevelUnlocked, visibleLevels } from '../logic/levelRules';
import { SURVIVAL_REQUIRED } from '../logic/survival';
import { survivalCardLines } from '../logic/survivalCard';
import { musicOf } from '../systems/MusicPlayer';
import { CHARMS_NOTICE, levelMode, setLevelMode } from '../logic/save';
import { revealNextHero } from './heroReveal';
import { CHARMS_CARD } from './NoticeScene';
import { sewerCard } from '../content/cards';
import type { CardData } from '../logic/itemCards';
import { SEWER_NOTICE } from '../logic/secrets';
import { lastInputDevice } from '../systems/inputDevice';
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
/** More than this many cards (sewer found, Survival, Ultimate) switch to the tight layout so they all fit at 640x360. */
export const CROWDED_CARDS = 6;
/** One-time cards shown over this screen, in order. */
const NOTICES: readonly [id: string, card: CardData][] = [
  [CHARMS_NOTICE, CHARMS_CARD],
  [SEWER_NOTICE, sewerCard],
];
const SWITCH_HINT = { keyboard: 'Tab or H: switch Normal / Heroic', gamepad: 'Y or X: switch Normal / Heroic', touch: 'Tap the Normal / Heroic tag to switch' } as const;

export class LevelSelectScene extends MenuScene {
  private cards: LevelCard[] = [];
  private hint?: Phaser.GameObjects.Text;
  /** The crowded layout keeps the switch hint on screen (its footer has room and focus then never hides it). */
  private hintAlways = false;
  private focusLevelId?: string;

  constructor() {
    super('LevelSelect');
  }

  init(data?: { focusLevelId?: string }): void {
    this.focusLevelId = data?.focusLevelId;
  }

  override update(time = 0, delta = 0): void {
    super.update(time, delta);
    this.hint?.setVisible(this.hintAlways || this.cards[this.menu?.focusIndex ?? -1]?.hasSwitch === true);
  }

  protected build(): void {
    const { width, height } = this.scale;
    const { progress, coins, gems, levels: levelSave } = saveSystem.data;
    const cx = width / 2;
    musicOf(this.game).crossfadeTo(Music.menu);
    // TODO(C1): add 'mines' to this list when `saveSystem.data.secrets.minesFound` once the Nab discovery lands.
    const shown = visibleLevels(levels, levelSave.cleared, saveSystem.data.secrets.sewerFound ? ['sewer'] : []);
    const crowded = shown.length > CROWDED_CARDS;
    const titleY = crowded ? 13 : 20;
    const walletY = crowded ? 36 : 44;
    menuText(this, cx, titleY, 'Choose a level', 24, '#b48cff');
    menuText(this, cx, walletY, `Level ${progress.level}`, 16, '#d8d8e8').setX(cx - 150);
    drawCounts(this, cx + 40, walletY, walletEntries(coins, gems));

    const cardWidth = Math.min(280, (width - 3 * GAP - 20) / COLUMNS);
    this.hint = undefined;
    this.hintAlways = crowded;
    const rows = Math.ceil(shown.length / COLUMNS);
    const gap = crowded ? 5 : GAP;
    const header = crowded ? 50 : HEADER;
    const footer = crowded ? 54 : FOOTER;
    const cardHeight = Math.min(MAX_CARD_HEIGHT, Math.floor((height - header - footer - (rows - 1) * gap) / rows));
    const top = header + cardHeight / 2;
    const cards = shown.map((level, i) => {
      const x = cx + (i % COLUMNS === 0 ? -1 : 1) * (cardWidth / 2 + GAP / 2);
      const y = top + Math.floor(i / COLUMNS) * (cardHeight + gap);
      const state = {
        unlocked: isLevelUnlocked(level, levelSave.cleared, levelSave.heroic.cleared),
        cleared: levelSave.cleared.includes(level.id),
        playerLevel: progress.level,
        requirementName: level.unlockedBy ? getLevel(level.unlockedBy).name : undefined,
        heroicAvailable: offersHeroic(level, levelSave.cleared),
        mode: levelMode(saveSystem.data, level.id),
        heroicCleared: levelSave.heroic.cleared.includes(level.id),
        survivalLines: level.survival ? survivalCardLines(SURVIVAL_REQUIRED.map((id) => ({ id, name: getLevel(id).name })), levelSave.heroic.cleared, saveSystem.data.survival.bestMs).lines : undefined,
      };
      return new LevelCard(
        this,
        x,
        y,
        cardWidth,
        cardHeight,
        level,
        state,
        (mode) => this.scene.start('HeroSelect', { levelId: level.id, heroic: mode === 'heroic' }),
        (mode) => saveSystem.update((save) => setLevelMode(save, level.id, mode)),
      );
    });
    const lastRowY = top + (rows - 1) * (cardHeight + gap);
    const footerY = Math.min(height - 24, lastRowY + cardHeight / 2 + (crowded ? 20 : 26));
    const slot = (index: number): { x: number; y: number } => ({
      x: cx + (index % COLUMNS === 0 ? -1 : 1) * (cardWidth / 2 + GAP / 2),
      y: index < rows * COLUMNS && !crowded ? lastRowY : footerY,
    });
    const campAt = slot(crowded ? 0 : cards.length);
    const backAt = slot(crowded ? 1 : cards.length + 1);
    const camp = new MenuButton(this, campAt.x, campAt.y, Math.min(cardWidth, 160), 28, 'Camp', () => this.scene.start('Camp'));
    const back = new MenuButton(this, backAt.x, backAt.y, Math.min(cardWidth, 160), 28, 'Back', () => this.goBack());
    if (cards.some((card) => card.hasSwitch)) {
      this.hint = menuText(this, cx, Math.min(height - 8, footerY + (crowded ? 22 : 26)), SWITCH_HINT[lastInputDevice()], 16, '#9a9ab8');
    }
    this.showPendingNotice();
    this.cards = cards;
    this.menu = new MenuList(this, [...cards, camp, back], { columns: COLUMNS, initialFocus: Math.max(0, shown.findIndex((level) => level.id === this.focusLevelId)), onBack: () => this.goBack() });
  }

  /** One-time cards (charms became gems, sewer discovered) over this screen, which waits underneath; then any hero unlock reveals. */
  private showPendingNotice(): void {
    if (this.scene.isActive('Notice')) return;
    const pending = NOTICES.find(([id]) => saveSystem.data.pendingNotices.includes(id));
    if (!pending) {
      revealNextHero(this);
      return;
    }
    this.time.delayedCall(0, () => {
      this.events.once(Phaser.Scenes.Events.RESUME, () => this.showPendingNotice());
      this.scene.launch('Notice', { ...pending[1], under: 'LevelSelect', noticeId: pending[0] });
      this.scene.pause();
    });
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
