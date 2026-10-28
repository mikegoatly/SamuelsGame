import { Tex } from '../../content/assetKeys';
import type Phaser from 'phaser';
import { feel } from '../feel';
import { PIPE_FRAME, SEWER_TINT } from '../../content/sewerFrames';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { GasVent } from './GasVent';
import type { Hazard, HazardWorld } from './types';

/** A sewer pipe in the wall (Tiny Dungeon spout) that hisses, then breathes the same green cloud as a floor vent into the room. */
export class GasPipe extends GasVent {
  private readonly pipe;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec);
    const { pipeX = this.centre.x, pipeY = this.centre.y, dir = 90 } = spec.params;
    this.pipe = world.scene.add.image(pipeX, pipeY, Tex.tiles, dir === 90 ? PIPE_FRAME.drip : PIPE_FRAME.plain).setTint(SEWER_TINT.pipe).setDepth(0.65);
  }

  /** Bright, thick and filled so it reads on the teal floor: a lime disc growing to the cloud's size inside a white-lime ring (steady when flashes are reduced). */
  protected override warnRing(g: Phaser.GameObjects.Graphics, x: number, y: number, warn: number): void {
    const bright = feel.reduced || Math.floor(warn * 8) % 2 === 0;
    const r = this.radius * (0.55 + 0.45 * warn);
    g.fillStyle(0xd8ff5a, 0.12 + 0.2 * warn).fillCircle(x, y, r);
    g.lineStyle(4, bright ? 0xfaffb0 : 0xa8e030, 1).strokeCircle(x, y, r);
    g.lineStyle(2, 0x2a3a08, 0.9).strokeCircle(x, y, this.radius);
  }

  protected override drawSource(): void {
    // The wall sprite is the source; no grate on the floor.
  }

  override destroy(): void {
    this.pipe.destroy();
    super.destroy();
  }
}

export const gasPipe = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new GasPipe(world, spec);
