import Phaser from 'phaser';
import { Frame, TILE_SIZE, Tex } from '../content/assetKeys';
import type { LevelConfig } from '../content/levels';
import { parseLevelObjects, type TiledMapLike } from '../logic/tiledObjects';
import { DoorLayer } from '../systems/DoorLayer';
import { ENVIRONMENT_TINT, type LevelMap } from './RoomBuilder';

const TILESET_NAME = 'tiny-dungeon';
const FIRST_GID = 1;

/** Builds ground/walls from the Tiled JSON, adds a blank door layer and parses the `objects` layer. */
export function buildTiledMap(scene: Phaser.Scene, level: LevelConfig): LevelMap {
  const map = scene.make.tilemap({ key: level.mapKey });
  const tileset = map.addTilesetImage(TILESET_NAME, Tex.tiles, TILE_SIZE, TILE_SIZE, 0, 0)!;
  const ground = map.createLayer('ground', tileset, 0, 0)!;
  const walls = map.createLayer('walls', tileset, 0, 0)!;
  walls.setCollisionByExclusion([-1]);
  const doorTiles = map.createBlankLayer('doors', tileset, 0, 0, map.width, map.height)!.setDepth(1);
  const tint = ENVIRONMENT_TINT[level.environment];
  if (tint !== null) for (const layer of [ground, walls, doorTiles]) layer.setTint(tint);

  const world = parseLevelObjects(scene.cache.tilemap.get(level.mapKey!).data as TiledMapLike);
  const doors = new DoorLayer(doorTiles, world.doors, FIRST_GID + Frame.doorClosed);
  return { walls, solid: [doorTiles], playerStart: world.playerStart, world, doors };
}
