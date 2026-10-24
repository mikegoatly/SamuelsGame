import Phaser from 'phaser';
import type { InputSource } from './InputController';

type Key = Phaser.Input.Keyboard.Key;
type Keys = Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space', Key>;

export class KeyboardMouseSource implements InputSource {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimWorldPoint = new Phaser.Math.Vector2();
  readonly aimVector = null;
  fire = false;
  altFire = false;
  dash = false;

  private readonly keys: Keys;

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

    const pointer = scene.input.activePointer;
    pointer.updateWorldPoint(scene.cameras.main);
    this.aimWorldPoint.set(pointer.worldX, pointer.worldY);
    this.fire = pointer.leftButtonDown();
    this.altFire = pointer.rightButtonDown();
    this.dash = k.space.isDown;
  }
}
