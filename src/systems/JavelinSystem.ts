import Phaser from 'phaser';
import { Frame, Tex } from '../content/assetKeys';
import type { WeaponDef } from '../content/weapons';
import type { Enemy } from '../entities/Enemy';
import { JAVELIN, javelinAt, JavelinHits, planJavelin, stuckLook, type JavelinFlight } from '../logic/javelin';
import { muzzleFlash } from './fx';
import { playSfx } from './sfx';
import { ringBurst, sparkBurst } from './skills/skillFx';
import { asTargets, enemiesInRadius, hurtEnemy, liveEnemies, runOver } from './skills/targets';
import type { SkillWorld } from './skills/types';

const STEEL = 0xcfe0f2;
const GLOW = 0x7adf4a;
/** The sprite is 16px with its tip at the top: the centre sits this far behind the tip. */
const TIP_OFFSET = 7;

interface Parts {
  image: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
}

interface Thrown extends Parts {
  weapon: WeaponDef;
  flight: JavelinFlight;
  hits: JavelinHits;
  angle: number;
  startedAt: number;
  last: { x: number; y: number };
  /** Set once it has landed. */
  stuckAt?: number;
}

/** Javelin: flies in a straight line through every enemy (each hit once), then sticks in the floor or a wall and fades. Level 5: after 1s the stuck javelin bursts, glowing first. */
export class JavelinSystem {
  private readonly thrown = new Set<Thrown>();
  private readonly spare: Parts[] = [];

  constructor(private readonly world: SkillWorld) {
    const { scene, player } = world;
    player.javelinHandler = (x, y, aim, weapon) => this.throw(x, y, aim, weapon);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private throw(x: number, y: number, aim: number, weapon: WeaponDef): void {
    const { scene, clock, isSolid } = this.world;
    const direction = { x: Math.cos(aim), y: Math.sin(aim) };
    const from = { x: x + direction.x * 10, y: y + direction.y * 10 };
    const flight = planJavelin(from, direction, Math.max(0, weapon.range - 10), weapon.speed, isSolid);
    const parts = this.spare.pop() ?? this.makeParts();
    parts.image.setVisible(true).setAlpha(1).setRotation(aim + Math.PI / 2);
    parts.glow.setVisible(false);
    this.place(parts, from, aim);
    this.thrown.add({ ...parts, weapon, flight, hits: new JavelinHits(), angle: aim, startedAt: clock.now, last: from });
    playSfx(scene, 'shoot', { rate: 0.55, volume: 0.9 });
    muzzleFlash(scene, from.x, from.y, aim, STEEL);
  }

  private makeParts(): Parts {
    const { scene } = this.world;
    return {
      image: scene.add.image(0, 0, Tex.tiles, Frame.javelin).setDepth(10),
      glow: scene.add.circle(0, 0, JAVELIN.burstRadius, GLOW, 0.1).setStrokeStyle(1, GLOW, 0.8).setDepth(2),
    };
  }

  private place(parts: Parts, tip: { x: number; y: number }, angle: number): void {
    parts.image.setPosition(tip.x - Math.cos(angle) * TIP_OFFSET, tip.y - Math.sin(angle) * TIP_OFFSET);
  }

  private update(): void {
    if (this.thrown.size === 0) return;
    if (runOver(this.world)) {
      for (const item of this.thrown) this.discard(item);
      this.thrown.clear();
      return;
    }
    const now = this.world.clock.now;
    for (const item of this.thrown) {
      if (item.stuckAt === undefined) this.fly(item, now);
      if (item.stuckAt !== undefined) this.stick(item, now);
    }
  }

  private fly(item: Thrown, now: number): void {
    const at = javelinAt(item.flight, now - item.startedAt);
    const enemies = liveEnemies(this.world.enemies);
    for (const enemy of item.hits.sweep<Enemy>(item.last, at, JAVELIN.width, asTargets(enemies), enemies)) {
      hurtEnemy(this.world, enemy, item.weapon.baseDamage, item.last.x, item.last.y, 1, JAVELIN.knockback, 'basic');
    }
    item.last = at;
    this.place(item, at, item.angle);
    if (at.landed) item.stuckAt = now;
  }

  private stick(item: Thrown, now: number): void {
    const look = stuckLook(now - item.stuckAt!, item.weapon.activeTwist === 'stickBurst');
    if (look.burst) this.burst(item);
    if (look.over) {
      this.thrown.delete(item);
      this.discard(item);
      return;
    }
    item.image.setAlpha(look.alpha);
    if (look.glow > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(look.glow * 18);
      item.glow.setPosition(item.flight.to.x, item.flight.to.y).setVisible(true).setScale(0.3 + 0.7 * look.glow).setAlpha(0.35 + 0.5 * pulse * look.glow);
    }
  }

  private burst(item: Thrown): void {
    const { scene } = this.world;
    const { x, y } = item.flight.to;
    for (const enemy of enemiesInRadius(this.world, x, y, JAVELIN.burstRadius)) {
      hurtEnemy(this.world, enemy, item.weapon.baseDamage * JAVELIN.burstDamageScale, x, y, 1, JAVELIN.burstKnockback, 'basic');
    }
    ringBurst(scene, x, y, JAVELIN.burstRadius, GLOW, 260);
    sparkBurst(scene, x, y, GLOW, 10, 50);
    playSfx(scene, 'poison', { rate: 1.3, volume: 0.8 });
  }

  private discard(item: Thrown): void {
    item.image.setVisible(false);
    item.glow.setVisible(false);
    this.spare.push({ image: item.image, glow: item.glow });
  }
}
