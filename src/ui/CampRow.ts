import Phaser from 'phaser';
import { Frame, Tex } from '../content/assetKeys';
import { GEM_TINT, type GemColour } from '../logic/gems';
import { gameText } from './gameText';
import type { MenuItem } from './MenuList';

export interface CampRowView {
  icon: { texture: string; frame?: number; tint?: number | null };
  label: string;
  labelColor: string;
  /** Upgrade level pips (filled / total). */
  pips?: { level: number; max: number };
  /** Right-aligned text such as "60g" or "MAX". */
  tag: string;
  tagColor: string;
  /** Gem price shown after the gold. */
  gem?: { colour: GemColour; count: number; enough: boolean };
}

const IDLE_FILL = 0x2a2540;
const FOCUS_FILL = 0x4a3f7a;
const IDLE_STROKE = 0x5a5280;
const FOCUS_STROKE = 0xffe066;
const PIP = 8;

/** One list line in the Camp: icon, name, level pips and the price. Tapping selects it; only keyboard/pad confirm buys. */
export class CampRow implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private readonly box: Phaser.GameObjects.Container;
  private focused = false;
  private selected = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    width: number,
    height: number,
    view: CampRowView,
    private readonly onActivate: () => void,
    private readonly onFocus: () => void,
  ) {
    this.area = scene.add.rectangle(0, 0, width, height, IDLE_FILL).setStrokeStyle(2, IDLE_STROKE);
    const left = -width / 2;
    const icon = scene.add.image(left + 18, 0, view.icon.texture, view.icon.frame).setDisplaySize(22, 22);
    if (view.icon.tint !== null && view.icon.tint !== undefined) icon.setTint(view.icon.tint);
    const label = gameText(scene, left + 38, 0, view.label, 16, { color: view.labelColor }).setOrigin(0, 0.5);
    const parts: Phaser.GameObjects.GameObject[] = [this.area, icon, label];
    if (view.pips) parts.push(this.drawPips(scene, left + width * 0.5, view.pips));
    let right = width / 2 - 8;
    if (view.gem) {
      const count = gameText(scene, right, 0, `${view.gem.count}`, 16, { color: view.gem.enough ? '#ffffff' : '#ff8a8a' }).setOrigin(1, 0.5);
      const gem = scene.add.image(right - count.width - 10, 0, Tex.tiles, Frame.ring).setTint(GEM_TINT[view.gem.colour]);
      parts.push(count, gem);
      right = gem.x - 10;
    }
    parts.push(gameText(scene, right, 0, view.tag, 16, { color: view.tagColor }).setOrigin(1, 0.5));
    this.box = scene.add.container(x, 0, parts);
  }

  private drawPips(scene: Phaser.Scene, x: number, pips: { level: number; max: number }): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    for (let i = 0; i < pips.max; i++) {
      g.fillStyle(i < pips.level ? 0xffe066 : 0x3a3458, 1).fillRect(x + i * (PIP + 3), -PIP / 2, PIP, PIP);
    }
    return g;
  }

  /** Vertical centre, or hidden when scrolled out of the list. */
  place(y: number | null): void {
    this.box.setVisible(y !== null);
    if (y !== null) this.box.setY(y);
  }

  get x(): number {
    return this.box.x;
  }

  get y(): number {
    return this.box.y;
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
    this.paint();
    if (focused) this.onFocus();
  }

  /** The row the info panel (and its Upgrade/Buy button) is showing, kept outlined while focus is elsewhere. */
  setSelected(selected: boolean): void {
    this.selected = selected;
    this.paint();
  }

  private paint(): void {
    this.area.setFillStyle(this.focused ? FOCUS_FILL : IDLE_FILL).setStrokeStyle(2, this.focused || this.selected ? FOCUS_STROKE : IDLE_STROKE);
  }

  /** A tap (`pointerX` set) only selects, so touch players can read the panel without buying by accident. */
  activate(pointerX?: number): void {
    if (pointerX === undefined) this.onActivate();
  }
}
