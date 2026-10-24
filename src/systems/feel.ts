import type Phaser from 'phaser';
import { HitStopGate, ShakeBudget } from '../logic/feel';
import type { GameClock } from './GameClock';

/** Game-feel helpers bound to the running GameScene: budgeted camera shake and short freeze frames. */
class Feel {
  private readonly budget = new ShakeBudget();
  private readonly gate = new HitStopGate(140);
  private scene?: Phaser.Scene;
  private clock?: GameClock;
  private locked = false;
  private frozen = false;

  get reduced(): boolean {
    return this.budget.reduced;
  }

  setReduced(reduced: boolean): void {
    this.budget.reduced = reduced;
  }

  bind(scene: Phaser.Scene, clock: GameClock): void {
    this.thaw();
    this.scene = scene;
    this.clock = clock;
    this.locked = false;
    this.budget.reset();
    this.gate.reset();
    scene.events.once('shutdown', () => {
      if (this.scene !== scene) return;
      this.thaw();
      this.scene = undefined;
      this.clock = undefined;
    });
  }

  /** The run is ending (physics paused for good): no more freeze frames. */
  lock(): void {
    this.locked = true;
    this.thaw();
  }

  shake(ms: number, intensity: number): void {
    const scene = this.scene;
    const request = scene && this.budget.request(scene.time.now, ms, intensity);
    if (scene && request) scene.cameras.main.shake(request.ms, request.intensity, true);
  }

  /** Quick white camera flash (skipped when reducing flashes). */
  flash(ms: number): void {
    if (!this.reduced) this.scene?.cameras.main.flash(ms, 255, 255, 255, true);
  }

  /** Freezes physics, tweens and the game clock (so cooldowns and AI timers too) for a few ms. */
  hitStop(ms = 40): void {
    const scene = this.scene;
    if (!scene || !this.clock || this.locked || this.frozen) return;
    const freeze = this.gate.take(scene.time.now, ms);
    if (freeze <= 0) return;
    this.frozen = true;
    this.clock.frozen = true;
    scene.physics.world.pause();
    scene.tweens.timeScale = 0;
    scene.time.delayedCall(freeze, () => this.thaw());
  }

  /** Ends any freeze frame now (used before pausing for a modal). */
  thaw(): void {
    if (!this.frozen) return;
    this.frozen = false;
    if (this.clock) this.clock.frozen = false;
    const scene = this.scene;
    if (!scene) return;
    scene.tweens.timeScale = 1;
    if (!this.locked) scene.physics.world?.resume();
  }
}

export const feel = new Feel();
