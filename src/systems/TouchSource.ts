import Phaser from 'phaser';
import { KeyLatch } from '../logic/keyLatch';
import { SLOT_COUNT } from '../logic/loadout';
import { pastThreshold } from '../logic/stick';
import { classifyTouch, readStick, SKILL_BUTTONS, touchMetrics, type ButtonId, type TouchRole } from '../logic/virtualStick';
import type { InputSource } from './InputController';

export const TOUCH_STATE_KEY = 'touchState';

const AIM_FIRE_THRESHOLD = 0.5;
const MIN_POINTERS = 5;
const PAD_ACTIVITY = 0.3;

export interface StickView {
  active: boolean;
  originX: number;
  originY: number;
  knobX: number;
  knobY: number;
}

/** Shared with the HUD through the scene registry; the HUD only reads it. */
export interface TouchState {
  visible: boolean;
  move: StickView;
  aim: StickView;
  buttons: Record<ButtonId, boolean>;
}

const newStick = (): StickView => ({ active: false, originX: 0, originY: 0, knobX: 0, knobY: 0 });

export class TouchSource implements InputSource {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimWorldPoint = null;
  fire = false;
  readonly skills: boolean[] = Array.from({ length: SLOT_COUNT }, () => false);
  dash = false;
  potion = false;

  readonly state: TouchState = {
    visible: false,
    move: newStick(),
    aim: newStick(),
    buttons: { dash: false, skill1: false, skill2: false, skill3: false, potion: false },
  };

  /** Remembers taps shorter than a frame, like the keyboard latches. */
  private readonly latches: Record<ButtonId, KeyLatch> = { dash: new KeyLatch(), skill1: new KeyLatch(), skill2: new KeyLatch(), skill3: new KeyLatch(), potion: new KeyLatch() };

  private readonly lastAim = new Phaser.Math.Vector2(1, 0);
  private hasAimed = false;
  private readonly held = new Map<Phaser.Input.Pointer, TouchRole>();

  constructor(private readonly scene: Phaser.Scene) {
    const input = scene.input;
    const missing = MIN_POINTERS - input.manager.pointers.length;
    if (missing > 0) input.addPointer(missing);
    scene.registry.set(TOUCH_STATE_KEY, this.state);

    input.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
      pointer.wasTouch ? this.touchStart(pointer) : this.hide(),
    );
    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch) this.hide();
    });
    input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.release(pointer));
    input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.release(pointer));
    input.keyboard?.on('keydown', () => this.hide());
    scene.game.canvas.addEventListener('pointercancel', () => this.releaseAll());
    window.addEventListener('blur', () => this.releaseAll());
  }

  get aimVector(): Phaser.Math.Vector2 | null {
    return this.state.visible && this.hasAimed ? this.lastAim : null;
  }

  update(scene: Phaser.Scene): void {
    if (this.state.visible && this.padInUse(scene)) this.hide();
    this.moveVector.reset();
    this.fire = false;
    const { state } = this;
    state.move.active = state.aim.active = false;
    for (const id of Object.keys(state.buttons) as ButtonId[]) state.buttons[id] = false;

    const { stickRadius } = touchMetrics(scene.scale.width, scene.scale.height);
    for (const [pointer, role] of this.held) {
      if (role === 'move') {
        const { value } = this.readInto(state.move, pointer, stickRadius);
        this.moveVector.set(value.x, value.y);
      } else if (role === 'aim') {
        const { value } = this.readInto(state.aim, pointer, stickRadius);
        const magnitude = Math.hypot(value.x, value.y);
        if (magnitude > 0) {
          this.lastAim.set(value.x, value.y).normalize();
          this.hasAimed = true;
        }
        this.fire = pastThreshold(magnitude, AIM_FIRE_THRESHOLD);
      } else {
        state.buttons[role] = true;
      }
    }
    this.dash = this.latches.dash.read();
    this.potion = this.latches.potion.read();
    SKILL_BUTTONS.forEach((id, i) => (this.skills[i] = this.latches[id].read()));
  }

  private release(pointer: Phaser.Input.Pointer): void {
    const role = this.held.get(pointer);
    this.held.delete(pointer);
    if (role && role !== 'move' && role !== 'aim' && ![...this.held.values()].includes(role)) this.latches[role].up();
  }

  private readInto(view: StickView, pointer: Phaser.Input.Pointer, radius: number) {
    const reading = readStick({ x: view.originX, y: view.originY }, pointer, radius);
    view.active = true;
    view.knobX = reading.knob.x;
    view.knobY = reading.knob.y;
    return reading;
  }

  private touchStart(pointer: Phaser.Input.Pointer): void {
    this.state.visible = true;
    const { scale } = this.scene;
    const role = classifyTouch(pointer, scale.width, touchMetrics(scale.width, scale.height));
    if (!role) return;
    if (role === 'move' || role === 'aim') {
      if ([...this.held.values()].includes(role)) return;
      const view = this.state[role];
      view.originX = pointer.x;
      view.originY = pointer.y;
    }
    if (role !== 'move' && role !== 'aim') this.latches[role].down();
    this.held.set(pointer, role);
  }

  /** Cancelled touches and lost focus release every held pointer and button. */
  private releaseAll(): void {
    this.held.clear();
    Object.values(this.latches).forEach((latch) => latch.reset());
  }

  private hide(): void {
    this.state.visible = false;
    this.held.clear();
    Object.values(this.latches).forEach((latch) => latch.reset());
  }

  private padInUse(scene: Phaser.Scene): boolean {
    return (scene.input.gamepad?.gamepads ?? []).some(
      (pad) =>
        pad?.connected &&
        (pad.buttons.some((b) => b.pressed) ||
          Math.hypot(pad.leftStick.x, pad.leftStick.y) > PAD_ACTIVITY ||
          Math.hypot(pad.rightStick.x, pad.rightStick.y) > PAD_ACTIVITY),
    );
  }
}
