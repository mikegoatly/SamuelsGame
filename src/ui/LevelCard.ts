import Phaser from 'phaser';
import { crownFor } from '../content/accessories';
import { Tex } from '../content/assetKeys';
import type { Environment, LevelConfig } from '../content/levels';
import { otherMode } from '../logic/accessoryWear';
import { heroicRoomRange, type LevelMode } from '../logic/heroic';
import { isUnderLevelled } from '../logic/levelRules';
import { menuText } from './menuText';
import type { MenuItem } from './MenuList';

export interface LevelCardState {
  unlocked: boolean;
  cleared: boolean;
  playerLevel: number;
  /** Name of the level that must be cleared first, for locked cards. */
  requirementName?: string;
  /** The Normal/Heroic switch is shown (level unlocked and cleared on Normal). */
  heroicAvailable?: boolean;
  mode?: LevelMode;
  heroicCleared?: boolean;
  /** Heroic Survival card: its three text lines replace the usual environment / monsters / status rows. */
  survivalLines?: readonly string[];
}

const ENVIRONMENT_COLOR: Record<Environment, number> = {
  arena: 0x8c8cb0,
  ruins: 0x7ca08c,
  desert: 0xd0a860,
  palace: 0xa070e0,
  sewer: 0x6aa86a,
  unknown: 0xe0a040,
};

const HEROIC_GOLD = 0xffd84a;
const HEROIC_CSS = '#ffd84a';
const CHIP = { width: 92, height: 28 };

export class LevelCard implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private readonly chip?: Phaser.GameObjects.Rectangle;
  /** Only defined when the card offers Heroic, so MenuList's toggle key does nothing elsewhere. */
  readonly toggle?: () => void;
  private parts: Phaser.GameObjects.GameObject[] = [];
  private mode: LevelMode;
  private focused = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    private readonly level: LevelConfig,
    private readonly state: LevelCardState,
    private readonly onSelect: (mode: LevelMode) => void,
    private readonly onMode: (mode: LevelMode) => void = () => undefined,
  ) {
    this.mode = state.heroicAvailable ? state.mode ?? 'normal' : 'normal';
    this.area = scene.add.rectangle(x, y, width, height, 0x211d33);
    if (state.heroicAvailable && !level.comingSoon) {
      this.chip = scene.add.rectangle(x + width / 2 - CHIP.width / 2 - 6, y - height / 2 + CHIP.height / 2 + 5, CHIP.width, CHIP.height, 0x2a2540);
      this.toggle = () => this.switchMode();
      this.chip.setInteractive({ useHandCursor: true }).on('pointerup', () => this.switchMode());
    }
    this.render();
  }

  get hasSwitch(): boolean {
    return this.chip !== undefined;
  }

  get heroic(): boolean {
    return this.mode === 'heroic';
  }

  /** Switches between Normal and Heroic (only when the level offers it). */
  private switchMode(): void {
    this.mode = otherMode(this.mode);
    this.onMode(this.mode);
    this.render();
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
    this.paintFrame();
  }

  activate(): void {
    if (this.state.unlocked) {
      this.onSelect(this.mode);
      return;
    }
    this.scene.tweens.add({ targets: this.area, x: this.area.x + 4, duration: 50, yoyo: true, repeat: 2 });
  }

  private paintFrame(): void {
    const accent = this.heroic ? HEROIC_GOLD : ENVIRONMENT_COLOR[this.level.environment];
    this.area.setFillStyle(this.focused ? 0x3a3166 : this.heroic ? 0x2c2530 : 0x211d33).setStrokeStyle(this.focused ? 3 : 2, this.focused ? 0xffffff : accent);
  }

  private render(): void {
    this.parts.forEach((part) => part.destroy());
    this.parts = [];
    this.paintFrame();
    const { level, state, x, y, width, height } = this;
    const left = x - width / 2 + 10;
    const alpha = state.unlocked ? 1 : 0.45;
    const top = y - height / 2;
    const compact = height < 90;
    const size = compact ? 14 : 16;
    const rows = compact ? [12, 30, 48, 65] : [14, 36, 56, 80];
    this.line(left, top + rows[0]!, level.name, size, '#ffffff').setAlpha(alpha);
    if (level.comingSoon) {
      this.line(left, top + rows[1]!, level.tagline ?? '', size, '#d8c8f0');
      this.line(left, top + rows[3]!, 'Coming soon', size, '#9a9ab8');
      return;
    }
    const lines = state.survivalLines;
    if (lines) {
      const color = state.unlocked ? ['#c8c8e0', '#ffd84a', '#ffe066'] : ['#c8c8e0', '#ffd0a0', '#9a9ab8'];
      lines.forEach((text, i) => this.line(left, top + rows[i + 1]!, text, size, color[i]!));
      return;
    }
    this.line(left, top + rows[1]!, `${level.environment}, recommended Lv ${level.recommendedLevel}`, size, '#c8c8e0').setAlpha(alpha);
    this.monsters(left, top + rows[2]!, size, alpha);
    this.status(left, top + rows[3]!, size);
    this.drawChip();
  }

  private monsters(x: number, y: number, size: number, alpha: number): void {
    const [low, high] = this.heroic ? heroicRoomRange(this.level.monsterLevelRange, this.level.monsterLevelRange, this.state.playerLevel) : this.level.monsterLevelRange;
    this.line(x, y, `Monsters Lv ${low}-${high}`, size, this.heroic ? HEROIC_CSS : '#9a9ab8').setAlpha(alpha);
  }

  private drawChip(): void {
    const { chip } = this;
    if (!chip) return;
    chip.setFillStyle(this.heroic ? 0x5a4a1a : 0x2a2540).setStrokeStyle(2, this.heroic ? HEROIC_GOLD : 0x7878a0);
    const label = menuText(this.scene, chip.x, chip.y, this.heroic ? 'HEROIC' : 'Normal', 16, this.heroic ? HEROIC_CSS : '#d8d8e8');
    this.parts.push(label);
    const crown = this.state.heroicCleared ? crownFor(this.level.id) : undefined;
    if (crown) this.parts.push(this.scene.add.image(this.x + this.width / 2 - 20, this.y + this.height / 2 - 20, Tex.accessories, crown.frame).setScale(2));
  }

  private status(x: number, y: number, size: number): void {
    const { state, level } = this;
    if (!state.unlocked) {
      this.line(x, y, `Locked: clear ${state.requirementName ?? 'previous'}`, size, '#9a9ab8');
    } else if (isUnderLevelled(state.playerLevel, level.recommendedLevel) && !this.heroic) {
      this.line(x, y, `Under-levelled!${state.cleared ? '  (cleared)' : ''}`, size, '#ff5a5a');
    } else if (this.heroic) {
      this.line(x, y, state.heroicCleared ? 'HEROIC CLEARED' : 'Heroic: matches your level', size, state.heroicCleared ? '#7dffb0' : HEROIC_CSS);
    } else if (state.cleared) {
      this.line(x, y, 'CLEARED', size, '#7dffb0');
    } else {
      this.line(x, y, 'Ready', size, '#ffe066');
    }
  }

  private line(x: number, y: number, value: string, size: number, color: string): Phaser.GameObjects.Text {
    const text = menuText(this.scene, x, y, value, size, color).setOrigin(0, 0.5);
    this.parts.push(text);
    return text;
  }
}
