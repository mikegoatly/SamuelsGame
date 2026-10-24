import Phaser from 'phaser';
import { Frame, TILE_SIZE, Tex } from '../content/assetKeys';
import type { Environment, LevelConfig } from '../content/levels';
import type { Rect } from '../logic/geometry';
import type { LevelObjects } from '../logic/tiledObjects';
import type { DoorLayer } from '../systems/DoorLayer';
import { buildTiledMap } from './TiledMapBuilder';

export const ROOM_COLS = 40;
export const ROOM_ROWS = 25;

export function generateRoom(cols = ROOM_COLS, rows = ROOM_ROWS): number[][] {
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const isEdge = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      return isEdge ? Frame.wall : floorVariant(x, y);
    }),
  );
}

function floorVariant(x: number, y: number): number {
  const roll = Math.abs((x * 73856093) ^ (y * 19349663)) % 50;
  if (roll === 0) return Frame.floorRubble;
  if (roll === 1) return Frame.floorPebbles;
  return Frame.floor;
}

export function buildRoom(scene: Phaser.Scene): Phaser.Tilemaps.TilemapLayer {
  const map = scene.make.tilemap({ data: generateRoom(), tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
  const tileset = map.addTilesetImage('tiles', Tex.tiles, TILE_SIZE, TILE_SIZE, 0, 0)!;
  const layer = map.createLayer(0, tileset, 0, 0)!;
  layer.setCollision([Frame.wall]);
  return layer;
}

export interface LevelMap {
  walls: Phaser.Tilemaps.TilemapLayer;
  playerStart: { x: number; y: number };
  /** Extra solid layers (closed doors) that block movement and bolts. */
  solid: Phaser.Tilemaps.TilemapLayer[];
  /** Present for Tiled levels: rooms, doors, boss arena, exit. */
  world?: LevelObjects;
  doors?: DoorLayer;
  /** Quicksand patches in world px. */
  slowZones: Rect[];
}

export interface EnvironmentTint {
  ground: number | null;
  walls: number | null;
}

const uniform = (tint: number | null): EnvironmentTint => ({ ground: tint, walls: tint });

export const ENVIRONMENT_TINT: Record<Environment, EnvironmentTint> = {
  arena: uniform(null),
  ruins: uniform(0xc8d0c0),
  desert: { ground: 0xfff0d0, walls: 0xe6c48c },
  palace: uniform(0xb8a0ff),
};

/** Levels with a loaded `mapKey` build from their Tiled map, everything else uses the generated room. */
export function buildLevelMap(scene: Phaser.Scene, level: LevelConfig): LevelMap {
  if (level.mapKey && scene.cache.tilemap.exists(level.mapKey)) return buildTiledMap(scene, level);
  const walls = buildRoom(scene);
  const { walls: tint } = ENVIRONMENT_TINT[level.environment];
  if (tint !== null) walls.setTint(tint);
  return { walls, solid: [], slowZones: [], playerStart: { x: (ROOM_COLS * TILE_SIZE) / 2, y: (ROOM_ROWS * TILE_SIZE) / 2 } };
}
