import Phaser from 'phaser';
import { gameText } from './gameText';

export function menuText(scene: Phaser.Scene, x: number, y: number, value: string, size: number, color = '#ffffff'): Phaser.GameObjects.Text {
  return gameText(scene, x, y, value, size, { color }).setOrigin(0.5);
}
