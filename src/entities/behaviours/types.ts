import type Phaser from 'phaser';
import type { Affix } from '../../logic/elites';
import type { Rect } from '../../logic/geometry';
import type { Graveyard } from '../../logic/graveyard';
import type { Enemy } from '../Enemy';
import type { Projectile } from '../Projectile';

export interface SpawnOptions {
  affix?: Affix;
  /** Raised from a corpse: never raised again. */
  raised?: boolean;
  /** Overrides max health (split halves). */
  hp?: number;
  /** Multiplies the sprite scale. */
  scale?: number;
}

/** What monsters can ask of the level they are in. */
export interface EnemyWorld {
  /** Every living monster. */
  all(): Enemy[];
  spawn(enemyId: string, level: number, x: number, y: number, options?: SpawnOptions): Enemy;
  readonly graveyard: Graveyard;
  /** `p` when a monster fits there, else a free spot close by (off walls and hazards); `p` when none is found. */
  clearSpot(p: { x: number; y: number }): { x: number; y: number };
  /** The player's bolt pool (whirlwinds bend these). */
  readonly bolts?: Phaser.Physics.Arcade.Group;
  /** Sludge channels (world px) in the current room, where sewer gators hide; unset or empty on levels without any. */
  channels?: () => readonly Rect[];
}

/** One monster's own AI. `Enemy` handles the shared parts (health, hits, knockback, loot) and hands everything else to this. */
export interface Behaviour {
  /** Runs each frame the monster is free to act. */
  act(time: number): void;
  /** True while the monster passes through the player and other monsters (a shark under the sand) but still hits walls. */
  readonly phased?: boolean;
  /** Runs every frame, even while stunned or knocked back. */
  update?(time: number, delta: number): void;
  /** True while bolts and blasts must pass through (burrowed, dormant). */
  readonly untargetable?: boolean;
  /** True while the monster must not stop a room from clearing (dormant statues, fleeing hounds). */
  readonly ignoredForClear?: boolean;
  /** Wakes a dormant monster. */
  wake?(): void;
  /** Return true when the bolt was handled (mirrored away). */
  intercept?(bolt: Projectile): boolean;
  onDeath?(): void;
  destroy?(): void;
}

export type BehaviourFactory = (host: Enemy, world: EnemyWorld) => Behaviour;
