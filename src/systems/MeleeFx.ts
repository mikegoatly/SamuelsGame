import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';

export const SLASH_COLOR = 0xffe27a;

/** A coloured crescent wedge sweeping through the arc and fading; `side` shifts it left or right for alternating stabs. */
export function slashFx(scene: Phaser.Scene, x: number, y: number, aim: number, arc: number, reach: number, swingMs: number, colour = SLASH_COLOR, side = 0): void {
  const g = scene.add.graphics({ x, y }).setDepth(9);
  const radius = reach + 6;
  const a = aim + side * arc * 0.25;
  g.fillStyle(colour, 0.35).slice(0, 0, radius, a - arc / 2, a + arc / 2, false).fillPath();
  g.lineStyle(2, 0xffffff, 0.9).beginPath().arc(0, 0, radius, a - arc / 2, a + arc / 2, false).strokePath();
  scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.12, scaleY: 1.12, duration: swingMs + 60, onComplete: () => g.destroy() });
}

/** A short burst where a punch lands; the finisher gets a bigger one. */
export function punchFx(scene: Phaser.Scene, x: number, y: number, aim: number, colour: number, big: boolean): void {
  const flash = scene.add.image(x, y, Tex.star).setRotation(aim).setScale(big ? 0.16 : 0.09).setTint(colour).setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
  scene.tweens.add({ targets: flash, alpha: 0, scale: big ? 0.3 : 0.15, angle: 60, duration: big ? 220 : 130, onComplete: () => flash.destroy() });
}

/** An expanding ring marking a shockwave's reach. */
export function ringFx(scene: Phaser.Scene, x: number, y: number, radius: number, colour: number): void {
  const ring = scene.add.circle(x, y, radius, colour, 0.18).setStrokeStyle(2, colour, 0.9).setDepth(8).setScale(0.2);
  scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 260, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
}

/** A spark where an enemy bolt was swatted away. */
export function sparkFx(scene: Phaser.Scene, x: number, y: number): void {
  const spark = scene.add.circle(x, y, 5, SLASH_COLOR, 0.9).setDepth(9);
  scene.tweens.add({ targets: spark, scale: 2.2, alpha: 0, duration: 180, onComplete: () => spark.destroy() });
}
