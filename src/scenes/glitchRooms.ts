import type Phaser from 'phaser';
import { SEWER_TINT } from '../content/sewerFrames';
import { TILE_SIZE } from '../content/assetKeys';
import { lookIndexAt, type LookId } from '../logic/map/roomLooks';
import type { LevelObjects } from '../logic/tiledObjects';

interface RoomTint {
  ground: number | null;
  walls: number | null;
}

/** The tint each borrowed look gets in a mixed map (the real levels' colours; the palace has no purple floor copy here, so its floor is tinted, and the mines' deep blue is lightened so monsters stay readable). */
const ROOM_TINT: Record<LookId, RoomTint> = {
  ruins: { ground: 0xc8d0c0, walls: 0xc8d0c0 },
  desert: { ground: 0xfff0d0, walls: 0xe6c48c },
  palace: { ground: 0xb8a4f0, walls: 0xc4c8d8 },
  sewer: { ground: SEWER_TINT.ground, walls: SEWER_TINT.walls },
  mines: { ground: 0xa8b4f0, walls: 0x8c88c8 },
};

/** Tints each combat room's floor and walls like the level it borrows; corridors, the start room and the boss arena keep the plain tiles. */
export function tintGlitchRooms(ground: Phaser.Tilemaps.TilemapLayer, walls: Phaser.Tilemaps.TilemapLayer, world: LevelObjects): void {
  const rects = world.rooms.map((r) => ({ x: r.rect.x / TILE_SIZE, y: r.rect.y / TILE_SIZE, w: r.rect.w / TILE_SIZE, h: r.rect.h / TILE_SIZE }));
  const paint = (layer: Phaser.Tilemaps.TilemapLayer, key: keyof RoomTint): void =>
    void layer.forEachTile((tile) => {
      const look = world.rooms[lookIndexAt(rects, tile.x, tile.y)]?.look as LookId | undefined;
      const tint = look ? ROOM_TINT[look]?.[key] : null;
      if (tint) tile.tint = tint;
    });
  paint(ground, 'ground');
  paint(walls, 'walls');
}
