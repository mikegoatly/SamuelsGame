import Phaser from 'phaser';
import { FONT } from '../content/assetKeys';

export interface GameOverData {
  level: number;
  wave: number;
}

const RETRY_DELAY_MS = 600;
const BUTTON_A = 0;
const BUTTON_START = 9;

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData): void {
    this.cameras.main.fadeIn(300);
    const title = this.text('You fell', 48, '#ff6b6b');
    const summary = this.text(`Reached level ${data.level} - wave ${data.wave}`, 20, '#ffffff');
    const prompt = this.text('Click / tap / press A to retry', 20, '#b48cff').setAlpha(0);
    const layout = (): void => {
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2;
      title.setPosition(cx, cy - 50);
      summary.setPosition(cx, cy + 4);
      prompt.setPosition(cx, cy + 56);
    };
    layout();
    this.scale.on('resize', layout);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', layout));

    this.time.delayedCall(RETRY_DELAY_MS, () => {
      prompt.setAlpha(1);
      this.tweens.add({ targets: prompt, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
      const retry = (): void => void this.scene.start('Game');
      this.input.once('pointerdown', retry);
      this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
        if (button.index === BUTTON_A || button.index === BUTTON_START) retry();
      });
    });
  }

  private text(value: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, value, { fontFamily: FONT, fontSize: `${size}px`, color, stroke: '#14121c', strokeThickness: 4 })
      .setOrigin(0.5);
  }
}
