import Phaser from 'phaser';
import { gameText } from '../ui/gameText';
import { Frame, MUSIC_FILES, SHEET_COLS, SKILL_ICON_SOURCES, TILE_SIZE, Tex } from '../content/assetKeys';
import { PROMPT_SIZE } from '../content/inputGlyphs';
import { skillList } from '../content/skills';
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
    this.load.image(Tex.weaponsExtra, 'extra/weapons-extra.png');
    this.load.atlasXML(Tex.controls, 'controls/flat-dark.png', 'controls/flat-dark.xml');
    this.load.spritesheet(Tex.prompts, 'controls/prompts.png', { frameWidth: PROMPT_SIZE, frameHeight: PROMPT_SIZE });
    for (const [id, file] of Object.entries(SKILL_ICON_SOURCES)) this.load.image(`skill-src-${id}`, file);
    for (const [id, def] of Object.entries(SFX_DEFS)) def.files.forEach((file, i) => this.load.audio(sfxKey(id as SfxId, i), `audio/${file}`));
    this.load.image(Tex.smoke, 'fx/smoke.png');
    this.load.image(Tex.star, 'fx/star.png');
    this.load.image(Tex.muzzle, 'fx/muzzle.png');
    this.load.atlasXML(Tex.explosion, 'fx/explosion.png', 'fx/explosion.xml');
    for (const [key, file] of Object.entries(MUSIC_FILES)) this.load.audio(key, file);
    for (const level of levels) if (level.mapKey) this.load.tilemapTiledJSON(level.mapKey, `maps/${level.mapKey}.tmj`);
  }

  create(): void {
    this.mergeWeaponFrames();
    this.makeStoneGuardianTexture();
    this.makePalaceTiles();
    this.makeVignetteTexture();
    this.makeSkillIcons();
    this.scene.start('MainMenu');
  }

  /** Rebuilds the tile sheet texture with the hand-drawn weapon strip as an extra row (frames 132+), so every Tex.tiles lookup works. */
  private mergeWeaponFrames(): void {
    const source = this.textures.get(Tex.tiles).getSourceImage() as HTMLImageElement;
    const extra = this.textures.get(Tex.weaponsExtra).getSourceImage() as HTMLImageElement;
    const rows = source.height / TILE_SIZE;
    this.textures.remove(Tex.tiles);
    const canvas = this.textures.createCanvas(Tex.tiles, source.width, (rows + 1) * TILE_SIZE)!;
    canvas.context.drawImage(source, 0, 0);
    canvas.context.drawImage(extra, 0, rows * TILE_SIZE);
    canvas.refresh();
    for (let i = 0; i < (rows + 1) * SHEET_COLS; i++) canvas.add(i, 0, (i % SHEET_COLS) * TILE_SIZE, Math.floor(i / SHEET_COLS) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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

  /** 32px skill icons: a dark disc with a coloured rim and the skill's particle sprite, tinted and downscaled smoothly. */
  private makeSkillIcons(): void {
    const size = 32;
    for (const skill of skillList) {
      const source = this.textures.get(`skill-src-${skill.id}`).getSourceImage() as CanvasImageSource;
      const css = `#${skill.color.toString(16).padStart(6, '0')}`;
      const canvas = this.textures.createCanvas(skill.icon, size, size)!;
      const ctx = canvas.context;
      ctx.fillStyle = 'rgba(20,18,28,0.92)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = css;
      ctx.lineWidth = 2;
      ctx.stroke();
      const glyph = document.createElement('canvas');
      glyph.width = glyph.height = size;
      const g = glyph.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      g.drawImage(source, 3, 3, size - 6, size - 6);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = css;
      g.globalAlpha = 0.7;
      g.fillRect(0, 0, size, size);
      ctx.drawImage(glyph, 0, 0);
      ctx.globalAlpha = 0.8;
      ctx.drawImage(source, 8, 8, size - 16, size - 16);
      canvas.refresh();
    }
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
    gameText(this, cx, cy - 24, 'Loading...', 32).setOrigin(0.5);
    this.add.rectangle(cx, cy, barWidth + 4, 16, 0x444444).setStrokeStyle(2, 0xffffff);
    const fill = this.add.rectangle(cx - barWidth / 2, cy, 0, 10, 0xb48cff).setOrigin(0, 0.5);
    this.load.on('progress', (value: number) => {
      fill.width = barWidth * value;
    });
  }
}
