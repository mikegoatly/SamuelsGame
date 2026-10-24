import Phaser from 'phaser';
import type { WeaponDef } from '../content/weapons';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../debug';
import type { Enemy } from '../entities/Enemy';
import type { EnemyProjectile, EnemyProjectiles } from '../entities/EnemyProjectile';
import type { Player } from '../entities/Player';
import { damageToEnemy } from '../logic/combat';
import { lineClear } from '../logic/lineOfSight';
import { fireProjectile } from '../entities/Projectile';
import { WAVE } from '../logic/weaponTwists';
import { feel } from './feel';
import { playSfx } from './sfx';
import { inCone, meleeHits, type MeleeCone } from '../logic/melee';

const DEFLECT_PADDING = 6;
const SLASH_COLOR = 0xffe27a;

export interface MeleeOptions {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  shots: EnemyProjectiles;
  /** Player bolt pool, used for the golden sword's slash wave. */
  projectiles: Phaser.Physics.Arcade.Group;
  isSolid: (x: number, y: number) => boolean;
}

/** Resolves sword swings: one cone test per swing hurts each enemy once, swats enemy bolts out of the air and draws the slash. */
export class MeleeSystem {
  constructor(private readonly o: MeleeOptions) {
    o.player.meleeHandler = (x, y, aim, weapon) => this.swing(x, y, aim, weapon);
  }

  private swing(x: number, y: number, aim: number, weapon: WeaponDef): void {
    const melee = weapon.melee;
    if (!melee) return;
    const { player, scene } = this.o;
    const origin = { x, y };
    const cone: MeleeCone = { arc: melee.arc, reach: melee.reach };
    const targets = (this.o.enemies.getChildren() as Enemy[]).filter((e) => e.active && e.alive && e.targetable && lineClear(origin, e, this.o.isSolid));
    const hits = meleeHits(origin, aim, cone, targets.map((e) => ({ x: e.x, y: e.y, reach: e.displayWidth / 2 })));
    for (const index of hits) {
      const enemy = targets[index]!;
      const raw = damageToEnemy(weapon.baseDamage, player.level, enemy.level, player.stats.damageMultiplier);
      enemy.takeHit(raw * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1), enemy.x - x, enemy.y - y, melee.knockback);
    }
    const deflected = this.deflect(origin, aim, { ...cone, reach: cone.reach + DEFLECT_PADDING });
    this.slash(x, y, aim, melee.arc, melee.reach, melee.swingMs);
    if (weapon.activeTwist === 'wave') this.sendWave(x, y, aim, weapon, hits.map((i) => targets[i]));
    playSfx(scene, 'swing');
    if (hits.length > 0) {
      playSfx(scene, 'swordHit');
      feel.shake(70, 0.003);
      feel.hitStop(45);
    } else if (deflected) playSfx(scene, 'swordHit', { rate: 1.4, volume: 0.7 });
  }

  /** Level 5 twist: a short slash wave flies on from the swing, hurting what it reaches once. */
  private sendWave(x: number, y: number, aim: number, weapon: WeaponDef, alreadyHit: readonly unknown[]): void {
    const direction = new Phaser.Math.Vector2(Math.cos(aim), Math.sin(aim));
    const wave: WeaponDef = { ...weapon, kind: 'ranged', speed: WAVE.speed, range: WAVE.range, activeTwist: undefined };
    fireProjectile(this.o.projectiles, x + direction.x * 14, y + direction.y * 14, direction, wave, {
      damageScale: WAVE.damageScale,
      pierce: Infinity,
      skip: alreadyHit,
      scale: { x: 2.6, y: 1.6 },
    });
  }

  private deflect(origin: { x: number; y: number }, aim: number, cone: MeleeCone): boolean {
    let any = false;
    for (const bolt of this.o.shots.group.getChildren() as EnemyProjectile[]) {
      if (!bolt.active || !inCone(origin, aim, cone, bolt) || !lineClear(origin, bolt, this.o.isSolid)) continue;
      bolt.kill();
      any = true;
      const spark = this.o.scene.add.circle(bolt.x, bolt.y, 5, SLASH_COLOR, 0.9).setDepth(9);
      this.o.scene.tweens.add({ targets: spark, scale: 2.2, alpha: 0, duration: 180, onComplete: () => spark.destroy() });
    }
    return any;
  }

  /** A gold crescent wedge sweeping through the arc and fading. */
  private slash(x: number, y: number, aim: number, arc: number, reach: number, swingMs: number): void {
    const g = this.o.scene.add.graphics({ x, y }).setDepth(9);
    const radius = reach + 6;
    g.fillStyle(SLASH_COLOR, 0.35).slice(0, 0, radius, aim - arc / 2, aim + arc / 2, false).fillPath();
    g.lineStyle(2, 0xffffff, 0.9).beginPath().arc(0, 0, radius, aim - arc / 2, aim + arc / 2, false).strokePath();
    this.o.scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.12, scaleY: 1.12, duration: swingMs + 60, onComplete: () => g.destroy() });
  }
}
