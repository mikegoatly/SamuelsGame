import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { RogueFrame, SEWER_TINT } from '../content/sewerFrames';
import type { DecorSpec } from '../logic/tiledObjects';

const FRAME_MS = 240;

/** Cycles the sludge tiles through their four variants, each tile a step apart so the surface shimmers and drifts instead of blinking in unison. */
export function animateSludge(scene: Phaser.Scene, layer: Phaser.Tilemaps.TilemapLayer, firstGid: number): void {
  const frames = RogueFrame.sludge.map((f) => firstGid + f);
  const tiles: { tile: Phaser.Tilemaps.Tile; phase: number }[] = [];
  layer.forEachTile((tile) => {
    if (frames.includes(tile.index)) tiles.push({ tile, phase: Math.abs((tile.x * 73856093) ^ (tile.y * 19349663)) % frames.length });
  });
  let step = 0;
  const timer = scene.time.addEvent({
    delay: FRAME_MS,
    loop: true,
    callback: () => {
      step++;
      for (const { tile, phase } of tiles) tile.index = frames[(phase + step) % frames.length]!;
    },
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => timer.remove());
}

/** Moss, bones, drains and puddles: flat, non-solid decals under every actor. */
export function drawDecor(scene: Phaser.Scene, decor: readonly DecorSpec[]): void {
  const g = scene.add.graphics().setDepth(0.3);
  for (const d of decor) {
    if (d.kind === 'moss' || d.kind === 'bones') {
      scene.add.image(d.x, d.y, Tex.rogue, d.frame).setTint(SEWER_TINT.decor).setDepth(0.35);
    } else if (d.kind === 'puddle') {
      g.fillStyle(0x1c3a36, 0.5).fillEllipse(d.x, d.y + 1, 13, 7);
      g.fillStyle(0x7fd0b8, 0.18).fillEllipse(d.x - 1, d.y, 7, 3);
    } else {
      g.fillStyle(0x0d1a1a, 0.9).fillCircle(d.x, d.y, 6);
      g.lineStyle(1, 0x56706c, 1).strokeCircle(d.x, d.y, 6);
      for (let i = -1; i <= 1; i++) g.lineStyle(1, 0x56706c, 1).lineBetween(d.x - 4, d.y + i * 2.5, d.x + 4, d.y + i * 2.5);
    }
  }
}
