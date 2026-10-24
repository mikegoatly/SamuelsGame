import Phaser from 'phaser';
import { FONT } from '../content/assetKeys';

export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffffff',
  fontSize = 10,
  rise = 14,
  duration = 600,
): void {
  const label = scene.add
    .text(x, y, text, { fontFamily: FONT, fontSize: `${fontSize}px`, color, stroke: '#14121c', strokeThickness: 2 })
    .setOrigin(0.5)
    .setDepth(30)
    .setResolution(2);
  scene.tweens.add({
    targets: label,
    y: y - rise,
    alpha: 0,
    duration,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy(),
  });
}
