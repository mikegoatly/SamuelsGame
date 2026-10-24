import Phaser from 'phaser';
import type { InputSource } from './InputController';

type Key = Phaser.Input.Keyboard.Key;
type Keys = Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space', Key>;

export class KeyboardMouseSource implements InputSource {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimVector = null;
  fire = false;
  altFire = false;
  dash = false;

  private readonly keys: Keys;
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
    const cursors = keyboard.createCursorKeys();
    const letters = keyboard.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D', space: 'SPACE' }) as Pick<
      Keys,
      'w' | 'a' | 's' | 'd' | 'space'
    >;
    this.keys = { ...letters, up: cursors.up, down: cursors.down, left: cursors.left, right: cursors.right };
  }

  update(scene: Phaser.Scene): void {
    const k = this.keys;
    this.moveVector.set(
      Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown),
      Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown),
    );

    this.dash = k.space.isDown;
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
