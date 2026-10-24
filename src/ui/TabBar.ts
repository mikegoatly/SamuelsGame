import Phaser from 'phaser';
import { menuText } from './menuText';
import type { MenuItem } from './MenuList';

const IDLE_FILL = 0x2a2540;
const FOCUS_FILL = 0x3a3260;
const ACTIVE_FILL = 0x5a4a9a;
const IDLE_STROKE = 0x5a5280;
const FOCUS_STROKE = 0xb48cff;

/** Two tabs as one menu item: left/right switch, a tap picks the half under the finger, confirm toggles. */
export class TabBar implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private readonly halves: Phaser.GameObjects.Rectangle[];
  private focused = false;

  constructor(
    scene: Phaser.Scene,
    private readonly cx: number,
    y: number,
    width: number,
    height: number,
    labels: readonly [string, string],
    private active: 0 | 1,
    private readonly onSwitch: (index: 0 | 1) => void,
  ) {
    this.area = scene.add.rectangle(cx, y, width, height, IDLE_FILL).setStrokeStyle(2, IDLE_STROKE);
    const half = width / 2;
    this.halves = [0, 1].map((i) => scene.add.rectangle(cx - half / 2 + i * half, y, half - 4, height - 4, IDLE_FILL));
    labels.forEach((label, i) => menuText(scene, cx - half / 2 + i * half, y, label, 16));
    this.paint();
  }

  private paint(): void {
    this.halves.forEach((half, i) => half.setFillStyle(i === this.active ? ACTIVE_FILL : this.focused ? FOCUS_FILL : IDLE_FILL));
    this.area.setStrokeStyle(2, this.focused ? FOCUS_STROKE : IDLE_STROKE);
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
    this.paint();
  }

  activate(pointerX?: number): void {
    this.onSwitch(pointerX === undefined ? ((1 - this.active) as 0 | 1) : pointerX < this.cx ? 0 : 1);
  }

  adjust(direction: 1 | -1): void {
    const next = direction === 1 ? 1 : 0;
    if (next !== this.active) this.onSwitch(next);
  }
}
