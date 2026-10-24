import Phaser from 'phaser';
import { FONT, Tex } from '../content/assetKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.generateBoltTexture();
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.fonts
      .load(`16px ${FONT}`)
      .catch(() => undefined)
      .finally(() => this.scene.start('Preload'));
  }

  private generateBoltTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xb48cff, 0.5).fillCircle(5, 5, 5);
    g.fillStyle(0xffffff, 1).fillCircle(5, 5, 3);
    g.generateTexture(Tex.bolt, 10, 10);
    g.destroy();
  }
}
