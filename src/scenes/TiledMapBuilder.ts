import Phaser from 'phaser';
import { Frame, TILE_SIZE, Tex } from '../content/assetKeys';
import type { LevelConfig } from '../content/levels';
import { rectCenter, type Rect } from '../logic/geometry';
import { parseLevelObjects, type TiledMapLike } from '../logic/tiledObjects';
import { DoorLayer } from '../systems/DoorLayer';
import { ENVIRONMENT_TINT, type LevelMap } from './RoomBuilder';

const TILESET_NAME = 'tiny-dungeon';
const FIRST_GID = 1;

/** Builds ground/walls from the Tiled JSON, adds a blank door layer and parses the `objects` layer. */
export function buildTiledMap(scene: Phaser.Scene, level: LevelConfig, mapKey = level.mapKey!): LevelMap {
  const map = scene.make.tilemap({ key: mapKey });
  const tileset = map.addTilesetImage(TILESET_NAME, Tex.tiles, TILE_SIZE, TILE_SIZE, 0, 0)!;
  const ground = map.createLayer('ground', level.environment === 'palace' ? palaceTileset(scene) : tileset, 0, 0)!;
  const walls = map.createLayer('walls', tileset, 0, 0)!;
  walls.setCollisionByExclusion([-1]);
  const doorTiles = map.createBlankLayer('doors', tileset, 0, 0, map.width, map.height)!.setDepth(1);
  const tint = ENVIRONMENT_TINT[level.environment];
  if (tint.ground !== null) ground.setTint(tint.ground);
  if (tint.checker !== undefined) ground.forEachTile((tile) => void (tile.tint = (tile.x + tile.y) % 2 === 0 ? tint.checker! : tint.ground!));
  if (tint.walls !== null) for (const layer of [walls, doorTiles]) layer.setTint(tint.walls);

  const world = parseLevelObjects(scene.cache.tilemap.get(mapKey).data as TiledMapLike);
  const doors = new DoorLayer(doorTiles, world.doors, FIRST_GID + Frame.doorClosed);
  const slowZones = world.hazards.filter((h) => h.kind === 'quicksand').map((h) => h.rect);
  for (const rect of slowZones) drawQuicksand(scene, rect);
  for (const throne of world.thrones) drawThrone(scene, throne.x, throne.y);
  return { walls, solid: [doorTiles], playerStart: world.playerStart, world, doors, slowZones, spikes: world.hazards.filter((h) => h.kind === 'spikes') };
}

/** Same tile layout as the shared tileset but drawn from the purple-floored copy of the sheet. */
function palaceTileset(scene: Phaser.Scene): Phaser.Tilemaps.Tileset {
  const tileset = new Phaser.Tilemaps.Tileset(TILESET_NAME, FIRST_GID, TILE_SIZE, TILE_SIZE, 0, 0);
  return tileset.setImage(scene.textures.get(Tex.palaceTiles));
}

/** A gilded seat on the floor; the Mad King teleports between these. */
function drawThrone(scene: Phaser.Scene, x: number, y: number): void {
  scene.add.ellipse(x, y + 4, 34, 18, 0xffd060, 0.18).setDepth(0.5);
  scene.add.image(x, y, Tex.tiles, Frame.throne).setScale(1.6).setTint(0xffd060).setDepth(0.7);
}

/** A dark, softly pulsing sand pit; the slowdown itself is pure logic (`logic/hazards`). */
function drawQuicksand(scene: Phaser.Scene, rect: Rect): void {
  const { x, y } = rectCenter(rect);
  const outer = scene.add.ellipse(x, y, rect.w, rect.h, 0x8a6430, 0.55).setDepth(0.5);
  scene.add.ellipse(x, y, rect.w * 0.66, rect.h * 0.62, 0x5e4220, 0.6).setDepth(0.5);
  scene.add.ellipse(x, y, rect.w * 0.3, rect.h * 0.3, 0x3c2a14, 0.6).setDepth(0.5);
  scene.tweens.add({ targets: outer, alpha: 0.35, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}
