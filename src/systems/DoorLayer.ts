import Phaser from 'phaser';
import { TILE_SIZE } from '../content/assetKeys';
import type { DoorSpec } from '../logic/tiledObjects';

/** Door tiles live on a blank solid layer: closing a room puts tiles on its door cells, opening removes them. */
export class DoorLayer {
  constructor(
    private readonly layer: Phaser.Tilemaps.TilemapLayer,
    private readonly doors: readonly DoorSpec[],
    private readonly closedIndex: number,
  ) {
    layer.setCollision(closedIndex);
  }

  close(room: number): void {
    this.forCells(room, (x, y) => this.layer.putTileAt(this.closedIndex, x, y));
  }

  open(room: number): void {
    this.forCells(room, (x, y) => this.layer.removeTileAt(x, y, true, true));
  }

  private forCells(room: number, action: (x: number, y: number) => void): void {
    for (const { rect } of this.doors.filter((d) => d.room === room)) {
      for (let y = rect.y / TILE_SIZE; y < (rect.y + rect.h) / TILE_SIZE; y++) {
        for (let x = rect.x / TILE_SIZE; x < (rect.x + rect.w) / TILE_SIZE; x++) action(x, y);
      }
    }
  }
}
