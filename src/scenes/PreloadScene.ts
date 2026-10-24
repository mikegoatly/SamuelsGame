import Phaser from 'phaser';
import { FONT, Sfx, TILE_SIZE, Tex } from '../content/assetKeys';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    this.drawLoadingBar();
    this.load.setPath('assets');
    this.load.spritesheet(Tex.tiles, 'tiny-dungeon/tilemap_packed.png', {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    this.load.atlasXML(Tex.controls, 'controls/flat-dark.png', 'controls/flat-dark.xml');
    this.load.audio(Sfx.shoot, 'audio/shoot.ogg');
    this.load.audio(Sfx.hit, 'audio/hit.ogg');
  }

  create(): void {
    this.scene.start('Game');
  }

  private drawLoadingBar(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const barWidth = 240;
    this.add.text(cx, cy - 24, 'Loading...', { fontFamily: FONT, fontSize: '24px' }).setOrigin(0.5);
    this.add.rectangle(cx, cy, barWidth + 4, 16, 0x444444).setStrokeStyle(2, 0xffffff);
    const fill = this.add.rectangle(cx - barWidth / 2, cy, 0, 10, 0xb48cff).setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value;
    });
  }
}
