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
const PANEL_HEIGHT = 264;
const EMPTY: CardData = { title: '', subtitle: '', color: '#ffffff', frame: 0, tint: null, lines: [] };

/** Modal over the paused game: icon, name, plain-language effect; any key, click, tap or pad button continues. */
export class ItemCardScene extends MenuScene {
  private card = EMPTY;
  private wired = false;

  constructor(key = 'ItemCard') {
    super(key);
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
    const { title, subtitle, color, frame, tint, lines, icon: iconKey } = this.card;
    const hex = Phaser.Display.Color.HexStringToColor(color).color;
    this.add.rectangle(cx, cy, width, height, 0x14121c, 0.75);
    this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, 0x2a2540).setStrokeStyle(4, hex);
    const top = cy - PANEL_HEIGHT / 2;
    menuText(this, cx, top + 18, subtitle, 16, color);
    const crown = iconKey === Tex.accessories;
    const icon = iconKey ? this.add.image(cx, top + (crown ? 78 : 62), iconKey, crown ? frame : undefined).setScale(crown ? 4 : 2) : this.add.image(cx, top + 62, Tex.tiles, frame).setScale(3);
    if (tint !== null && !iconKey) icon.setTint(tint);
    menuText(this, cx, top + 106, title, 32, color);
    let y = top + 134;
    lines.forEach((line, i) => {
      const text = gameText(this, cx, y, line, 16, { color: i === 0 ? '#ffffff' : '#b0b0c8' })
        .setOrigin(0.5, 0)
        .setWordWrapWidth(PANEL_WIDTH - 24)
        .setAlign('center');
      y += text.height + 8;
    });
    const prompt = menuText(this, cx, top + PANEL_HEIGHT - 26, lastInputDevice() === 'touch' ? 'Tap to continue' : 'Press any button to continue', 16, '#ffe066');
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
  }

  /** Continue pressed: tell the game to carry on. */
  protected close(): void {
    (this.scene.get('Game') as GameScene).closeCard();
  }

  private wireInput(): void {
    if (this.wired) return;
    this.wired = true;
    const dismiss = (): void => {
      if (this.inputReady(INPUT_DELAY_MS)) this.close();
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
