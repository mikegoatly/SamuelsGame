import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { Prompt } from '../content/inputGlyphs';
import { cooldownText } from '../content/cards';
import type { SkillDef } from '../content/skills';
import { gameText } from './gameText';
import type { MenuItem } from './MenuList';

const IDLE_FILL = 0x2a2540;
const FOCUS_FILL = 0x4a3f7a;
const IDLE_STROKE = 0x5a5280;
const FOCUS_STROKE = 0xffe066;
const SLOT_GLYPHS = [Prompt.key1, Prompt.key2, Prompt.key3] as const;

/** A tile for the skill in one slot (swap prompt): slot number, icon, name and cooldown; activating picks the slot. */
export class SkillTile implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    slot: number,
    skill: SkillDef | undefined,
    private readonly onPick: () => void,
  ) {
    this.area = scene.add.rectangle(x, y, width, height, IDLE_FILL).setStrokeStyle(2, IDLE_STROKE);
    scene.add.image(x - width / 2 + 12, y - height / 2 + 12, Tex.prompts, SLOT_GLYPHS[slot] ?? 0);
    if (skill) scene.add.image(x, y - 15, skill.icon).setDisplaySize(28, 28);
    gameText(scene, x, y + 5, skill?.name ?? 'Empty', 16, { color: skill ? '#ffffff' : '#7878a0' }).setOrigin(0.5);
    if (skill) gameText(scene, x, y + height / 2 - 8, cooldownText(skill).replace('Cooldown ', ''), 16, { color: '#9a9ab8' }).setOrigin(0.5);
  }

  setFocused(focused: boolean): void {
    this.area.setFillStyle(focused ? FOCUS_FILL : IDLE_FILL).setStrokeStyle(2, focused ? FOCUS_STROKE : IDLE_STROKE);
  }

  activate(): void {
    this.onPick();
  }
}
