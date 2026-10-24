import Phaser from 'phaser';
import { FONT, Frame, MUSIC_FILES, SHEET_COLS, Sfx, TILE_SIZE, Tex } from '../content/assetKeys';
import { levels } from '../content/levels';
import { toStone } from '../logic/grey';

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
    this.load.audio(Sfx.explosion, 'audio/explosion.ogg');
    this.load.atlasXML(Tex.explosion, 'fx/explosion.png', 'fx/explosion.xml');
    for (const [key, file] of Object.entries(MUSIC_FILES)) this.load.audio(key, file);
    for (const level of levels) if (level.mapKey) this.load.tilemapTiledJSON(level.mapKey, `maps/${level.mapKey}.tmj`);
  }

  create(): void {
    this.makeStoneGuardianTexture();
    this.scene.start('MainMenu');
  }

  /** Desaturated copy of the cyclops frame so the boss reads as stone rather than brown. */
  private makeStoneGuardianTexture(): void {
    const canvas = this.textures.createCanvas(Tex.stoneGuardian, TILE_SIZE, TILE_SIZE)!;
    const source = this.textures.get(Tex.tiles).getSourceImage() as CanvasImageSource;
    const sx = (Frame.cyclops % SHEET_COLS) * TILE_SIZE;
    const sy = Math.floor(Frame.cyclops / SHEET_COLS) * TILE_SIZE;
    canvas.context.drawImage(source, sx, sy, TILE_SIZE, TILE_SIZE, 0, 0, TILE_SIZE, TILE_SIZE);
    const pixels = canvas.context.getImageData(0, 0, TILE_SIZE, TILE_SIZE);
    toStone(pixels.data);
    canvas.context.putImageData(pixels, 0, 0);
    canvas.refresh();
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
