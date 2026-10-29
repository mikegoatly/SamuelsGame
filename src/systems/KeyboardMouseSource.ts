import Phaser from 'phaser';
import { KeyLatch } from '../logic/keyLatch';
import { SLOT_COUNT } from '../logic/loadout';
import type { InputSource } from './InputController';
import { heldKeys } from './inputDevice';

const KEY_NAMES = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D', 'SPACE', 'ONE', 'TWO', 'THREE', 'E', 'R', 'F', 'RMB'] as const;
type KeyName = (typeof KEY_NAMES)[number];
const KEY_CODES: Record<Exclude<KeyName, 'RMB'>, string> = {
  UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight', W: 'KeyW', A: 'KeyA', S: 'KeyS', D: 'KeyD',
  SPACE: 'Space', ONE: 'Digit1', TWO: 'Digit2', THREE: 'Digit3', E: 'KeyE', R: 'KeyR', F: 'KeyF',
};
const SKILL_KEYS: readonly (readonly KeyName[])[] = [['RMB', 'ONE'], ['E', 'TWO'], ['R', 'THREE']];
const RIGHT_BUTTON = 2;

export class KeyboardMouseSource implements InputSource {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimVector = null;
  fire = false;
  readonly skills: boolean[] = Array.from({ length: SLOT_COUNT }, () => false);
  dash = false;
  potion = false;

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
    keyboard.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', space: 'SPACE', one: 'ONE', two: 'TWO', three: 'THREE', e: 'E', r: 'R', f: 'F' });
    for (const name of KEY_NAMES.filter((n) => n !== 'RMB')) {
      keyboard.on(`keydown-${name}`, () => this.latches[name].down());
      keyboard.on(`keyup-${name}`, () => this.latches[name].up());
    }
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => pointer.button === RIGHT_BUTTON && this.latches.RMB.down());
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => pointer.button === RIGHT_BUTTON && this.latches.RMB.up());
    window.addEventListener('blur', () => Object.values(this.latches).forEach((latch) => latch.reset()));
    // A paused scene never sees key events, so a key released behind a dialog would stay held.
    const sync = (): void => (Object.keys(KEY_CODES) as (keyof typeof KEY_CODES)[]).forEach((name) => this.latches[name].sync(heldKeys.has(KEY_CODES[name])));
    scene.events.on(Phaser.Scenes.Events.RESUME, sync);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.RESUME, sync));
  }

  update(scene: Phaser.Scene): void {
    const held = (...names: readonly KeyName[]): number => Number(names.map((name) => this.latches[name].read()).some(Boolean));
    this.moveVector.set(held('RIGHT', 'D') - held('LEFT', 'A'), held('DOWN', 'S') - held('UP', 'W'));
    this.dash = this.latches.SPACE.read();
    this.potion = this.latches.F.read();
    SKILL_KEYS.forEach((names, i) => (this.skills[i] = held(...names) > 0));

    this.fire = false;
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
  }

  /** True when the pointer is over an interactive HUD object (pause/fullscreen buttons), so the click is not a shot. */
  private isOverHud(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): boolean {
    return ['Hud', 'Fullscreen'].some((key) => (scene.scene.get(key)?.input?.hitTestPointer(pointer).length ?? 0) > 0);
  }
}
