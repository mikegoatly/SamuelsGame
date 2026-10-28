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

const SPLIT_TINT = 0xd8b8ff;
const CELEBRATE_TINTS = [0xffe066, 0xffffff, 0xb48cff, 0x7dffb0];

/** Tiny spark ring where a wand bolt splits in two. */
export function fxSplit(scene: Phaser.Scene, x: number, y: number): void {
  const sparks = shared(scene, 'split', Tex.star, 8, { speed: { min: 20, max: 60 }, lifespan: 260, scale: { start: 0.04, end: 0 }, blendMode: Phaser.BlendModes.ADD });
  emit(sparks, x, y, SPLIT_TINT, 6);
}

/** Camp purchase and upgrade feedback: a burst of coloured stars. */
export function celebrate(scene: Phaser.Scene, x: number, y: number, tint = CELEBRATE_TINTS[0]!): void {
  const stars = shared(scene, 'celebrate', Tex.star, 200, {
    speed: { min: 50, max: 150 },
    lifespan: 650,
    scale: { start: 0.09, end: 0 },
    rotate: { min: 0, max: 360 },
    gravityY: 60,
    blendMode: Phaser.BlendModes.ADD,
  });
  emit(stars, x, y, tint, 14);
  CELEBRATE_TINTS.forEach((color, i) => scene.time.delayedCall(i * 70, () => stars.active && emit(stars, x, y, color, 5)));
}

const SPARK_TINT = 0xffc060;

/** Stone chips and grey dust where rubble lands or a floor gives way. */
export function debrisBurst(scene: Phaser.Scene, x: number, y: number, tint = 0x9a9488): void {
  const dust = shared(scene, 'debris-dust', Tex.smoke, 9, { speed: { min: 20, max: 70 }, lifespan: 520, scale: { start: 0.06, end: 0.2 }, alpha: { start: 0.6, end: 0 } });
  const chips = shared(scene, 'debris-chips', Tex.star, 9, { speed: { min: 40, max: 120 }, lifespan: 380, scale: { start: 0.04, end: 0 }, gravityY: 160, rotate: { min: 0, max: 360 } });
  emit(dust, x, y, tint, 8);
  emit(chips, x, y, 0xb8b0a0, 7);
}

/** A few embers popping off a flame source. */
export function emberBurst(scene: Phaser.Scene, x: number, y: number, count = 4): void {
  const embers = shared(scene, 'embers', Tex.star, 9, { speed: { min: 15, max: 55 }, lifespan: 520, scale: { start: 0.035, end: 0 }, gravityY: -30, blendMode: Phaser.BlendModes.ADD });
  emit(embers, x, y, SPARK_TINT, count);
}

const MIST_TINT = 0x7dd86a;

/** A soft green puff drifting up out of the sewer grate; `count` shrinks when flashes are reduced. */
export function mistPuff(scene: Phaser.Scene, x: number, y: number, count = 3): void {
  const mist = shared(scene, 'mist', Tex.smoke, 2, { speed: { min: 4, max: 12 }, lifespan: 1400, scale: { start: 0.04, end: 0.13 }, alpha: { start: 0.35, end: 0 }, gravityY: -14 });
  emit(mist, x, y, MIST_TINT, count);
}
