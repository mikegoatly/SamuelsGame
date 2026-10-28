import Phaser from 'phaser';
import { ReleaseGate } from '../logic/heldKeys';
import { moveFocus, stickDirection, type Direction } from '../logic/menuNav';
import { heldKeys } from '../systems/inputDevice';
import { playSfx } from '../systems/sfx';

export interface MenuItem {
  /** Interactive hit area; also what the pointer focuses and taps. */
  readonly area: Phaser.GameObjects.Rectangle;
  setFocused(focused: boolean): void;
  /** `pointerX` is the screen x of the tap when activated by pointer. */
  activate(pointerX?: number): void;
  /** Left/right while focused (sliders). Items without it let the arrows move focus instead. */
  adjust?(direction: 1 | -1): void;
  /** Tab / H / pad Y or X: a secondary switch that must not steal the arrows from grid navigation (e.g. Normal/Heroic). */
  toggle?(): void;
}

export interface MenuListOptions {
  columns?: number;
  initialFocus?: number;
  /** Esc / B / Start. */
  onBack?: () => void;
}

const BUTTON_A = 0;
const BUTTON_B = 1;
const BUTTON_X = 2;
const BUTTON_Y = 3;
const BUTTON_START = 9;

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

interface PadSnapshot {
  direction: Direction | null;
  confirm: boolean;
  back: boolean;
  toggle: boolean;
}

/** Focus navigation shared by every menu: mouse/touch tap, keyboard, and gamepad (D-pad/stick + A). */
export class MenuList {
  focusIndex: number;
  private pressed = -1;
  private pad: PadSnapshot = { direction: null, confirm: false, back: false, toggle: false };
  private readonly columns: number;
  private readonly keyGate = new ReleaseGate(heldKeys);
  private readonly onKey = (event: KeyboardEvent): void => this.handleKey(event);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly items: readonly MenuItem[],
    private readonly options: MenuListOptions = {},
  ) {
    this.columns = options.columns ?? 1;
    this.focusIndex = Phaser.Math.Clamp(options.initialFocus ?? 0, 0, Math.max(0, items.length - 1));
    items.forEach((item, index) => this.wirePointer(item, index));
    scene.input.keyboard?.on('keydown', this.onKey);
    this.pad = this.readPad();
    this.setFocus(this.focusIndex);
  }

  setFocus(index: number): void {
    this.focusIndex = index;
    this.items.forEach((item, i) => item.setFocused(i === index));
  }

  /** Poll the gamepad; call from the scene's update. */
  update(): void {
    const now = this.readPad();
    const before = this.pad;
    this.pad = now;
    if (now.direction && now.direction !== before.direction) this.move(now.direction);
    if (now.confirm && !before.confirm) this.confirm();
    if (now.back && !before.back) this.back();
    if (now.toggle && !before.toggle) this.toggle();
  }

  /** Drops a pending pointer press so the release doesn't activate (e.g. the touch became a scroll drag). */
  cancelPress(): void {
    this.pressed = -1;
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown', this.onKey);
    for (const item of this.items) item.area.off('pointerover').off('pointerdown').off('pointerup').off('pointerout');
  }

  private wirePointer(item: MenuItem, index: number): void {
    item.area.setInteractive({ useHandCursor: true });
    item.area.on('pointerover', () => this.setFocus(index));
    item.area.on('pointerdown', () => {
      this.pressed = index;
      this.setFocus(index);
    });
    item.area.on('pointerout', () => {
      if (this.pressed === index) this.pressed = -1;
    });
    item.area.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const wasPressed = this.pressed === index;
      this.pressed = -1;
      if (wasPressed) this.confirm(pointer.x);
    });
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.keyGate.ready()) return;
    const direction = KEY_DIRECTIONS[event.code];
    if (direction) this.move(direction);
    else if (event.code === 'Enter' || event.code === 'Space' || event.code === 'NumpadEnter') {
      if (!event.repeat) this.confirm();
    }
    else if (event.code === 'Escape' || event.code === 'Backspace') this.back();
    else if (event.code === 'Tab' || event.code === 'KeyH') {
      event.preventDefault();
      if (!event.repeat) this.toggle();
    }
  }

  private confirm(pointerX?: number): void {
    const item = this.items[this.focusIndex];
    if (!item) return;
    playSfx(this.scene, 'uiConfirm');
    item.activate(pointerX);
  }

  private toggle(): void {
    const item = this.items[this.focusIndex];
    if (!item?.toggle) return;
    playSfx(this.scene, 'uiMove');
    item.toggle();
  }

  private back(): void {
    if (!this.options.onBack) return;
    playSfx(this.scene, 'uiBack');
    this.options.onBack();
  }

  private move(direction: Direction): void {
    const item = this.items[this.focusIndex];
    if (item?.adjust && (direction === 'left' || direction === 'right')) {
      item.adjust(direction === 'left' ? -1 : 1);
      playSfx(this.scene, 'uiMove');
      return;
    }
    const before = this.focusIndex;
    this.setFocus(moveFocus(this.focusIndex, this.items.length, direction, this.columns));
    if (this.focusIndex !== before) playSfx(this.scene, 'uiMove');
  }

  private readPad(): PadSnapshot {
    const pad = this.scene.input.gamepad?.gamepads.find((p) => p?.connected);
    if (!pad) return { direction: null, confirm: false, back: false, toggle: false };
    const dpad: Direction | null = pad.up ? 'up' : pad.down ? 'down' : pad.left ? 'left' : pad.right ? 'right' : null;
    return {
      direction: dpad ?? stickDirection(pad.leftStick.x, pad.leftStick.y),
      confirm: pad.buttons[BUTTON_A]?.pressed ?? false,
      back: (pad.buttons[BUTTON_B]?.pressed ?? false) || (pad.buttons[BUTTON_START]?.pressed ?? false),
      toggle: (pad.buttons[BUTTON_Y]?.pressed ?? false) || (pad.buttons[BUTTON_X]?.pressed ?? false),
    };
  }
}
