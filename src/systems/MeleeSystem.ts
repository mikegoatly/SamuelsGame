import Phaser from 'phaser';
import type { WeaponDef } from '../content/weapons';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../debug';
import type { Enemy } from '../entities/Enemy';
import type { EnemyProjectile, EnemyProjectiles } from '../entities/EnemyProjectile';
import type { Player } from '../entities/Player';
import { fireProjectile } from '../entities/Projectile';
import { ComboCycle, type ComboStep } from '../logic/comboCycle';
import { damageToEnemy } from '../logic/combat';
import { lineClear } from '../logic/lineOfSight';
import { meleeHits, nearestInCone, radialHits, type MeleeCone, type MeleeTarget } from '../logic/melee';
import { DAGGER_THROW, FORCE_WAVE, SHOCKWAVE, WAVE } from '../logic/weaponTwists';
import { BowSystem } from './BowSystem';
import { feel } from './feel';
import { punchFx, ringFx, slashFx, sparkFx } from './MeleeFx';
import { playSfx } from './sfx';

const DEFLECT_PADDING = 6;
const OPENING: ComboStep = { step: 0, last: false };

interface WaveShape {
  damageScale: number;
  speed: number;
  range: number;
  scale: { x: number; y: number };
}

interface Swing {
  x: number;
  y: number;
  aim: number;
  combo: ComboStep;
  targets: Enemy[];
  bodies: MeleeTarget[];
  hits: number[];
}

export interface MeleeOptions {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  shots: EnemyProjectiles;
  /** Player bolt pool, used for slash waves, thrown daggers, force waves and arrows. */
  projectiles: Phaser.Physics.Arcade.Group;
  isSolid: (x: number, y: number) => boolean;
}

/** Resolves melee swings (sword, daggers, hammer, fists): one cone test per swing hurts each enemy once, swats the nearest enemy bolt away and draws the strike. Also hosts the bow. */
export class MeleeSystem {
  private readonly cycles = new Map<string, ComboCycle>();

  constructor(private readonly o: MeleeOptions) {
    o.player.meleeHandler = (x, y, aim, weapon) => this.swing(x, y, aim, weapon);
    o.player.events.on('player-died', () => this.cycles.clear());
    new BowSystem(o);
  }

  private comboFor(weapon: WeaponDef): ComboStep {
    const spec = weapon.melee?.cycle;
    if (!spec) return OPENING;
    let cycle = this.cycles.get(weapon.id);
    if (!cycle) this.cycles.set(weapon.id, (cycle = new ComboCycle(spec.length, spec.resetMs)));
    return cycle.next(this.o.player.now);
  }

  private swing(x: number, y: number, aim: number, weapon: WeaponDef): { reverse: boolean } | undefined {
    const melee = weapon.melee;
    if (!melee) return undefined;
    const { scene } = this.o;
    const origin = { x, y };
    const combo = this.comboFor(weapon);
    const finisher = combo.last ? melee.finisher : undefined;
    const cone: MeleeCone = { arc: melee.arc, reach: melee.reach };
    const targets = (this.o.enemies.getChildren() as Enemy[]).filter((e) => e.active && e.alive && e.targetable && lineClear(origin, e, this.o.isSolid));
    const bodies = targets.map((e) => ({ x: e.x, y: e.y, reach: e.displayWidth / 2 }));
    const hits = meleeHits(origin, aim, cone, bodies);
    for (const index of hits) this.hurt(targets[index]!, weapon.baseDamage * (finisher?.damage ?? 1), x, y, melee.knockback * (finisher?.knockback ?? 1));
    const deflected = this.deflect(origin, aim, { ...cone, reach: cone.reach + DEFLECT_PADDING });
    const side = melee.cycle && !melee.finisher ? (combo.step % 2 === 0 ? -1 : 1) : 0;
    if (melee.thrust) punchFx(scene, x + Math.cos(aim) * melee.reach, y + Math.sin(aim) * melee.reach, aim, melee.colour ?? 0xffffff, combo.last);
    else slashFx(scene, x, y, aim, melee.arc, melee.reach, melee.swingMs, melee.colour, side);
    this.twist(weapon, { x, y, aim, combo, targets, bodies, hits });
    playSfx(scene, 'swing', melee.cycle ? { rate: 1.2 + combo.step * 0.1 } : {});
    if (hits.length > 0) {
      playSfx(scene, 'swordHit', finisher ? { rate: 0.7 } : {});
      feel.shake(melee.shake ? 120 : 70, melee.shake ?? 0.003);
      feel.hitStop(finisher || melee.shake ? 60 : 45);
    } else if (deflected) playSfx(scene, 'swordHit', { rate: 1.4, volume: 0.7 });
    return { reverse: side > 0 };
  }

