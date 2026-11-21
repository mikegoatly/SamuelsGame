import Phaser from 'phaser';
import { feel } from '../feel';

const COLOURS = [0xf480e4, 0x1e182c, 0x60d6de, 0xf480e4, 0xbefaf6];
/** Just under the clean band (8-13): these are glitch debris, so the screen effect should hit them. */
const DEPTH = 7.5;

function pixel(scene: Phaser.Scene, x: number, y: number, size: number, colour: number, dx: number, dy: number, ms: number): void {
  const bit = scene.add.rectangle(x, y, size, size, colour).setDepth(DEPTH);
  scene.tweens.add({ targets: bit, x: x + dx, y: y + dy, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => bit.destroy() });
}

/** The Missing Texture breaking apart: a cloud of magenta, black and cyan pixels that bursts out and fades (about half as many when flashes are reduced). */
export function shatter(scene: Phaser.Scene, x: number, y: number, scale: number): void {
  const count = Math.round(22 * Math.max(0.5, scale) * (feel.reduced ? 0.5 : 1));
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const reach = (10 + Math.random() * 26) * scale;
    const size = (1 + Math.floor(Math.random() * 3)) * 2;
    pixel(scene, x, y, size, COLOURS[i % COLOURS.length]!, Math.cos(angle) * reach, Math.sin(angle) * reach, 380 + Math.random() * 280);
  }
}

/** A small "miss" puff where a shot slips through a fake copy. */
export function pixelPuff(scene: Phaser.Scene, x: number, y: number): void {
  const count = feel.reduced ? 3 : 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random();
    pixel(scene, x, y, 2, COLOURS[i % COLOURS.length]!, Math.cos(angle) * 9, Math.sin(angle) * 9, 260);
  }
}
