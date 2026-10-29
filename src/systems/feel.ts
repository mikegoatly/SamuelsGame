import type Phaser from 'phaser';
import { MINES_TEXTURE } from '../content/minesTint';
import { caveVignetteStrength, coverSize, vignetteAlphaAt } from '../logic/darkness';
import { HitStopGate, ShakeBudget } from '../logic/feel';
import type { GameClock } from './GameClock';

/** A dark radial gradient (clear centre, dark edge) drawn once into a small canvas texture; the image stretches it over the screen. */
function bakeVignette(scene: Phaser.Scene): void {
  const size = 128;
  const canvas = scene.textures.createCanvas(MINES_TEXTURE.dark, size, size)!;
  const ctx = canvas.context;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (let i = 0; i <= 10; i++) gradient.addColorStop(i / 10, `rgba(4,2,16,${vignetteAlphaAt(i / 10)})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

/** Game-feel helpers bound to the running GameScene: budgeted camera shake and short freeze frames. */
class Feel {
  private readonly budget = new ShakeBudget();
  private readonly gate = new HitStopGate(140);
  private scene?: Phaser.Scene;
  private clock?: GameClock;
  private locked = false;
  private frozen = false;

  /** True once the run is ending (level complete or death): skill effects must stop. */
  get isLocked(): boolean {
    return this.locked;
  }

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

  /** Crystal Mines darkness: a pre-baked radial gradient pinned over the view, its alpha breathing slowly (steady and softer when flashes are reduced). Same on every device. */
  cave(): void {
    const scene = this.scene;
    if (!scene) return;
    if (!scene.textures.exists(MINES_TEXTURE.dark)) bakeVignette(scene);
    const image = scene.add.image(0, 0, MINES_TEXTURE.dark).setScrollFactor(0).setDepth(40).setOrigin(0.5);
    const update = (time: number): void => {
      const cam = scene.cameras.main;
      const size = coverSize(cam.width, cam.height, cam.zoom);
      image.setPosition(cam.width / 2, cam.height / 2).setDisplaySize(size.width, size.height).setAlpha(caveVignetteStrength(this.reduced, time));
    };
    update(0);
    scene.events.on('update', update);
    scene.events.once('shutdown', () => scene.events.off('update', update));
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
