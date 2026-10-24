import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { gameText } from './gameText';
import type { MenuItem } from './MenuList';

export interface ChoiceView {
  label: string;
  /** Right-aligned detail, e.g. the cooldown. */
  detail: string;
  /** Icon: a skill texture key, or a Tiny Dungeon frame. */
  icon?: { texture: string; frame?: number; tint?: number | null };
  color: string;
  /** Frame of the Input Prompts glyph shown at the left (slot number). */
  glyph?: number;
}

const IDLE_FILL = 0x2a2540;
const FOCUS_FILL = 0x4a3f7a;
const IDLE_STROKE = 0x5a5280;
const FOCUS_STROKE = 0xb48cff;

/** A menu row showing the current choice; activating or pressing left/right cycles it. */
export class ChoiceRow implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private readonly glyph: Phaser.GameObjects.Image;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly width: number,
    height: number,
    private readonly read: () => ChoiceView,
    private readonly cycle: (direction: 1 | -1) => void,
    private readonly onFocus: () => void,
  ) {
    this.area = scene.add.rectangle(x, y, width, height, IDLE_FILL).setStrokeStyle(2, IDLE_STROKE);
    const left = x - width / 2;
    this.glyph = scene.add.image(left + 14, y, Tex.prompts, 0);
    this.icon = scene.add.image(left + 40, y, Tex.tiles, 0);
    this.label = gameText(scene, left + 60, y, '', 16).setOrigin(0, 0.5);
    this.detail = gameText(scene, x + width / 2 - 8, y, '', 16).setOrigin(1, 0.5);
    this.refresh();
  }

  refresh(): void {
    const view = this.read();
    this.glyph.setVisible(view.glyph !== undefined);
    if (view.glyph !== undefined) this.glyph.setFrame(view.glyph);
    this.icon.setVisible(view.icon !== undefined);
    if (view.icon) {
      this.icon.setTexture(view.icon.texture, view.icon.frame);
      this.icon.setDisplaySize(view.icon.texture === Tex.tiles ? 24 : 28, view.icon.texture === Tex.tiles ? 24 : 28);
      if (view.icon.tint === null || view.icon.tint === undefined) this.icon.clearTint();
      else this.icon.setTint(view.icon.tint);
    }
    this.label.setText(view.label).setColor(view.color);
    this.detail.setText(view.detail).setColor('#9a9ab8');
    this.fit();
  }

  /** Shortens the label with a trailing dot run if it would collide with the detail text. */
  private fit(): void {
    const room = this.width - 60 - 8 - this.detail.width - 8;
    let text = this.label.text;
    while (this.label.width > room && text.length > 1) {
      text = text.slice(0, -1);
      this.label.setText(`${text}.`);
    }
  }

  setFocused(focused: boolean): void {
    this.area.setFillStyle(focused ? FOCUS_FILL : IDLE_FILL).setStrokeStyle(2, focused ? FOCUS_STROKE : IDLE_STROKE);
    if (focused) this.onFocus();
  }

  activate(): void {
    this.cycle(1);
    this.refresh();
  }

  adjust(direction: 1 | -1): void {
    this.cycle(direction);
    this.refresh();
  }
}
