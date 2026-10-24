import Phaser from 'phaser';
import { FONT } from '../content/assetKeys';

export function menuText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  color = '#ffffff',
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#14121c', strokeThickness: Math.max(2, size / 6) })
    .setOrigin(0.5)
    .setResolution(2);
}
