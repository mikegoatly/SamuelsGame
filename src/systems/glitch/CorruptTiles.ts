import Phaser from 'phaser';
import { GlitchFrame, TILE_SIZE, Tex } from '../../content/assetKeys';
import { corruptCount, pickCorruptCells } from '../../logic/glitchTiles';
import { feel } from '../feel';

const LIFE_MS = 1400;
const LIFE_MS_REDUCED = 2000;
const FADE_IN_MS = 400;
const DEPTH = 1;

interface Patch {
  image: Phaser.GameObjects.Image;
  bornAt: number;
  life: number;
}

/** Magenta checker patches that appear on a few random floor tiles when a burst starts and fade away (fading in too, instead of popping, when flashes are reduced). Never on walls or under the hero. All timing on the GameClock. */
export class CorruptTiles {
  private readonly patches: Patch[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly rng: () => number,
    private readonly isSolid: (x: number, y: number) => boolean,
    private readonly player: { x: number; y: number },
  ) {}

  burst(now: number): void {
    const view = this.scene.cameras.main.worldView;
    const map = this.scene.physics.world.bounds;
    const range = {
      x0: Math.floor(Math.max(view.x, map.x) / TILE_SIZE),
      y0: Math.floor(Math.max(view.y, map.y) / TILE_SIZE),
      x1: Math.ceil(Math.min(view.right, map.right) / TILE_SIZE) - 1,
      y1: Math.ceil(Math.min(view.bottom, map.bottom) / TILE_SIZE) - 1,
    };
    const reduced = feel.reduced;
    const player = { cx: Math.floor(this.player.x / TILE_SIZE), cy: Math.floor(this.player.y / TILE_SIZE) };
    const isFloor = (cx: number, cy: number): boolean => !this.isSolid(cx * TILE_SIZE + TILE_SIZE / 2, cy * TILE_SIZE + TILE_SIZE / 2);
    for (const cell of pickCorruptCells(corruptCount(this.rng, reduced), range, this.rng, isFloor, player)) {
      const image = this.scene.add
        .image(cell.cx * TILE_SIZE + TILE_SIZE / 2, cell.cy * TILE_SIZE + TILE_SIZE / 2, Tex.glitch, this.rng() < 0.5 ? GlitchFrame.missingTexture : GlitchFrame.corruptTile)
        .setDepth(DEPTH)
        .setAlpha(reduced ? 0 : 0.85);
      this.patches.push({ image, bornAt: now, life: reduced ? LIFE_MS_REDUCED : LIFE_MS });
    }
  }

  update(now: number): void {
    const reduced = feel.reduced;
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const { image, bornAt, life } = this.patches[i]!;
      const age = now - bornAt;
      if (age >= life) {
        image.destroy();
        this.patches.splice(i, 1);
        continue;
      }
      const fadeOut = 1 - age / life;
      const fadeIn = reduced ? Math.min(1, age / FADE_IN_MS) : 1;
      image.setAlpha(0.85 * fadeOut * fadeIn);
    }
  }

  destroy(): void {
    for (const { image } of this.patches) image.destroy();
    this.patches.length = 0;
  }
}
