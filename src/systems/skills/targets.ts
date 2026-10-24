import type Phaser from 'phaser';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../../debug';
import type { Enemy } from '../../entities/Enemy';
import { damageToEnemy } from '../../logic/combat';
import type { BlastTarget } from '../../logic/fireball';
import { novaVictims } from '../../logic/frostNova';
import { lineClear } from '../../logic/lineOfSight';
import { feel } from '../feel';
import type { SkillWorld } from './types';

export const liveEnemies = (group: Phaser.Physics.Arcade.Group): Enemy[] =>
  (group.getChildren() as Enemy[]).filter((e) => e.active && e.alive && e.targetable);

export const asTargets = (enemies: readonly Enemy[]): BlastTarget[] => enemies.map((e) => ({ x: e.x, y: e.y, reach: e.displayWidth / 2 }));

/** Applies skill damage (scaled by the level gap and the player's damage bonuses) to an enemy, knocking it away from (fromX, fromY). */
export function hurtEnemy(world: SkillWorld, enemy: Enemy, baseDamage: number, fromX: number, fromY: number, multiplier = 1, knockback = 1): void {
  const { player } = world;
  const raw = damageToEnemy(baseDamage, player.level, enemy.level, player.stats.damageMultiplier);
  const damage = Math.max(1, Math.round(raw * multiplier)) * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1);
  enemy.takeHit(damage, enemy.x - fromX, enemy.y - fromY, knockback);
}

/** Damage-over-time tick (poison, burning ground, static): scaled like skill damage but never knocks the enemy back. */
export function dotEnemy(world: SkillWorld, enemy: Enemy, baseDamage: number, css?: string, tint?: number): void {
  const { player } = world;
  const raw = damageToEnemy(baseDamage, player.level, enemy.level, player.stats.damageMultiplier);
  enemy.takeDot(Math.max(1, Math.round(raw)) * (GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1), css, tint);
}

/** Live enemies whose body edge is within `radius` of (x, y) with a clear line from the centre. */
export function enemiesInRadius(world: SkillWorld, x: number, y: number, radius: number): Enemy[] {
  const enemies = liveEnemies(world.enemies);
  const centre = { x, y };
  return novaVictims(centre, radius, asTargets(enemies))
    .map((index) => enemies[index]!)
    .filter((enemy) => lineClear(centre, enemy, world.isSolid));
}

/** The run has ended (death or level complete): lingering skill effects must vanish without dealing damage or granting XP. */
export const runOver = (world: SkillWorld): boolean => world.player.dead || feel.isLocked;
