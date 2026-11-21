import Phaser from 'phaser';
import { gameText } from '../ui/gameText';

/** Like `floatText`, but hands back the label (to nudge it before it floats away). */
export function floatLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = '#ffffff',
  fontSize = 12,
  rise = 14,
  duration = 600,
): Phaser.GameObjects.Text {
  const label = gameText(scene, x, y, text, fontSize, { color, world: true }).setOrigin(0.5).setDepth(30);
  scene.tweens.add({ targets: label, y: y - rise, duration, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: label, alpha: 0, delay: duration * 0.5, duration: duration * 0.5, onComplete: () => label.destroy() });
  return label;
}

export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff', fontSize = 12, rise = 14, duration = 600): void {
  floatLabel(scene, x, y, text, color, fontSize, rise, duration);
}
