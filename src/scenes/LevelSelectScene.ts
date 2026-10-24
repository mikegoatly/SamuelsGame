import { getLevel, levels } from '../content/levels';
import { isLevelUnlocked } from '../logic/levelRules';
import { saveSystem } from '../systems/SaveSystem';
import { LevelCard } from '../ui/LevelCard';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

const COLUMNS = 2;
const CARD_HEIGHT = 98;
const GAP = 10;

export class LevelSelectScene extends MenuScene {
  constructor() {
    super('LevelSelect');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const { progress, coins, levels: levelSave } = saveSystem.data;
    const cx = width / 2;
    menuText(this, cx, 20, 'Choose a level', 24, '#b48cff');
    menuText(this, cx, 44, `Level ${progress.level}   -   ${coins} coins`, 16, '#d8d8e8');

    const cardWidth = Math.min(280, (width - 3 * GAP - 20) / COLUMNS);
    const rows = Math.ceil(levels.length / COLUMNS);
    const top = 66 + CARD_HEIGHT / 2;
    const cards = levels.map((level, i) => {
      const x = cx + (i % COLUMNS === 0 ? -1 : 1) * (cardWidth / 2 + GAP / 2);
      const y = top + Math.floor(i / COLUMNS) * (CARD_HEIGHT + GAP);
      const state = {
        unlocked: isLevelUnlocked(level, levelSave.cleared),
        cleared: levelSave.cleared.includes(level.id),
        playerLevel: progress.level,
        requirementName: level.unlockedBy ? getLevel(level.unlockedBy).name : undefined,
      };
      return new LevelCard(this, x, y, cardWidth, CARD_HEIGHT, level, state, () => this.scene.start('Game', { levelId: level.id }));
    });
    const backY = Math.min(height - 24, top + (rows - 1) * (CARD_HEIGHT + GAP) + CARD_HEIGHT / 2 + 26);
    const back = new MenuButton(this, cx, backY, 120, 28, 'Back', () => this.goBack());
    this.menu = new MenuList(this, [...cards, back], { columns: COLUMNS, onBack: () => this.goBack() });
  }

  private goBack(): void {
    this.scene.start('MainMenu');
  }
}
