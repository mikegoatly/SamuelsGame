import type Phaser from 'phaser';
import type { Player } from '../../entities/Player';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import type { GameClock } from '../GameClock';

export interface HazardWorld {
  scene: Phaser.Scene;
  player: Player;
  enemies: Phaser.Physics.Arcade.Group;
  clock: GameClock;
  isSolid: (x: number, y: number) => boolean;
}

/** One placed hazard. Dormant until its room is entered, calm once the room is cleared, halted for good when the run ends. */
export interface Hazard {
  readonly room: number;
  activate(): void;
  calm(): void;
  halt(): void;
  update(now: number, dtMs: number): void;
  destroy(): void;
}

export type HazardFactory = (world: HazardWorld, spec: ActiveHazardSpec) => Hazard;
