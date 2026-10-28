import Phaser from 'phaser';
import { SewerFrame, Tex } from '../../content/assetKeys';
import { puddleToEvict, puddleZone, PUDDLE } from '../../logic/blob';
import { damageToPlayer } from '../../logic/combat';
import type { Rect } from '../../logic/geometry';
import { CLOUD } from '../../logic/toad';
import { newZone, zoneStep, type Zone } from '../../logic/zone';
import { feel } from '../../systems/feel';
import type { GameClock } from '../../systems/GameClock';
import type { Player } from '../Player';

const GOO = 0x5fbf4a;
const GAS = 0xb8e86a;
const PLAYER_REACH = 4;

interface Puddle {
  zone: Rect;
  shape: Phaser.GameObjects.Arc;
  born: number;
  until: number;
  player: Player;
  owner: unknown;
}

interface Cloud {
  zone: Zone;
  x: number;
  y: number;
  damage: number;
  level: number;
  player: Player;
  parts: Phaser.GameObjects.Image[];
  disc: Phaser.GameObjects.Arc;
  born: number;
}

/** Harmless-looking floor effects monsters leave behind: slowing puddles (sludge blobs) and poison clouds (bloat toads). One per scene, ticking on the pause-safe clock. */
class GroundEffects {
  private readonly puddles: Puddle[] = [];
  private readonly clouds: Cloud[] = [];
  private readonly expiring: { at: number; item: { destroy(): void } }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly clock: GameClock,
  ) {
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
      fields.delete(scene);
    });
  }

  /** A puddle of goo that slows the player (as quicksand does) until it dries up. */
  puddle(player: Player, x: number, y: number, owner: unknown): void {
    const zone = puddleZone({ x, y }, PUDDLE.radius);
    const now = this.clock.now;
    const shape = this.scene.add.circle(x, y, PUDDLE.radius, GOO, 0.5).setStrokeStyle(1, 0x2f7a2a, 0.7).setDepth(2).setScale(1, 0.7);
    this.puddles.push({ zone, shape, born: now, until: now + PUDDLE.ttlMs, player, owner });
    player.slowZones.push(zone);
    const evict = puddleToEvict(this.puddles.map((p) => p.owner), owner, PUDDLE.maxPerBlob, PUDDLE.maxTotal);
    if (evict >= 0) this.dropPuddle(evict);
  }

  /** A small poison cloud: ticks damage on the player standing in it, then thins away. */
  cloud(player: Player, x: number, y: number, base: number, level: number): void {
    const now = this.clock.now;
    const disc = this.scene.add.circle(x, y, CLOUD.radius, GAS, 0.18).setStrokeStyle(1, GAS, 0.35).setDepth(2);
    const parts = SewerFrame.gas.map((frame, i) => {
      const angle = (i / SewerFrame.gas.length) * Math.PI * 2 + Math.random();
      return this.scene.add
        .image(x + Math.cos(angle) * CLOUD.radius * 0.45, y + Math.sin(angle) * CLOUD.radius * 0.45, Tex.sewer, frame)
        .setDepth(4)
        .setScale(2.2)
        .setAlpha(0.7)
        .setAngle(Math.random() * 360);
    });
    this.clouds.push({ zone: newZone(now, CLOUD.durationMs, CLOUD.tickMs), x, y, damage: base, level, player, parts, disc, born: now });
  }

  /** Destroys `item` after `ms` of game time (pause-safe, unlike scene timers). */
  expire(ms: number, item: { destroy(): void }): void {
    this.expiring.push({ at: this.clock.now + ms, item });
  }

  private dropPuddle(index: number): void {
    const [puddle] = this.puddles.splice(index, 1);
    if (!puddle) return;
    this.removeZone(puddle);
    puddle.shape.destroy();
  }

  private update(): void {
    const now = this.clock.now;
    for (let i = this.expiring.length - 1; i >= 0; i--) {
      if (now < this.expiring[i]!.at) continue;
      this.expiring[i]!.item.destroy();
      this.expiring.splice(i, 1);
    }
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const puddle = this.puddles[i]!;
      if (now >= puddle.until) this.dropPuddle(i);
      else puddle.shape.setAlpha(0.5 * Math.min(1, (puddle.until - now) / 700));
    }
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const cloud = this.clouds[i]!;
      const step = zoneStep(cloud.zone, now);
      if (step === 'expired') {
        cloud.disc.destroy();
        for (const part of cloud.parts) part.destroy();
        this.clouds.splice(i, 1);
        continue;
      }
      this.drawCloud(cloud, now);
      if (step === 'tick') this.hurt(cloud);
    }
  }

  private drawCloud(cloud: Cloud, now: number): void {
    const age = now - cloud.born;
    const fade = Math.min(1, (cloud.zone.until - now) / 700);
    const pulse = feel.reduced ? 1 : 0.85 + 0.15 * Math.sin(age / 160);
    cloud.disc.setAlpha(0.18 * fade);
    cloud.parts.forEach((part, i) => {
      part.setAlpha(0.7 * fade * pulse);
      if (!feel.reduced) part.setAngle(part.angle + (i % 2 === 0 ? 0.4 : -0.3));
    });
  }

  private hurt(cloud: Cloud): void {
    const { player } = cloud;
    if (player.dead || feel.isLocked) return;
    if (Math.hypot(player.x - cloud.x, player.y - cloud.y) > CLOUD.radius + PLAYER_REACH) return;
    player.takeDamage(Math.max(1, Math.round(damageToPlayer(cloud.damage, cloud.level, player.level) * CLOUD.damageShare)), cloud.x, cloud.y, 'hazard');
  }

  private removeZone(puddle: Puddle): void {
    const zones = puddle.player.slowZones;
    const at = zones.indexOf(puddle.zone);
    if (at >= 0) zones.splice(at, 1);
  }
}

const fields = new WeakMap<Phaser.Scene, GroundEffects>();

export function groundEffects(scene: Phaser.Scene, clock: GameClock): GroundEffects {
  let field = fields.get(scene);
  if (!field) {
    field = new GroundEffects(scene, clock);
    fields.set(scene, field);
  }
  return field;
}

export type { GroundEffects };
