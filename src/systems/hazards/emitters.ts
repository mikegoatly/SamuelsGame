import Phaser from 'phaser';
import { Tex } from '../../content/assetKeys';

export type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

type EmitterConfig = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

/** A hazard's own manual emitter: nothing flows until `puff` is called. */
export function makeEmitter(scene: Phaser.Scene, texture: string, depth: number, config: EmitterConfig): Emitter {
  return scene.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(depth);
}

export const smokeEmitter = (scene: Phaser.Scene, depth: number, config: EmitterConfig): Emitter => makeEmitter(scene, Tex.smoke, depth, config);

export function puff(emitter: Emitter, x: number, y: number, tint: number, count: number): void {
  emitter.setParticleTint(tint);
  emitter.emitParticleAt(x, y, count);
}

/** Particles to spawn this frame at `perSecond`, carrying the fractional remainder in `carry.value`. */
export function steady(carry: { value: number }, perSecond: number, dtMs: number): number {
  carry.value += (perSecond * dtMs) / 1000;
  const whole = Math.floor(carry.value);
  carry.value -= whole;
  return whole;
}
