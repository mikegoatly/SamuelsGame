import Phaser from 'phaser';
import type { WeaponDef } from '../content/weapons';
import { fireProjectile } from './Projectile';

export interface WaveShape {
  damageScale: number;
  speed: number;
  range: number;
  scale: { x: number; y: number };
}

/** A slash wave or crescent: a bolt-pool shot that pierces everything, hurts each enemy once and takes no twist of its weapon. Shared by melee waves and the Bone Staff. */
export function sendWave(
  pool: Phaser.Physics.Arcade.Group,
  x: number,
  y: number,
  aim: number,
  weapon: WeaponDef,
  alreadyHit: readonly unknown[],
  shape: WaveShape,
  raises = false,
): void {
  const direction = new Phaser.Math.Vector2(Math.cos(aim), Math.sin(aim));
  const wave: WeaponDef = { ...weapon, kind: 'ranged', speed: shape.speed, range: shape.range, activeTwist: undefined, projectileFrame: undefined };
  fireProjectile(pool, x + direction.x * 14, y + direction.y * 14, direction, wave, {
    damageScale: shape.damageScale,
    pierce: Infinity,
    skip: alreadyHit,
    scale: shape.scale,
    raises,
  });
}
