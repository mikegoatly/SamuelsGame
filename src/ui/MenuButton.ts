import Phaser from 'phaser';
import { menuText } from './menuText';
import type { MenuItem } from './MenuList';

const IDLE_FILL = 0x2a2540;
const FOCUS_FILL = 0x4a3f7a;
const IDLE_STROKE = 0x5a5280;
const FOCUS_STROKE = 0xb48cff;

export class MenuButton implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    private readonly onActivate: () => void,
    textSize = 16,
  ) {
    this.area = scene.add.rectangle(x, y, width, height, IDLE_FILL).setStrokeStyle(2, IDLE_STROKE);
    this.label = menuText(scene, x, y, text, textSize);
  }

  setFocused(focused: boolean): void {
    this.area.setFillStyle(focused ? FOCUS_FILL : IDLE_FILL).setStrokeStyle(2, focused ? FOCUS_STROKE : IDLE_STROKE);
    this.label.setColor(focused ? '#ffffff' : '#c8c8e0');
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  /** Greys the button out; it still takes focus and taps so the scene can explain why. */
  setEnabled(enabled: boolean): void {
    this.area.setAlpha(enabled ? 1 : 0.45);
    this.label.setAlpha(enabled ? 1 : 0.45);
  }

  activate(): void {
    this.onActivate();
  }
}
