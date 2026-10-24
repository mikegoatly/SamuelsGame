import Phaser from 'phaser';
import { playSfx } from './sfx';
import type { Player } from '../entities/Player';
import { rectContains } from '../logic/geometry';
import { SPIKE_CYCLE, spikeDamage, spikeState, spikesHurt, type SpikeState } from '../logic/spikes';
import type { HazardSpec } from '../logic/tiledObjects';
import type { GameClock } from './GameClock';

const BLINK_MS = 110;
const HIT_SLOP = 3;

interface Trap {
  spec: HazardSpec;
  graphics: Phaser.GameObjects.Graphics;
  drawn: string;
}

/** Floor spike traps cycling down / warning / up on the pause-safe game clock; only raised spikes hurt. */
export class SpikeSystem {
  private readonly traps: Trap[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly clock: GameClock,
    specs: readonly HazardSpec[],
  ) {
    this.traps = specs.map((spec) => ({ spec, graphics: scene.add.graphics().setDepth(0.6), drawn: '' }));
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
    this.update();
  }

  private update(): void {
    const now = this.clock.now;
    for (const trap of this.traps) {
      const state = spikeState(now, { ...SPIKE_CYCLE, offsetMs: trap.spec.offsetMs ?? 0 });
      this.draw(trap, state, state === 'warn' && Math.floor(now / BLINK_MS) % 2 === 0);
      if (spikesHurt(state) && !this.player.dead && this.touching(trap)) {
        const { x, y, w, h } = trap.spec.rect;
        if (this.player.takeDamage(spikeDamage(this.player.maxHp), x + w / 2, y + h / 2) === 'hurt') playSfx(this.scene, 'hurt', { rate: 1.4, volume: 0.6 });
      }
    }
  }

  private touching(trap: Trap): boolean {
    const { x, y, w, h } = trap.spec.rect;
    return rectContains({ x: x - HIT_SLOP, y: y - HIT_SLOP, w: w + 2 * HIT_SLOP, h: h + 2 * HIT_SLOP }, this.player);
  }

  private draw(trap: Trap, state: SpikeState, blink: boolean): void {
    const key = `${state}${blink}`;
    if (trap.drawn === key) return;
    trap.drawn = key;
    const { x, y, w, h } = trap.spec.rect;
    const g = trap.graphics.clear();
    g.fillStyle(0x1c1a28, 0.9).fillRect(x, y, w, h);
    g.lineStyle(1, state === 'warn' && blink ? 0xff4a4a : 0x4a4660, 1).strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    for (let px = x + 4; px < x + w - 2; px += 8) {
      for (let py = y + 4; py < y + h - 2; py += 8) this.drawSpike(g, px, py, state, blink);
    }
  }

  private drawSpike(g: Phaser.GameObjects.Graphics, x: number, y: number, state: SpikeState, blink: boolean): void {
    if (state === 'down') {
      g.fillStyle(0x08070c, 1).fillCircle(x, y, 1.6);
    } else if (state === 'warn') {
      g.fillStyle(blink ? 0xff6a5a : 0xb8b8c8, 1).fillTriangle(x - 1.5, y + 1, x + 1.5, y + 1, x, y - 2);
    } else {
      g.fillStyle(0xe8e8f4, 1).fillTriangle(x - 3, y + 3, x + 3, y + 3, x, y - 5);
      g.fillStyle(0xff5a4a, 1).fillRect(x - 0.5, y - 5, 1, 2);
    }
  }
}
