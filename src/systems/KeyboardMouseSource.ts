import Phaser from 'phaser';
import { KeyLatch, WheelThrottle } from '../logic/keyLatch';
import type { InputSource } from './InputController';

const WHEEL_INTERVAL_MS = 200;
const KEY_NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D', 'SPACE', 'Q'] as const;
type KeyName = (typeof KEY_NAMES)[number];

export class KeyboardMouseSource implements InputSource {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimVector = null;
  fire = false;
  altFire = false;
  dash = false;
  weaponCycle = 0;

  private readonly wheel = new WheelThrottle(WHEEL_INTERVAL_MS);
  private readonly latches = Object.fromEntries(KEY_NAMES.map((name) => [name, new KeyLatch()])) as Record<KeyName, KeyLatch>;
  private readonly mouseAim = new Phaser.Math.Vector2();
  private mouseMoved = false;
  private wasDown = false;
  private pressStartedOnUi = false;
  private lastX = 0;
  private lastY = 0;

  /** Null until the mouse has moved, so touch-only devices get no phantom aim. */
  get aimWorldPoint(): Phaser.Math.Vector2 | null {
    return this.mouseMoved ? this.mouseAim : null;
  }

  constructor(scene: Phaser.Scene) {
    scene.input.mouse?.disableContextMenu();
    const keyboard = scene.input.keyboard!;
    keyboard.createCursorKeys();
    keyboard.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', space: 'SPACE', q: 'Q' });
    for (const name of KEY_NAMES) {
      keyboard.on(`keydown-${name}`, () => this.latches[name].down());
      keyboard.on(`keyup-${name}`, () => this.latches[name].up());
    }
    window.addEventListener('blur', () => Object.values(this.latches).forEach((latch) => latch.reset()));
    scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => this.wheel.add(dy));
  }

  update(scene: Phaser.Scene): void {
    const held = (...names: KeyName[]): number => Number(names.map((name) => this.latches[name].read()).some(Boolean));
    this.moveVector.set(held('RIGHT', 'D') - held('LEFT', 'A'), held('DOWN', 'S') - held('UP', 'W'));

    this.dash = this.latches.SPACE.read();
    this.weaponCycle = this.latches.Q.take() ? 1 : this.wheel.take(scene.time.now);

    this.fire = this.altFire = false;
    const pointer = scene.input.mousePointer;
    if (!pointer) return;
    if (pointer.x !== this.lastX || pointer.y !== this.lastY) this.mouseMoved = true;
    this.lastX = pointer.x;
    this.lastY = pointer.y;
    pointer.updateWorldPoint(scene.cameras.main);
    this.mouseAim.set(pointer.worldX, pointer.worldY);
    const down = pointer.leftButtonDown();
    if (down && !this.wasDown) this.pressStartedOnUi = this.isOverHud(scene, pointer);
    this.wasDown = down;
    this.fire = down && !this.pressStartedOnUi;
    this.altFire = pointer.rightButtonDown();
  }

  /** True when the pointer is over an interactive HUD object (pause/fullscreen buttons), so the click is not a shot. */
  private isOverHud(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): boolean {
    const hud = scene.scene.get('Hud');
    return (hud?.input?.hitTestPointer(pointer).length ?? 0) > 0;
  }
}
