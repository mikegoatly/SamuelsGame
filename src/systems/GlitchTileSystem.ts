import Phaser from 'phaser';
import { GlitchFrame, Tex } from '../content/assetKeys';
import type { Player } from '../entities/Player';
import type { Point } from '../logic/geometry';
import { GlitchTileFlicker } from '../logic/glitchFlicker';
import { StepOnTrigger } from '../logic/stepOn';
import { feel } from './feel';
import type { GameClock } from './GameClock';
import { playSfx } from './sfx';

const TOUCH_RADIUS = 9;
const NEAR_RADIUS = 80;
const BUZZ_MS = 1100;

interface Entry {
  tile: Phaser.GameObjects.Image;
  trigger: StepOnTrigger;
  flicker: GlitchTileFlicker;
  buzzAt: number;
}

/** The glitch tile: one floor tile flickering between the missing-texture checker and a normal tile, buzzing quietly when the player is near. Stepping on it calls `onStep` (once per visit) when `canOpen` allows it. */
export class GlitchTileSystem {
  private readonly entries: Entry[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly clock: GameClock,
    points: readonly Point[],
    private readonly canOpen: () => boolean,
    private readonly onStep: () => void,
  ) {
    this.entries = points.map(({ x, y }) => ({
      tile: scene.add.image(x, y, Tex.glitch, GlitchFrame.missingTexture).setDepth(1),
      trigger: new StepOnTrigger(),
      flicker: new GlitchTileFlicker(Math.random),
      buzzAt: 0,
    }));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private update(): void {
    const now = this.clock.now;
    const open = !feel.isLocked && !this.player.dead && this.canOpen();
    for (const entry of this.entries) {
      const { tile } = entry;
      tile.setVisible(entry.flicker.shows(now, feel.reduced));
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, tile.x, tile.y);
      if (distance < NEAR_RADIUS && now >= entry.buzzAt) {
        entry.buzzAt = now + BUZZ_MS;
        playSfx(this.scene, 'beam', { volume: 0.35, rate: 1.6 });
      }
      if (entry.trigger.step(distance < TOUCH_RADIUS, open)) this.onStep();
    }
  }
}
