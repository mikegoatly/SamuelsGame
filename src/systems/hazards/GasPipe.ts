import { Tex } from '../../content/assetKeys';
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

  protected override drawSource(): void {
    // The wall sprite is the source; no grate on the floor.
  }

  override destroy(): void {
    this.pipe.destroy();
    super.destroy();
  }
}

export const gasPipe = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new GasPipe(world, spec);
