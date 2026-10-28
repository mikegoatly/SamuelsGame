import Phaser from 'phaser';
import type { LevelConfig } from '../content/levels';
import { buildRandomMap } from '../logic/map';
import type { RunMap } from '../logic/runSeed';

/** Puts a random map for this run into Phaser's tilemap cache (replacing the last one) and returns its key; classic runs return the level's own key. */
const runKey = (level: LevelConfig): string => `${level.mapKey}-run`;

export function installRunMap(scene: Phaser.Scene, level: LevelConfig, run: RunMap): string | undefined {
  if (run.classic || !level.mapKey) return level.mapKey;
  const key = runKey(level);
  const cache = scene.cache.tilemap;
  if (cache.exists(key)) cache.remove(key);
  cache.add(key, { format: Phaser.Tilemaps.Formats.TILED_JSON, data: buildRandomMap(level.id, run.seed, run.side) });
  return key;
}

export function removeRunMap(scene: Phaser.Scene, level: LevelConfig): void {
  if (level.mapKey && scene.cache.tilemap.exists(runKey(level))) scene.cache.tilemap.remove(runKey(level));
}
