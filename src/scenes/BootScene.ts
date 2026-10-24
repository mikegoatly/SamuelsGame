import Phaser from 'phaser';
import { FONT, Tex } from '../content/assetKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.generateBoltTexture();
    this.generateEnemyBoltTexture();
    this.generatePuffTexture();
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

  private generateEnemyBoltTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xff4a2a, 0.55).fillCircle(5, 5, 5);
    g.fillStyle(0xffe0a0, 1).fillCircle(5, 5, 3);
    g.generateTexture(Tex.enemyBolt, 10, 10);
    g.destroy();
  }

  private generatePuffTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3);
    g.generateTexture(Tex.puff, 6, 6);
    g.destroy();
  }
}
