import Phaser from 'phaser';
import { Frame, Tex } from '../content/assetKeys';
import type { WeaponDef } from '../content/weapons';
import type { BlastTarget } from '../logic/fireball';
import type { Enemy } from '../entities/Enemy';
import { weaponBurnTick } from '../logic/burning';
import { JAVELIN, javelinAt, JavelinHits, planJavelin, stuckLook, type JavelinFlight } from '../logic/javelin';
import type { BurnSystem } from './BurnSystem';
import { feel } from './feel';
import { muzzleFlash } from './fx';
import { playSfx } from './sfx';
import { ringBurst, sparkBurst } from './skills/skillFx';
import { asTargets, enemiesInRadius, hurtEnemy, liveEnemies, runOver } from './skills/targets';
import type { SkillWorld } from './skills/types';

const STEEL = 0xcfe0f2;
const GLOW = 0xff8a2c;
const FLAME_CORE = 0xffd060;
/** The sprite is 16px with its tip at the top: the centre sits this far behind the tip. */
const TIP_OFFSET = 7;

interface Parts {
  image: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
  /** The flickering orange glow around a burning javelin, in flight and stuck. */
  flame: Phaser.GameObjects.Arc;
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

interface Targets {
  enemies: Enemy[];
  bodies: BlastTarget[];
}

/** Javelin: flies in a straight line through every enemy (each hit once), then sticks in the floor or a wall and fades. Level 5: after 1s the stuck javelin bursts, glowing first. */
export class JavelinSystem {
  private readonly thrown = new Set<Thrown>();
  private readonly spare: Parts[] = [];

  constructor(
    private readonly world: SkillWorld,
    private readonly burn?: BurnSystem,
  ) {
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
    parts.flame.setVisible(weapon.burns === true).setAlpha(1);
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
      flame: scene.add.circle(0, 0, 6, FLAME_CORE, 0.4).setStrokeStyle(2, GLOW, 0.7).setDepth(9),
    };
  }

  private place(parts: Parts, tip: { x: number; y: number }, angle: number): void {
    parts.image.setPosition(tip.x - Math.cos(angle) * TIP_OFFSET, tip.y - Math.sin(angle) * TIP_OFFSET);
    parts.flame.setPosition(tip.x - Math.cos(angle) * 3, tip.y - Math.sin(angle) * 3);
  }

  private flicker(item: Thrown, now: number, alpha = 1): void {
    if (!item.weapon.burns) return;
    const wave = feel.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now / 55 + item.startedAt);
    item.flame.setAlpha((0.4 + 0.5 * wave) * alpha).setScale(0.85 + 0.35 * wave);
  }

  private update(): void {
    if (this.thrown.size === 0) return;
    if (runOver(this.world)) {
      for (const item of this.thrown) this.discard(item);
      this.thrown.clear();
      return;
    }
    const now = this.world.clock.now;
    let targets: Targets | undefined;
    for (const item of this.thrown) {
      if (item.stuckAt === undefined) this.fly(item, now, (targets ??= this.targets()));
      if (item.stuckAt !== undefined) this.stick(item, now);
    }
  }

  /** The live enemies, listed once per frame for every javelin in flight. */
  private targets(): Targets {
    const enemies = liveEnemies(this.world.enemies);
    return { enemies, bodies: asTargets(enemies) };
  }

  private fly(item: Thrown, now: number, { enemies, bodies }: Targets): void {
    const at = javelinAt(item.flight, now - item.startedAt);
    for (const enemy of item.hits.sweep<Enemy>(item.last, at, JAVELIN.width, bodies, enemies)) {
      hurtEnemy(this.world, enemy, item.weapon.baseDamage, item.last.x, item.last.y, 1, JAVELIN.knockback, 'basic');
      this.ignite(item, enemy);
    }
    item.last = at;
    this.flicker(item, now);
    if (item.weapon.burns) this.burn?.spark(at.x, at.y);
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
    this.flicker(item, now, look.alpha);
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
      this.ignite(item, enemy);
    }
    ringBurst(scene, x, y, JAVELIN.burstRadius, GLOW, 260);
    sparkBurst(scene, x, y, GLOW, 10, 50);
    playSfx(scene, 'poison', { rate: 1.3, volume: 0.8 });
  }

  /** Everything a burning javelin hurts catches fire (a refresh, never a stack); a hit that killed has nothing left to light. */
  private ignite(item: Thrown, enemy: Enemy): void {
    if (item.weapon.burns) this.burn?.igniteEnemy(enemy, { weapon: weaponBurnTick(item.weapon.baseDamage) });
  }

  private discard(item: Thrown): void {
    item.image.setVisible(false);
    item.glow.setVisible(false);
    item.flame.setVisible(false);
    this.spare.push({ image: item.image, glow: item.glow, flame: item.flame });
  }
}
