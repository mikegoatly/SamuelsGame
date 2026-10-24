import { Music } from '../content/assetKeys';
import { getLevel, levels } from '../content/levels';
import { isLevelUnlocked, visibleLevels } from '../logic/levelRules';
import { musicOf } from '../systems/MusicPlayer';
import { saveSystem } from '../systems/SaveSystem';
import { LevelCard } from '../ui/LevelCard';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
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
    const { progress, coins, levels: levelSave } = saveSystem.data;
    const cx = width / 2;
    musicOf(this.game).crossfadeTo(Music.menu);
    menuText(this, cx, 20, 'Choose a level', 24, '#b48cff');
    menuText(this, cx, 44, `Level ${progress.level}   -   ${coins} coins`, 16, '#d8d8e8');

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
      return new LevelCard(this, x, y, cardWidth, cardHeight, level, state, () => this.scene.start('Game', { levelId: level.id }));
    });
    const backY = Math.min(height - 24, top + (rows - 1) * (cardHeight + GAP) + cardHeight / 2 + 26);
    const back = new MenuButton(this, cx, backY, 120, 28, 'Back', () => this.goBack());
    this.menu = new MenuList(this, [...cards, back], { columns: COLUMNS, onBack: () => this.goBack() });
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
