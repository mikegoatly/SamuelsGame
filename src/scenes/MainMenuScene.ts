import Phaser from 'phaser';
import { gameText } from '../ui/gameText';
import { Frame, Music, Tex } from '../content/assetKeys';
import { GAME_TITLE } from '../content/config';
import { musicOf } from '../systems/MusicPlayer';
import { saveSystem } from '../systems/SaveSystem';
import { playSfx } from '../systems/sfx';
import { MenuButton } from '../ui/MenuButton';
import { MenuList } from '../ui/MenuList';
import { menuText } from '../ui/menuText';
import { MenuScene } from '../ui/MenuScene';

const TITLE_COLOR = '#b48cff';
const SCROLL_SPEED = 0.012;
/** The "press any key" screen shows once per page load; later visits go straight to the buttons. */
let introSeen = false;

export class MainMenuScene extends MenuScene {
  private backdrop?: Phaser.GameObjects.TileSprite;
  private promptWired = false;
  private readonly startFromPrompt = (): void => {
    if (!this.inputReady(350) || introSeen) return;
    introSeen = true;
    playSfx(this, 'uiConfirm');
    this.scene.restart();
  };

  constructor() {
    super('MainMenu');
  }

  protected build(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    musicOf(this.game).crossfadeTo(Music.menu);
    this.drawBackdrop(width, height);
    this.drawTitle(cx, height * 0.24);
    menuText(this, width - 6, height - 8, `v${__APP_VERSION__}`, 10, '#6a6a88').setOrigin(1, 1);
    if (introSeen) this.showMenu(cx, height);
    else this.showPrompt(cx, height);
  }

  override update(_time: number, delta: number): void {
    super.update();
    if (this.backdrop) {
      this.backdrop.tilePositionX += delta * SCROLL_SPEED;
      this.backdrop.tilePositionY += delta * SCROLL_SPEED * 0.6;
    }
  }

  private drawBackdrop(width: number, height: number): void {
    this.backdrop = this.add.tileSprite(width / 2, height / 2, width, height, Tex.tiles, Frame.floor).setTileScale(3).setAlpha(0.5).setTint(0x8a90a8);
    this.add.rectangle(width / 2, height / 2, width, height, 0x14121c, 0.2);
    this.add.particles(0, 0, Tex.star, {
      x: { min: 0, max: width },
      y: height + 8,
      lifespan: 7000,
      speedY: { min: -34, max: -12 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0.09, end: 0.02 },
      alpha: { start: 0.8, end: 0 },
      tint: [0xb48cff, 0xffe066, 0x7dffb0, 0xffffff],
      frequency: 140,
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  private drawTitle(x: number, y: number): void {
    const title = gameText(this, x, y, GAME_TITLE, 48, { color: TITLE_COLOR, stroke: '#2a1a5a' })
      .setOrigin(0.5)
      .setShadow(0, 0, '#b48cff', 18, true, true);
    this.tweens.add({ targets: title, y: y + 5, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: title, scale: 1.03, duration: 3100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private showPrompt(cx: number, height: number): void {
    const prompt = menuText(this, cx, height * 0.68, 'Press any key / tap to start', 20, '#ffffff');
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 800, yoyo: true, repeat: -1 });
    if (this.promptWired) return;
    this.promptWired = true;
    const start = this.startFromPrompt;
    this.input.keyboard?.on('keydown', start);
    this.input.on('pointerdown', start);
    this.input.gamepad?.on('down', start);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.promptWired = false;
      this.input.keyboard?.off('keydown', start);
      this.input.off('pointerdown', start);
      this.input.gamepad?.off('down', start);
    });
  }

  private showMenu(cx: number, height: number): void {
    const { progress, coins } = saveSystem.data;
    menuText(this, cx, height * 0.24 + 46, `Slot ${saveSystem.activeSlot}   -   Level ${progress.level}   -   ${coins} coins`, 16, '#d8d8e8');
    const play = new MenuButton(this, cx, height * 0.55, 200, 36, 'Play', () => this.scene.start('LevelSelect'));
    const slots = new MenuButton(this, cx, height * 0.55 + 44, 200, 36, 'Save slots', () => this.scene.start('SaveSlots'));
    const help = new MenuButton(this, cx, height * 0.55 + 88, 200, 36, 'How to play', () => this.scene.start('HowToPlay'));
    const settings = new MenuButton(this, cx, height * 0.55 + 132, 200, 36, 'Settings', () => this.scene.start('Settings', { back: 'MainMenu' }));
    this.menu = new MenuList(this, [play, slots, help, settings]);
  }
}
