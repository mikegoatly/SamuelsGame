import Phaser from 'phaser';
import { Tex } from '../../content/assetKeys';
import type { Enemy } from '../../entities/Enemy';
import { newZone, zoneStep, type Zone } from '../../logic/zone';
import { enemiesInRadius, runOver } from './targets';
import type { SkillWorld } from './types';

export interface ZoneSpec {
  x: number;
  y: number;
  radius: number;
  durationMs: number;
  tickMs: number;
  color: number;
  /** Runs for every enemy inside the zone on each tick. */
  onTick: (enemy: Enemy) => void;
  /** Keeps the zone centred on the player. */
  follow?: boolean;
  /** Shows a ghost of the hero standing in the zone (Blink afterimage). */
  ghost?: boolean;
}

interface Live {
  spec: ZoneSpec;
  zone: Zone;
  disc: Phaser.GameObjects.Arc;
  mist: Phaser.GameObjects.Particles.ParticleEmitter;
  ghost?: Phaser.GameObjects.Image;
}

const fields = new WeakMap<Phaser.Scene, ZoneField>();

/** One shared field per scene: lingering circles that hurt enemies inside on a tick (poison cloud, burning ground, static, afterimage). */
export const zonesFor = (world: SkillWorld): ZoneField => {
  let field = fields.get(world.scene);
  if (!field) fields.set(world.scene, (field = new ZoneField(world)));
  return field;
};

export class ZoneField {
  private readonly zones = new Set<Live>();

  constructor(private readonly world: SkillWorld) {
    const { scene } = world;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      fields.delete(scene);
    });
  }

  /** Starts a zone; the returned function ends it early. */
  spawn(spec: ZoneSpec): () => void {
    const { scene, clock } = this.world;
    const disc = scene.add.circle(spec.x, spec.y, spec.radius, spec.color, 0.16).setStrokeStyle(1, spec.color, 0.7).setDepth(2);
    const mist = scene.add
      .particles(spec.x, spec.y, Tex.smoke, {
        emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, spec.radius * 0.8), quantity: 1 },
        frequency: 90,
        lifespan: 900,
        speedY: { min: -8, max: -2 },
        scale: { start: spec.radius / 220, end: spec.radius / 110 },
        alpha: { start: 0.35, end: 0 },
        tint: spec.color,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(3);
    const ghost = spec.ghost ? scene.add.image(spec.x, spec.y, Tex.tiles, this.world.player.hero.frame).setTint(spec.color).setAlpha(0.6).setDepth(4) : undefined;
    const live: Live = { spec, zone: newZone(clock.now, spec.durationMs, spec.tickMs), disc, mist, ghost };
    this.zones.add(live);
    return () => {
      if (this.zones.has(live)) this.remove(live);
    };
  }

  private update(): void {
    const { clock, player } = this.world;
    if (runOver(this.world)) {
      for (const live of [...this.zones]) this.discard(live);
      return;
    }
    for (const live of [...this.zones]) {
      const { spec, zone, disc, mist } = live;
      if (spec.follow) {
        spec.x = player.x;
        spec.y = player.y;
        disc.setPosition(spec.x, spec.y);
        mist.setPosition(spec.x, spec.y);
      }
      const step = zoneStep(zone, clock.now);
      disc.setAlpha(0.7 + 0.3 * Math.sin(clock.now / 120));
      if (step === 'tick') for (const enemy of enemiesInRadius(this.world, spec.x, spec.y, spec.radius)) spec.onTick(enemy);
      if (step === 'expired') this.remove(live);
    }
  }

  private discard(live: Live): void {
    this.zones.delete(live);
    for (const object of [live.disc, live.mist, live.ghost]) object?.destroy();
  }

  private remove(live: Live): void {
    this.zones.delete(live);
    live.mist.stop();
    this.world.scene.tweens.add({ targets: [live.disc, live.ghost], alpha: 0, duration: 250, onComplete: () => { live.disc.destroy(); live.ghost?.destroy(); } });
    this.world.scene.time.delayedCall(1000, () => live.mist.destroy());
  }
}
