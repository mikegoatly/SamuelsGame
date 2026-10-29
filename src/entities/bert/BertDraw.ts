import Phaser from 'phaser';
import { bertTuning } from '../../content/bert';
import type { Point } from '../../logic/geometry';

const WARN = 0xff2a2a;
const WARN_EDGE = 0xff5a5a;
const LASER = 0xff5a7a;

type Shape = Phaser.GameObjects.GameObject;

/** A faint ring with a growing fill: where a slam or a landing crystal will hit. */
export function drawWarningRing(scene: Phaser.Scene, x: number, y: number, radius: number, durationMs: number): Shape[] {
  const ring = scene.add.circle(x, y, radius, WARN, 0.14).setStrokeStyle(2, WARN_EDGE, 0.9).setDepth(3);
  const fill = scene.add.circle(x, y, radius, WARN, 0.38).setDepth(3).setScale(0.05);
  scene.tweens.add({ targets: fill, scale: 1, duration: durationMs, ease: 'Quad.easeIn' });
  return [ring, fill];
}

/** The big arrow along the line he is about to roll: a lane that fills up, ending in an arrow head at the wall. */
export function drawRollArrow(scene: Phaser.Scene, from: Point, aim: Point, end: Point, durationMs: number): Shape[] {
  const length = Math.hypot(end.x - from.x, end.y - from.y);
  const angle = Math.atan2(aim.y, aim.x);
  const lane = scene.add.rectangle(from.x + aim.x * (length / 2), from.y + aim.y * (length / 2), length, 14, WARN, 0.18).setRotation(angle).setStrokeStyle(1, WARN_EDGE, 0.9).setDepth(3);
  const fill = scene.add.rectangle(from.x, from.y, 2, 14, WARN, 0.45).setRotation(angle).setOrigin(0, 0.5).setDepth(3);
  scene.tweens.add({ targets: fill, width: length, duration: durationMs, ease: 'Quad.easeIn' });
  const tip = { x: end.x + aim.x * 6, y: end.y + aim.y * 6 };
  const back = { x: end.x - aim.x * 14, y: end.y - aim.y * 14 };
  const side = { x: -aim.y * 12, y: aim.x * 12 };
  const head = scene.add.graphics().setDepth(3);
  head.fillStyle(WARN, 0.85).fillTriangle(tip.x, tip.y, back.x + side.x, back.y + side.y, back.x - side.x, back.y - side.y);
  return [lane, fill, head];
}

const trace = (g: Phaser.GameObjects.Graphics, path: readonly Point[]): void => {
  g.beginPath().moveTo(path[0]!.x, path[0]!.y);
  for (const p of path.slice(1)) g.lineTo(p.x, p.y);
  g.strokePath();
};

/** The thin pulsing line that shows the laser's whole bouncing path before it fires. */
export function drawLaserLine(scene: Phaser.Scene, path: readonly Point[], windupMs: number): Shape[] {
  const line = scene.add.graphics().setDepth(3);
  line.lineStyle(1.5, LASER, 0.9);
  trace(line, path);
  scene.tweens.add({ targets: line, alpha: { from: 0.35, to: 1 }, duration: Math.max(120, windupMs / 6), yoyo: true, repeat: -1 });
  return [line];
}

/** The beam itself: a glowing wide stroke with a white core, fading out. */
export function drawLaserBeam(scene: Phaser.Scene, path: readonly Point[], fadeMs: number): void {
  const beam = scene.add.graphics().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
  for (const [width, colour, alpha] of [[bertTuning.laserWidth, LASER, 0.5], [2, 0xffffff, 1]] as const) {
    beam.lineStyle(width, colour, alpha);
    trace(beam, path);
  }
  scene.tweens.add({ targets: beam, alpha: 0, duration: fadeMs, onComplete: () => beam.destroy() });
}
