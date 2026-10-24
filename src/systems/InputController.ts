import Phaser from 'phaser';
import { GamepadSource } from './GamepadSource';
import { KeyboardMouseSource } from './KeyboardMouseSource';
import { TouchSource } from './TouchSource';

export interface InputSource {
  update(scene: Phaser.Scene): void;
  readonly moveVector: Phaser.Math.Vector2;
  /** Aim as a world point (mouse) - takes precedence only if aimVector is null. */
  readonly aimWorldPoint: Phaser.Math.Vector2 | null;
  /** Aim as a direction (touch stick / gamepad). */
  readonly aimVector: Phaser.Math.Vector2 | null;
  readonly fire: boolean;
  readonly altFire: boolean;
  readonly dash: boolean;
  rumble?(durationMs: number, weak: number, strong: number): void;
}

/** Merges all input sources into one device-agnostic view for game code. */
export class InputController {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimVector = new Phaser.Math.Vector2(1, 0);
  readonly aimWorldPoint = new Phaser.Math.Vector2();
  fire = false;
  altFire = false;
  dash = false;

  private readonly sources: InputSource[];

  constructor(scene: Phaser.Scene, sources?: InputSource[]) {
    this.sources = sources ?? [new KeyboardMouseSource(scene), new GamepadSource(), new TouchSource(scene)];
  }

  rumble(durationMs: number, weak: number, strong: number): void {
    for (const source of this.sources) source.rumble?.(durationMs, weak, strong);
  }

  update(scene: Phaser.Scene, origin: Phaser.Math.Vector2): void {
    this.moveVector.reset();
    this.fire = this.altFire = this.dash = false;

    for (const source of this.sources) {
      source.update(scene);
      this.moveVector.add(source.moveVector);
      this.fire ||= source.fire;
      this.altFire ||= source.altFire;
      this.dash ||= source.dash;
      this.mergeAim(source, origin);
    }
    if (this.moveVector.lengthSq() > 1) this.moveVector.normalize();
  }

  private mergeAim(source: InputSource, origin: Phaser.Math.Vector2): void {
    if (source.aimVector && source.aimVector.lengthSq() > 0.01) {
      this.aimVector.copy(source.aimVector).normalize();
      this.aimWorldPoint.copy(origin).add(this.aimVector.clone().scale(100));
    } else if (source.aimWorldPoint) {
      const direction = source.aimWorldPoint.clone().subtract(origin);
      if (direction.lengthSq() > 1) this.aimVector.copy(direction).normalize();
      this.aimWorldPoint.copy(source.aimWorldPoint);
    }
  }
}
