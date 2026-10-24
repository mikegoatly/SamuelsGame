import Phaser from 'phaser';
import { stepVolume } from '../logic/volume';
import { menuText } from './menuText';
import type { MenuItem } from './MenuList';

const IDLE_FILL = 0x2a2540;
const FOCUS_FILL = 0x4a3f7a;
const IDLE_STROKE = 0x5a5280;
const FOCUS_STROKE = 0xb48cff;
const SEGMENTS = 10;
const SEGMENT_WIDTH = 12;
const SEGMENT_GAP = 3;
const BAR_WIDTH = SEGMENTS * (SEGMENT_WIDTH + SEGMENT_GAP) - SEGMENT_GAP;

/** A labelled 10-segment slider: left/right adjusts, tapping the bar sets the level, Enter steps up (wrapping). */
export class VolumeRow implements MenuItem {
  readonly area: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly percent: Phaser.GameObjects.Text;
  private readonly segments: Phaser.GameObjects.Rectangle[] = [];
  private readonly barLeft: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    private value: number,
    private readonly onChange: (value: number) => void,
  ) {
    this.area = scene.add.rectangle(x, y, width, height, IDLE_FILL).setStrokeStyle(2, IDLE_STROKE);
    this.label = menuText(scene, x - width / 2 + 12, y, text, 16).setOrigin(0, 0.5);
    this.barLeft = x + width / 2 - 56 - BAR_WIDTH;
    for (let i = 0; i < SEGMENTS; i++) {
      this.segments.push(scene.add.rectangle(this.barLeft + i * (SEGMENT_WIDTH + SEGMENT_GAP), y, SEGMENT_WIDTH, height - 14, 0xffffff).setOrigin(0, 0.5));
    }
    this.percent = menuText(scene, x + width / 2 - 8, y, '', 16).setOrigin(1, 0.5);
    this.draw();
  }

  setFocused(focused: boolean): void {
    this.area.setFillStyle(focused ? FOCUS_FILL : IDLE_FILL).setStrokeStyle(2, focused ? FOCUS_STROKE : IDLE_STROKE);
    this.label.setColor(focused ? '#ffffff' : '#c8c8e0');
  }

  adjust(direction: 1 | -1): void {
    this.set(stepVolume(this.value, direction));
  }

  activate(pointerX?: number): void {
    const inBar = pointerX !== undefined && pointerX >= this.barLeft - 4 && pointerX <= this.barLeft + BAR_WIDTH + 4;
    if (inBar) this.set(Phaser.Math.Clamp(Math.round(((pointerX - this.barLeft) / BAR_WIDTH) * SEGMENTS), 0, SEGMENTS) * 10);
    else this.set(stepVolume(this.value, 1, true));
  }

  private set(value: number): void {
    this.value = value;
    this.draw();
    this.onChange(value);
  }

  private draw(): void {
    const lit = Math.round(this.value / 10);
    this.segments.forEach((segment, i) => segment.setFillStyle(i < lit ? 0xb48cff : 0x3a3458));
    this.percent.setText(`${this.value}%`);
  }
}
