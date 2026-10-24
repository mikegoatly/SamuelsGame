import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import type { CardData } from '../logic/itemCards';
import { lastInputDevice } from '../systems/inputDevice';
import { gameText } from '../ui/gameText';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';
import type { GameScene } from './GameScene';

const INPUT_DELAY_MS = 500;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 230;
const EMPTY: CardData = { title: '', subtitle: '', color: '#ffffff', frame: 0, tint: null, lines: [] };

/** Modal over the paused game: icon, name, plain-language effect; any key, click, tap or pad button continues. */
export class ItemCardScene extends MenuScene {
  private card = EMPTY;
  private wired = false;

  constructor() {
    super('ItemCard');
  }

  init(card: CardData): void {
    this.card = card;
    this.wired = false;
  }

  override create(): void {
    super.create();
    this.wireInput();
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const { title, subtitle, color, frame, tint, lines } = this.card;
    const hex = Phaser.Display.Color.HexStringToColor(color).color;
    this.add.rectangle(cx, cy, width, height, 0x14121c, 0.75);
    this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, 0x2a2540).setStrokeStyle(4, hex);
    const top = cy - PANEL_HEIGHT / 2;
    menuText(this, cx, top + 18, subtitle, 16, color);
    const icon = this.add.image(cx, top + 62, Tex.tiles, frame).setScale(3);
    if (tint !== null) icon.setTint(tint);
    menuText(this, cx, top + 106, title, 32, color);
    lines.forEach((line, i) => {
      gameText(this, cx, top + 134 + i * 24, line, 16, { color: i === 0 ? '#ffffff' : '#b0b0c8' })
        .setOrigin(0.5, 0)
        .setWordWrapWidth(PANEL_WIDTH - 24)
        .setAlign('center');
    });
    const prompt = menuText(this, cx, top + PANEL_HEIGHT - 16, lastInputDevice() === 'touch' ? 'Tap to continue' : 'Press any button to continue', 16, '#ffe066');
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
  }

  private wireInput(): void {
    if (this.wired) return;
    this.wired = true;
    const dismiss = (): void => {
      if (this.inputReady(INPUT_DELAY_MS)) (this.scene.get('Game') as GameScene).closeCard();
    };
    this.input.keyboard?.on('keydown', dismiss);
    this.input.on('pointerdown', dismiss);
    this.input.gamepad?.on('down', dismiss);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', dismiss);
      this.input.off('pointerdown', dismiss);
      this.input.gamepad?.off('down', dismiss);
    });
  }
}
