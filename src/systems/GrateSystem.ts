import Phaser from 'phaser';
import { Grate } from '../entities/Grate';
import type { Player } from '../entities/Player';
import type { Point } from '../logic/geometry';
import { cycleIndex, eyeState, EYE_CYCLE_MS } from '../logic/grateEyes';
import { StepOnTrigger } from '../logic/stepOn';
import { feel } from './feel';
import type { GameClock } from './GameClock';
import { mistPuff } from './fx';
import { playSfx } from './sfx';

const TOUCH_RADIUS = 12;
const DRIP_MS = 3700;
const MIST_MS = 2300;

interface Entry {
  grate: Grate;
  trigger: StepOnTrigger;
  offsetMs: number;
  drip: number;
  mist: number;
}

/** Sewer grates in desert side rooms: eyes blink, water drips, mist rises. Stepping on one calls `onStep` (once per visit) when `canOpen` allows it, i.e. nothing else has the game paused. */
export class GrateSystem {
  private readonly entries: Entry[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly clock: GameClock,
    points: readonly Point[],
    private readonly canOpen: () => boolean,
    private readonly onStep: () => void,
  ) {
    this.entries = points.map(({ x, y }) => {
      const offsetMs = Math.abs((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663)) % EYE_CYCLE_MS;
      const now = clock.now;
      return { grate: new Grate(scene, x, y), trigger: new StepOnTrigger(), offsetMs, drip: cycleIndex(now, DRIP_MS, offsetMs), mist: cycleIndex(now, MIST_MS, offsetMs) };
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private update(): void {
    const now = this.clock.now;
    const open = !feel.isLocked && !this.player.dead && this.canOpen();
    for (const entry of this.entries) {
      const { grate } = entry;
      grate.setEyes(feel.reduced ? 'open' : eyeState(now, entry.offsetMs));
      this.ambience(entry, now);
      const inside = Phaser.Math.Distance.Between(this.player.x, this.player.y, grate.x, grate.y) < TOUCH_RADIUS;
      if (entry.trigger.step(inside, open)) this.onStep();
    }
  }

  private ambience(entry: Entry, now: number): void {
    const drip = cycleIndex(now, DRIP_MS, entry.offsetMs);
    if (drip !== entry.drip) {
      entry.drip = drip;
      if (this.nearPlayer(entry.grate)) playSfx(this.scene, 'drip');
    }
    const mist = cycleIndex(now, MIST_MS, entry.offsetMs);
    if (mist !== entry.mist) {
      entry.mist = mist;
      mistPuff(this.scene, entry.grate.x, entry.grate.y, feel.reduced ? 1 : 3);
    }
  }

  private nearPlayer(grate: Grate): boolean {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, grate.x, grate.y) < 320;
  }
}
