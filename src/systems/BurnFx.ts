import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { feel } from './feel';
import { makeEmitter, puff, steady, type Emitter } from './hazards/emitters';

export const FLAME_TINT = 0xff8a3c;
const HERO_GLOW = 0xff7a20;
const SPARKS_PER_SECOND = 9;
const SPARKS_PER_SECOND_REDUCED = 3;

/** The look of fire that sticks: rising flame sparks on whatever burns, and a warm glow on the hero. All of it is calmer (steady, fewer sparks) when flashes are reduced. */
export class BurnFx {
  private readonly emitter: Emitter;
  private readonly glow: Phaser.GameObjects.Arc;
  private readonly carry = new Map<unknown, { value: number }>();

  constructor(scene: Phaser.Scene) {
    this.emitter = makeEmitter(scene, Tex.smoke, 11, {
      speedY: { min: -38, max: -16 },
      speedX: { min: -8, max: 8 },
      lifespan: 480,
      scale: { start: 0.045, end: 0.01 },
      alpha: { start: 0.9, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.glow = scene.add.circle(0, 0, 13, HERO_GLOW, 0.3).setDepth(4).setVisible(false);
  }

  /** A few sparks rising from (x, y) this frame; `owner` keeps its own fractional spark count. */
  sparks(owner: unknown, x: number, y: number, spread: number, dtMs: number): void {
    let carry = this.carry.get(owner);
    if (!carry) this.carry.set(owner, (carry = { value: 0 }));
    const n = steady(carry, feel.reduced ? SPARKS_PER_SECOND_REDUCED : SPARKS_PER_SECOND, dtMs);
    for (let i = 0; i < n; i++) puff(this.emitter, x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, Math.random() < 0.4 ? 0xffd860 : 0xff7a28, 1);
  }

  /** One spark, for a flying javelin's trail. */
  spark(x: number, y: number): void {
    if (feel.reduced) return;
    puff(this.emitter, x, y, 0xffb040, 1);
  }

  forget(owner: unknown): void {
    this.carry.delete(owner);
  }

  heroGlow(x: number, y: number, now: number, on: boolean): void {
    this.glow.setVisible(on);
    if (!on) return;
    const pulse = feel.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 90);
    this.glow.setPosition(x, y).setAlpha(0.28 + 0.2 * pulse).setScale(0.9 + 0.2 * pulse);
  }

  destroy(): void {
    this.emitter.destroy();
    this.glow.destroy();
  }
}
