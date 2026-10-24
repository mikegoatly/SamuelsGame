import Phaser from 'phaser';
import { Tex } from '../../content/assetKeys';
import type { Point } from '../../logic/geometry';

/** Expanding outline that fades, for novas and shield breaks. */
export function ringBurst(scene: Phaser.Scene, x: number, y: number, radius: number, color: number, ms = 360): void {
  const ring = scene.add.circle(x, y, radius, color, 0.12).setStrokeStyle(2, color, 0.95).setDepth(9).setScale(0.15);
  scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
}

/** A burst of tinted sparks. */
export function sparkBurst(scene: Phaser.Scene, x: number, y: number, color: number, count = 8, speed = 70): void {
  const emitter = scene.add.particles(x, y, Tex.puff, {
    speed: { min: speed * 0.3, max: speed },
    lifespan: 380,
    scale: { start: 1, end: 0 },
    tint: color,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  emitter.setDepth(10).explode(count);
  scene.time.delayedCall(500, () => emitter.destroy());
}

const SEGMENT = 9;
const JITTER = 4;

/** Jagged polyline through `points`, drawn once and faded out. */
export function lightningBolt(scene: Phaser.Scene, points: readonly Point[], color: number, ms = 220): void {
  const g = scene.add.graphics().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
  const path: Point[] = [];
  points.forEach((point, i) => {
    const previous = points[i - 1];
    if (!previous) {
      path.push(point);
      return;
    }
    const length = Math.hypot(point.x - previous.x, point.y - previous.y);
    const pieces = Math.max(2, Math.round(length / SEGMENT));
    const nx = -(point.y - previous.y) / (length || 1);
    const ny = (point.x - previous.x) / (length || 1);
    for (let p = 1; p < pieces; p++) {
      const t = p / pieces;
      const offset = (Math.random() * 2 - 1) * JITTER;
      path.push({ x: previous.x + (point.x - previous.x) * t + nx * offset, y: previous.y + (point.y - previous.y) * t + ny * offset });
    }
    path.push(point);
  });
  for (const [width, tint, alpha] of [[5, color, 0.35], [2, 0xffffff, 1]] as const) {
    g.lineStyle(width, tint, alpha).beginPath().moveTo(path[0]!.x, path[0]!.y);
    for (const p of path.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: ms, onComplete: () => g.destroy() });
}