  private hurt(enemy: Enemy, base: number, fromX: number, fromY: number, knockback: number): void {
    const { player } = this.o;
    const raw = damageToEnemy(base, player.level, enemy.level, player.stats.damageMultiplier);
    enemy.takeHit(raw * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1), enemy.x - fromX, enemy.y - fromY, knockback);
  }

  private twist(weapon: WeaponDef, swing: Swing): void {
    const { x, y, aim, combo } = swing;
    const alreadyHit = swing.hits.map((i) => swing.targets[i]);
    switch (weapon.activeTwist) {
      case 'wave':
        this.sendWave(x, y, aim, weapon, alreadyHit, { ...WAVE, scale: { x: 2.6, y: 1.6 } });
        break;
      case 'forceWave':
        if (combo.last) this.sendWave(x, y, aim, weapon, alreadyHit, { ...FORCE_WAVE, scale: { x: 1.6, y: 2.2 } });
        break;
      case 'daggerThrow':
        if (combo.last) this.throwDagger(x, y, aim, weapon);
        break;
      case 'shockwave':
        this.shockwave(weapon, swing);
        break;
      default:
    }
  }

  /** Level 5 twist: a wave flies on from the swing, hurting what it reaches once. */
  private sendWave(x: number, y: number, aim: number, weapon: WeaponDef, alreadyHit: readonly unknown[], shape: WaveShape): void {
    const direction = new Phaser.Math.Vector2(Math.cos(aim), Math.sin(aim));
    const wave: WeaponDef = { ...weapon, kind: 'ranged', speed: shape.speed, range: shape.range, activeTwist: undefined, projectileFrame: undefined };
    fireProjectile(this.o.projectiles, x + direction.x * 14, y + direction.y * 14, direction, wave, {
      damageScale: shape.damageScale,
      pierce: Infinity,
      skip: alreadyHit,
      scale: shape.scale,
    });
  }

  private throwDagger(x: number, y: number, aim: number, weapon: WeaponDef): void {
    const direction = new Phaser.Math.Vector2(Math.cos(aim), Math.sin(aim));
    const thrown: WeaponDef = { ...weapon, kind: 'ranged', speed: DAGGER_THROW.speed, range: DAGGER_THROW.range, activeTwist: undefined };
    fireProjectile(this.o.projectiles, x + direction.x * 12, y + direction.y * 12, direction, thrown, {
      damageScale: DAGGER_THROW.damageScale,
      frame: weapon.frame,
    });
  }

  /** Level 5 hammer twist: a ring of force around where the head lands hurts and shoves everything near it. */
  private shockwave(weapon: WeaponDef, swing: Swing): void {
    const reach = (weapon.melee?.reach ?? 0) * 0.9;
    const center = { x: swing.x + Math.cos(swing.aim) * reach, y: swing.y + Math.sin(swing.aim) * reach };
    for (const index of radialHits(center, SHOCKWAVE.radius, swing.bodies, swing.hits)) {
      this.hurt(swing.targets[index]!, weapon.baseDamage * SHOCKWAVE.damageScale, center.x, center.y, SHOCKWAVE.knockback);
    }
    ringFx(this.o.scene, center.x, center.y, SHOCKWAVE.radius, 0xd9c9b0);
    playSfx(this.o.scene, 'slam', { volume: 0.6 });
  }

  /** Swats the nearest enemy bolt in the cone: one per swing, so a volley still gets through. */
  private deflect(origin: { x: number; y: number }, aim: number, cone: MeleeCone): boolean {
    const bolts = (this.o.shots.group.getChildren() as EnemyProjectile[]).filter((b) => b.active && lineClear(origin, b, this.o.isSolid));
    const bolt = bolts[nearestInCone(origin, aim, cone, bolts)];
    if (!bolt) return false;
    bolt.kill();
    sparkFx(this.o.scene, bolt.x, bolt.y);
    return true;
  }
}
