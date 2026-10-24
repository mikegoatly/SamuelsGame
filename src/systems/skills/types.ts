import type Phaser from 'phaser';
import type { SkillDef } from '../../content/skills';
import type { EnemyProjectiles } from '../../entities/EnemyProjectile';
import type { Player } from '../../entities/Player';
import type { GameClock } from '../GameClock';

export interface SkillWorld {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  shots: EnemyProjectiles;
  clock: GameClock;
  isSolid: (x: number, y: number) => boolean;
}

export interface CastCall<S extends SkillDef> {
  skill: S;
  params: S['params'][number];
  level: number;
  /** Where the effect starts: the centre of the player. */
  x: number;
  y: number;
  aim: Phaser.Math.Vector2;
}

export interface SkillCaster<S extends SkillDef> {
  /** False when nothing happened (no target, blocked), so no cooldown is spent. */
  cast(call: CastCall<S>): boolean;
}
