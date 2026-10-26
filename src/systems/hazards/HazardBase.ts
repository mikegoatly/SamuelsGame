import type Phaser from 'phaser';
import type { Rect } from '../../logic/geometry';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import type { Hazard, HazardWorld } from './types';

/** Shared lifecycle: a depth-sorted Graphics, an on/off switch and a draw of the resting look. Subclasses draw and act in `tick`. */
export abstract class HazardBase implements Hazard {
  protected live = false;
  protected readonly g: Phaser.GameObjects.Graphics;

  constructor(
    protected readonly world: HazardWorld,
    protected readonly spec: ActiveHazardSpec,
    depth = 0.6,
  ) {
    this.g = world.scene.add.graphics().setDepth(depth);
  }

  get room(): number {
    return this.spec.room;
  }

  protected get rect(): Rect {
    return this.spec.rect;
  }

  protected get offset(): number {
    return this.spec.offsetMs;
  }

  activate(): void {
    this.live = true;
  }

  calm(): void {
    this.live = false;
    this.rest();
  }

  halt(): void {
    this.calm();
  }

  update(now: number, dtMs: number): void {
    if (this.live) this.tick(now, dtMs);
  }

  destroy(): void {
    this.g.destroy();
  }

  /** Draws the dormant or calm look. */
  protected abstract rest(): void;
  protected abstract tick(now: number, dtMs: number): void;
}
