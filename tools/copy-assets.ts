import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const DEFAULT_KENNEY_DIR =
  'C:/Users/mikeg/OneDrive/Documents/Graphics/Kenney Game Assets All-in-1 3.0.0';
const kenneyDir = process.env.KENNEY_DIR ?? DEFAULT_KENNEY_DIR;
const outDir = resolve(import.meta.dirname, '..', 'public', 'assets');

// [source relative to Kenney root, destination relative to public/assets]
const files: Array<[string, string]> = [
  ['2D assets/Tiny Dungeon/Tilemap/tilemap_packed.png', 'tiny-dungeon/tilemap_packed.png'],
  ['2D assets/Tiny Dungeon/License.txt', 'tiny-dungeon/License.txt'],
  ['UI assets/Onscreen Controls/Spritesheets/flat-dark.png', 'controls/flat-dark.png'],
  ['UI assets/Onscreen Controls/Spritesheets/flat-dark.xml', 'controls/flat-dark.xml'],
  ['UI assets/Onscreen Controls/License.txt', 'controls/License.txt'],
  ['Other/Fonts/Kenney Pixel.ttf', 'fonts/KenneyPixel.ttf'],
  ['Audio/Sci-Fi Sounds/Audio/laserSmall_000.ogg', 'audio/shoot.ogg'],
  ['Audio/Impact Sounds/Audio/impactPunch_medium_000.ogg', 'audio/hit.ogg'],
  ['Audio/Impact Sounds/License.txt', 'audio/License.txt'],
  ['Audio/Sci-Fi Sounds/Audio/explosionCrunch_000.ogg', 'audio/explosion.ogg'],
  ['2D assets/Explosion Pack/Spritesheets/spritesheet_pixelExplosion.png', 'fx/explosion.png'],
  ['2D assets/Explosion Pack/Spritesheets/spritesheet_pixelExplosion.xml', 'fx/explosion.xml'],
  ['2D assets/Explosion Pack/License.txt', 'fx/License.txt'],
];

const musicDir = process.env.MUSIC_DIR ?? 'C:/Users/mikeg/OneDrive/Royalty Free Background Music Pack';
const music: Array<[string, string]> = [
  ['Complicated Melody.mp3', 'music/ruins.mp3'],
  ['Arpeggio.mp3', 'music/desert.mp3'],
  ['Fight.mp3', 'music/boss.mp3'],
];

if (!existsSync(kenneyDir)) {
  console.error(`Kenney directory not found: ${kenneyDir}\nSet KENNEY_DIR to override.`);
  process.exit(1);
}

for (const [src, dest] of files) {
  const from = join(kenneyDir, ...src.split('/'));
  const to = join(outDir, ...dest.split('/'));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`copied ${dest}`);
}

if (!existsSync(musicDir)) {
  console.error(`Music directory not found: ${musicDir}
Set MUSIC_DIR to override.`);
  process.exit(1);
}

for (const [src, dest] of music) {
  const to = join(outDir, ...dest.split('/'));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(join(musicDir, src), to);
  console.log(`copied ${dest}`);
}
