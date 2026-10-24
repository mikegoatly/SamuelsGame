import Phaser from 'phaser';
import { SLOT_COUNT } from '../logic/loadout';
import { InputSwallow } from '../logic/inputSwallow';
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
  /** Skill slot buttons 1..3: true while held, or once for a tap that landed between frames. */
  readonly skills: readonly boolean[];
  readonly dash: boolean;
  rumble?(durationMs: number, weak: number, strong: number): void;
}

/** Merges all input sources into one device-agnostic view for game code. */
export class InputController {
  readonly moveVector = new Phaser.Math.Vector2();
  readonly aimVector = new Phaser.Math.Vector2(1, 0);
  readonly aimWorldPoint = new Phaser.Math.Vector2();
  fire = false;
  readonly skills: boolean[] = Array.from({ length: SLOT_COUNT }, () => false);
  dash = false;

  private readonly sources: InputSource[];
  private readonly swallow = new InputSwallow();

  constructor(scene: Phaser.Scene, sources?: InputSource[]) {
    this.sources = sources ?? [new KeyboardMouseSource(scene), new GamepadSource(), new TouchSource(scene)];
  }

  /** Drops fire, dash and skill input until released, e.g. after a click or key dismissed a modal. */
  swallowUntilReleased(): void {
    this.swallow.arm();
  }

  rumble(durationMs: number, weak: number, strong: number): void {
    for (const source of this.sources) source.rumble?.(durationMs, weak, strong);
  }

  update(scene: Phaser.Scene, origin: Phaser.Math.Vector2): void {
    this.moveVector.reset();
    this.fire = this.dash = false;
    this.skills.fill(false);

    for (const source of this.sources) {
      source.update(scene);
      this.moveVector.add(source.moveVector);
      this.fire ||= source.fire;
      this.dash ||= source.dash;
      source.skills.forEach((pressed, i) => (this.skills[i] ||= pressed));
      this.mergeAim(source, origin);
    }
    if (this.swallow.suppress(this.fire || this.dash || this.skills.some(Boolean))) {
      this.fire = this.dash = false;
      this.skills.fill(false);
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
