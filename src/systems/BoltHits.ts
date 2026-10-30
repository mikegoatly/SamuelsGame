import Phaser from 'phaser';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../debug';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { fireProjectile, type Projectile } from '../entities/Projectile';
import { damageToEnemy } from '../logic/combat';
import { SPLIT_DAMAGE_SCALE, SPLIT_RANGE, SPLIT_SPREAD, splitAngles } from '../logic/weaponTwists';
import { fxSplit } from './fx';

/** Player bolts vs enemies: damage once per enemy, pierce through the staff's twist, split into two with the wand's. `afterHit` sees every bolt that dealt damage (the Crystal Scepter's shards). */
export function registerBoltHits(scene: Phaser.Scene, pool: Phaser.Physics.Arcade.Group, enemies: Phaser.Physics.Arcade.Group, player: Player, afterHit?: (bolt: Projectile, enemy: Enemy) => void): void {
  scene.physics.add.overlap(pool, enemies, (boltObj, enemyObj) => {
    const bolt = boltObj as Projectile;
    const enemy = enemyObj as Enemy;
    if (!bolt.active || !enemy.alive || !enemy.targetable) return;
    if (enemy.interceptBolt(bolt)) return;
    const outcome = bolt.hits.register(enemy);
    if (outcome === 'ignore') return;
    const base = bolt.weapon.baseDamage * bolt.damageScale;
    const damage = damageToEnemy(base, player.level, enemy.level, player.stats.damageMultiplier) * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1);
    const { x: vx, y: vy } = bolt.body!.velocity;
    enemy.takeHit(damage, vx, vy, 1, bolt.raises ? 'crescent' : 'basic');
    afterHit?.(bolt, enemy);
    if (outcome === 'last') {
      if (bolt.splits) split(scene, pool, bolt, enemy, Math.atan2(vy, vx));
      bolt.kill();
    }
  });
}

function split(scene: Phaser.Scene, pool: Phaser.Physics.Arcade.Group, bolt: Projectile, enemy: Enemy, angle: number): void {
  for (const a of splitAngles(angle, SPLIT_SPREAD)) {
    const direction = new Phaser.Math.Vector2(Math.cos(a), Math.sin(a));
    fireProjectile(pool, bolt.x, bolt.y, direction, bolt.weapon, { damageScale: SPLIT_DAMAGE_SCALE, range: SPLIT_RANGE, child: true, skip: [enemy] });
  }
  fxSplit(scene, bolt.x, bolt.y);
}
