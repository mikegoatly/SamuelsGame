import type { Enemy } from '../../entities/Enemy';
import { hazardDamage } from '../../logic/hazard/victims';
import { liveEnemies } from '../skills/targets';
import { playSfx } from '../sfx';
import type { SfxId } from '../../content/sfxDefs';
import type { HazardWorld } from './types';

export const PLAYER_RADIUS = 6;

/** Enemies a hazard can hurt: alive and targetable, bosses excluded (arenas must never be a boss-killer). */
export const hazardTargets = (world: HazardWorld): Enemy[] => liveEnemies(world.enemies).filter((e) => !e.def.boss);

export const enemyRadius = (enemy: Enemy): number => enemy.displayWidth * 0.3;

export const playerAlive = (world: HazardWorld): boolean => !world.player.dead && !world.player.actionsLocked;

/** A fraction of max HP as 'hazard' damage; `from` sets the knockback direction (pass the player's own spot for none). Returns true when the hit landed (hurt or absorbed), false when i-frames or a dash swallowed it. */
export function hurtPlayer(world: HazardWorld, fraction: number, fromX: number, fromY: number, sfx?: SfxId): boolean {
  const { player, scene } = world;
  const result = player.takeDamage(hazardDamage(player.maxHp, fraction), fromX, fromY, 'hazard');
  if (result === 'none') return false;
  if (sfx && result === 'hurt') playSfx(scene, sfx);
  return true;
}

/** A hit that credits no skill and no passive: fraction of the enemy's max HP, shoved away from (fromX, fromY). */
export function hurtEnemy(enemy: Enemy, fraction: number, fromX: number, fromY: number, knockback = 0.6): void {
  enemy.takeHit(hazardDamage(enemy.maxHp, fraction), enemy.x - fromX, enemy.y - fromY, knockback, 'skill');
}

/** Burning or choking over time: no knockback, never interrupts the enemy. */
export function dotEnemy(enemy: Enemy, fraction: number, css: string, tint: number): void {
  enemy.takeDot(hazardDamage(enemy.maxHp, fraction), css, tint);
}
