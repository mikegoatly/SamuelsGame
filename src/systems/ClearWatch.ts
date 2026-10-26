import type Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import { clearStatus } from '../logic/clear';
import type { GameEvents } from './GameEvents';

const AFTER_DEATH_MS = 60;
const POLL_MS = 400;
const AFTER_ARM_MS = 600;

/**
 * Decides when a wave is over by looking at who is still alive, so splitters, raised dead, pack members and anything else that
 * joins the fight all count. Dormant statues do not hold the wave up: once only they are left they are woken.
 */
export class ClearWatch {
  private armed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly living: () => Enemy[],
    events: GameEvents,
    private readonly onClear: () => void,
    private readonly onWake: () => void = () => undefined,
  ) {
    events.on('enemy-died', () => this.armed && scene.time.delayedCall(AFTER_DEATH_MS, () => this.check()));
    scene.time.addEvent({ delay: POLL_MS, loop: true, callback: () => this.check() });
  }

  /** A wave has just been spawned. */
  arm(): void {
    this.armed = true;
    this.scene.time.delayedCall(AFTER_ARM_MS, () => this.check());
  }

  stop(): void {
    this.armed = false;
  }

  private check(): void {
    if (!this.armed) return;
    const living = this.living();
    const status = clearStatus(living.filter((e) => e.countsForClear).length, living.filter((e) => e.canWake).length);
    if (status === 'fighting') return;
    if (status === 'wake') {
      for (const enemy of living) if (enemy.canWake) enemy.wake();
      this.onWake();
      return;
    }
    this.armed = false;
    this.onClear();
  }
}
