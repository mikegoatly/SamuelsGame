import Phaser from 'phaser';
import type { EnemyDef } from '../content/enemies';
import { MinesFrame } from '../content/minesFrames';
import type { Point, Rect } from '../logic/geometry';
import { NAB_SPEED, steerInRoom } from '../logic/nabChase';
import { Enemy, type EnemyContext, type HitSource } from './Enemy';

/** Nab is not a monster: he never hurts anyone, never dies and never holds up a room. */
export const NAB_NPC: EnemyDef = {
  id: 'nabThief',
  name: 'Nab',
  frame: MinesFrame.nab,
  tint: MinesFrame.nabTint,
  baseHp: 1,
  baseDamage: 0,
  speed: NAB_SPEED.base,
  behaviour: 'chaser',
  noContact: true,
  raisable: false,
  eliteOk: false,
  lootTableId: '',
};

const FLEE_RANGE = 72;
const ARRIVE = 4;
const WALL_MARGIN = 20;
/** He strolls to coins a little slower than he runs. */
const COIN_PACE = 0.8;

/** Nab the gem thief: runs from the hero, walks to coins on the floor; the NabSystem decides what a hit means. */
export class NabThief extends Enemy {
  /** Where he is heading (a coin), if anywhere. */
  goal?: Point;
  /** Current walking speed (faster with every hit). */
  speed: number = NAB_SPEED.base;
  /** The room he stays in (he never flees through its doors). */
  room?: Rect;
  /** Frozen in place (waiting at his gate, run over). */
  still = false;
  private readonly heading = new Phaser.Math.Vector2();
  private readonly wobble = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, x: number, y: number, level: number, context: EnemyContext, private readonly onHit: () => void) {
    super(scene, x, y, NAB_NPC, level, context);
    this.setTag('Nab', '#9fe07a');
  }

  override get countsForClear(): boolean {
    return false;
  }

  /** A hit from the hero (allies' bites do not count): never hurts him, the system counts it. */
  override takeHit(_amount: number, _dx: number, _dy: number, _knockback = 1, source: HitSource = 'basic'): void {
    if (!this.alive || source === 'ally') return;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => this.alive && this.applyBaseTint());
    this.onHit();
  }

  override takeDot(): void {}

  override stun(): void {}

  override applySlow(): void {}

  protected override act(time: number): void {
    if (this.still) {
      this.setVelocity(0, 0);
      return;
    }
    const away = this.heading.set(this.x - this.target.x, this.y - this.target.y);
    if (away.length() < FLEE_RANGE) {
      away.normalize().rotate(Math.sin(time / 260 + this.wobble) * 0.6);
      if (this.room) away.copy(steerInRoom(this, away, this.room, WALL_MARGIN));
      this.setVelocity(away.x * this.speed, away.y * this.speed);
      this.setFlipX(away.x < 0);
      return;
    }
    if (!this.goal || Phaser.Math.Distance.Between(this.x, this.y, this.goal.x, this.goal.y) < ARRIVE) {
      this.setVelocity(0, 0);
      return;
    }
    this.chase(time, this.speed * COIN_PACE, true, this.goal);
  }

  /** Leaves without a fight (gone through the gate, or slipped away). */
  slipAway(): void {
    this.puff();
    this.dismiss();
  }
}
