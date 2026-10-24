import Phaser from 'phaser';
import { FONT } from '../content/assetKeys';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../content/config';

export interface GameOverData {
  level: number;
  wave: number;
}

const RETRY_DELAY_MS = 600;

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;
    this.cameras.main.fadeIn(300);
    this.text(cx, cy - 50, 'You fell', 48, '#ff6b6b');
    this.text(cx, cy + 4, `Reached level ${data.level} - wave ${data.wave}`, 20, '#ffffff');
    const prompt = this.text(cx, cy + 56, 'Click / tap to retry', 20, '#b48cff').setAlpha(0);

    this.time.delayedCall(RETRY_DELAY_MS, () => {
      prompt.setAlpha(1);
      this.tweens.add({ targets: prompt, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
      this.input.once('pointerdown', () => this.scene.start('Game'));
    });
  }

  private text(x: number, y: number, value: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#14121c', strokeThickness: 4 })
      .setOrigin(0.5);
  }
}
