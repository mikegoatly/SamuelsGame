import Phaser from 'phaser';
import { PropFrame, Tex } from '../content/assetKeys';
import type { EyeState } from '../logic/grateEyes';

const SCALE = 1.5;
const EYE_FRAMES: Record<Exclude<EyeState, 'shut'>, number> = { open: PropFrame.eyesOpen, narrow: PropFrame.eyesNarrow };

/** A rusty floor grate: a dark pit, eyes glowing under it, then the bars on top. Not solid, so it never blocks a corridor. */
export class Grate {
  readonly x: number;
  readonly y: number;
  private readonly eyes: Phaser.GameObjects.Sprite;
  private shown: EyeState = 'open';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    const layer = (frame: number, depth: number): Phaser.GameObjects.Sprite => scene.add.sprite(x, y, Tex.props, frame).setScale(SCALE).setDepth(depth);
    layer(PropFrame.grateBack, 1);
    this.eyes = layer(PropFrame.eyesOpen, 1.1);
    layer(PropFrame.grateBars, 1.2);
  }

  setEyes(state: EyeState): void {
    if (state === this.shown) return;
    this.shown = state;
    if (state === 'shut') this.eyes.setVisible(false);
    else this.eyes.setVisible(true).setFrame(EYE_FRAMES[state]);
  }
}
