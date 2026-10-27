import type Phaser from 'phaser';
import { PERF_OVERLAY } from '../debug';
import type { EnemyProjectiles } from '../entities/EnemyProjectile';
import type { EnemyFactory } from './EnemyFactory';

export interface PerfSample {
  fps: number;
  alive: number;
  projectiles: number;
  tweens: number;
}

/** Dev builds with `?debug=perf`: a corner readout of FPS, alive monsters, bolts and tweens; also `window.__perf()` for scripted measurements. */
export function exposePerfOverlay(scene: Phaser.Scene, factory: EnemyFactory, projectiles: Phaser.Physics.Arcade.Group, shots: EnemyProjectiles): void {
  if (!import.meta.env.DEV || !PERF_OVERLAY) return;
  const sample = (): PerfSample => ({
    fps: Math.round(scene.game.loop.actualFps),
    alive: factory.living().length,
    projectiles: projectiles.countActive(true) + shots.group.countActive(true),
    tweens: scene.tweens.getTweens().length,
  });
  let last: PerfSample | undefined;
  const safeSample = (): PerfSample | undefined => {
    try {
      return (last = sample());
    } catch {
      return last;
    }
  };
  (window as unknown as { __perf: unknown }).__perf = safeSample;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:9999;padding:4px 6px;background:#000a;color:#7dffb0;font:12px monospace;pointer-events:none;white-space:pre';
  document.body.appendChild(box);
  const timer = window.setInterval(() => {
    const s = safeSample();
    if (s) box.textContent = `FPS ${s.fps}\nalive ${s.alive}\nbolts ${s.projectiles}\ntweens ${s.tweens}`;
  }, 500);
  scene.events.once('shutdown', () => {
    window.clearInterval(timer);
    box.remove();
  });
}
