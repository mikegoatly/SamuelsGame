import Phaser from 'phaser';
import { FONT, Frame, MUSIC_FILES, SHEET_COLS, TILE_SIZE, Tex } from '../content/assetKeys';
import { SFX_DEFS, sfxKey, type SfxId } from '../content/sfxDefs';
import { levels } from '../content/levels';
import { toStone } from '../logic/grey';
import { toTone } from '../logic/palette';

const PALACE_FLOOR_TONE = [150, 112, 220] as const;

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
    for (const [id, def] of Object.entries(SFX_DEFS)) def.files.forEach((file, i) => this.load.audio(sfxKey(id as SfxId, i), `audio/${file}`));
    this.load.image(Tex.smoke, 'fx/smoke.png');
    this.load.image(Tex.star, 'fx/star.png');
    this.load.image(Tex.muzzle, 'fx/muzzle.png');
    this.load.atlasXML(Tex.explosion, 'fx/explosion.png', 'fx/explosion.xml');
    for (const [key, file] of Object.entries(MUSIC_FILES)) this.load.audio(key, file);
    for (const level of levels) if (level.mapKey) this.load.tilemapTiledJSON(level.mapKey, `maps/${level.mapKey}.tmj`);
  }

  create(): void {
    this.makeStoneGuardianTexture();
    this.makePalaceTiles();
    this.makeVignetteTexture();
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

  /** The tile sheet with the floor tiles recoloured royal purple, so the palace floor does not rely on tinting brown. */
  private makePalaceTiles(): void {
    const source = this.textures.get(Tex.tiles).getSourceImage() as HTMLImageElement;
    const canvas = this.textures.createCanvas(Tex.palaceTiles, source.width, source.height)!;
    canvas.context.drawImage(source, 0, 0);
    for (const frame of [Frame.floor, Frame.floorRubble, Frame.floorPebbles]) {
      const x = (frame % SHEET_COLS) * TILE_SIZE;
      const y = Math.floor(frame / SHEET_COLS) * TILE_SIZE;
      const pixels = canvas.context.getImageData(x, y, TILE_SIZE, TILE_SIZE);
      toTone(pixels.data, PALACE_FLOOR_TONE);
      canvas.context.putImageData(pixels, x, y);
    }
    canvas.refresh();
  }

  /** Soft red edge glow (transparent in the middle) used for damage and low-HP feedback. */
  private makeVignetteTexture(): void {
    const width = 256;
    const height = 144;
    const canvas = this.textures.createCanvas(Tex.vignette, width, height)!;
    const gradient = canvas.context.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, width * 0.62);
    gradient.addColorStop(0, 'rgba(200,0,0,0)');
    gradient.addColorStop(1, 'rgba(200,0,0,1)');
    canvas.context.fillStyle = gradient;
    canvas.context.fillRect(0, 0, width, height);
    canvas.refresh();
    canvas.setFilter(Phaser.Textures.FilterMode.LINEAR);
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
