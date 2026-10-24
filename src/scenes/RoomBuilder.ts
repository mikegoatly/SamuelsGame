import Phaser from 'phaser';
import { Frame, TILE_SIZE, Tex } from '../content/assetKeys';
import type { Environment, LevelConfig } from '../content/levels';

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
}

const ENVIRONMENT_TINT: Record<Environment, number | null> = {
  arena: null,
  ruins: 0xc8d0c0,
  desert: 0xffe6b8,
  palace: 0xb8a0ff,
};

/** Seam for the Tiled maps: levels with a loaded `mapKey` build from it, everything else uses the generated room. */
export function buildLevelMap(scene: Phaser.Scene, level: LevelConfig): LevelMap {
  const walls = buildRoom(scene);
  const tint = ENVIRONMENT_TINT[level.environment];
  if (tint !== null) walls.setTint(tint);
  return { walls, playerStart: { x: (ROOM_COLS * TILE_SIZE) / 2, y: (ROOM_ROWS * TILE_SIZE) / 2 } };
}
