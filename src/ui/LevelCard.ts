import Phaser from 'phaser';
import type { Environment, LevelConfig } from '../content/levels';
import { isUnderLevelled } from '../logic/levelRules';
import { menuText } from './menuText';
import type { MenuItem } from './MenuList';

export interface LevelCardState {
  unlocked: boolean;
  cleared: boolean;
  playerLevel: number;
  /** Name of the level that must be cleared first, for locked cards. */
  requirementName?: string;
}

const ENVIRONMENT_COLOR: Record<Environment, number> = {
  arena: 0x8c8cb0,
  ruins: 0x7ca08c,
  desert: 0xd0a860,
  palace: 0xa070e0,
};

export class LevelCard implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private readonly accent: number;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    private readonly level: LevelConfig,
    private readonly state: LevelCardState,
    private readonly onSelect: () => void,
  ) {
    this.accent = ENVIRONMENT_COLOR[level.environment];
    this.area = scene.add.rectangle(x, y, width, height, 0x211d33).setStrokeStyle(2, this.accent);
    const left = x - width / 2 + 10;
    const alpha = state.unlocked ? 1 : 0.45;
    const top = y - height / 2;
    this.line(left, top + 14, level.name, 16, '#ffffff').setAlpha(alpha);
    this.line(left, top + 36, `${level.environment}, recommended Lv ${level.recommendedLevel}`, 16, '#c8c8e0').setAlpha(alpha);
    this.line(left, top + 56, `Monsters Lv ${level.monsterLevelRange[0]}-${level.monsterLevelRange[1]}`, 16, '#9a9ab8').setAlpha(alpha);
    this.status(left, top + 80);
  }

  setFocused(focused: boolean): void {
    this.area.setFillStyle(focused ? 0x3a3166 : 0x211d33).setStrokeStyle(focused ? 3 : 2, focused ? 0xffffff : this.accent);
  }

  activate(): void {
    if (this.state.unlocked) {
      this.onSelect();
      return;
    }
    this.scene.tweens.add({ targets: this.area, x: this.area.x + 4, duration: 50, yoyo: true, repeat: 2 });
  }

  private status(x: number, y: number): void {
    const { state, level } = this;
    if (!state.unlocked) {
      this.line(x, y, `Locked: clear ${state.requirementName ?? 'previous'}`, 16, '#9a9ab8');
    } else if (isUnderLevelled(state.playerLevel, level.recommendedLevel)) {
      this.line(x, y, `Under-levelled!${state.cleared ? '  (cleared)' : ''}`, 16, '#ff5a5a');
    } else if (state.cleared) {
      this.line(x, y, 'CLEARED', 16, '#7dffb0');
    } else {
      this.line(x, y, 'Ready', 16, '#ffe066');
    }
  }

  private line(x: number, y: number, value: string, size: number, color: string): Phaser.GameObjects.Text {
    return menuText(this.scene, x, y, value, size, color).setOrigin(0, 0.5);
  }
}
