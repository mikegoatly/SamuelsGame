import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

const DUST_TINT = 0xc8b898;
const pools = new WeakMap<Phaser.Scene, Map<string, Emitter>>();

/** One long-lived emitter per effect kind and scene; callers just emit at a position. Cleared when the scene shuts down. */
function shared(scene: Phaser.Scene, kind: string, texture: string, depth: number, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): Emitter {
  let map = pools.get(scene);
  if (!map) {
    map = new Map();
    pools.set(scene, map);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => pools.delete(scene));
  }
  let emitter = map.get(kind);
  if (!emitter?.active) {
    emitter = scene.add.particles(0, 0, texture, { emitting: false, ...config }).setDepth(depth);
    map.set(kind, emitter);
  }
  return emitter;
}

function emit(emitter: Emitter, x: number, y: number, tint: number, count: number): void {
  emitter.setParticleTint(tint);
  emitter.emitParticleAt(x, y, count);
}

/** Enemy death: a tinted smoke puff plus a ring of sparks. Bosses get a bigger one. */
export function deathBurst(scene: Phaser.Scene, x: number, y: number, tint: number, big = false): void {
  const smoke = shared(scene, big ? 'smoke-big' : 'smoke', Tex.smoke, 8, {
    speed: { min: 10, max: 40 },
    lifespan: 520,
    scale: { start: big ? 0.16 : 0.07, end: big ? 0.4 : 0.2 },
    alpha: { start: 0.7, end: 0 },
  });
  const sparks = shared(scene, big ? 'star-big' : 'star', Tex.star, 8, {
    speed: { min: 40, max: big ? 140 : 90 },
    lifespan: 420,
    scale: { start: 0.05, end: 0 },
    rotate: { min: 0, max: 360 },
    blendMode: Phaser.BlendModes.ADD,
  });
  emit(smoke, x, y, tint, big ? 10 : 4);
  emit(sparks, x, y, tint, big ? 26 : 9);
}

/** Small grey-sand cloud kicked up behind a dash. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number): void {
  const dust = shared(scene, 'dust', Tex.smoke, 9, { speed: { min: 6, max: 26 }, lifespan: 380, scale: { start: 0.05, end: 0.14 }, alpha: { start: 0.5, end: 0 } });
  emit(dust, x, y + 5, DUST_TINT, 5);
}

/** Brief additive flash at the wand tip. */
export function muzzleFlash(scene: Phaser.Scene, x: number, y: number, angle: number, tint = 0xc8a8ff): void {
  const flash = scene.add.image(x, y, Tex.muzzle).setRotation(angle).setScale(0.07).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
  scene.tweens.add({ targets: flash, alpha: 0, scale: 0.12, duration: 90, onComplete: () => flash.destroy() });
}
