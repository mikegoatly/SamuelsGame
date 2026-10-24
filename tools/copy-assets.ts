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
  ['Audio/Impact Sounds/License.txt', 'audio/License.txt'],
  ['2D assets/Particle Pack/PNG (Transparent)/smoke_05.png', 'fx/smoke.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/star_04.png', 'fx/star.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/muzzle_01.png', 'fx/muzzle.png'],
  ['2D assets/Particle Pack/License.txt', 'fx/ParticlePack-License.txt'],
  ['2D assets/Explosion Pack/Spritesheets/spritesheet_pixelExplosion.png', 'fx/explosion.png'],
  ['2D assets/Explosion Pack/Spritesheets/spritesheet_pixelExplosion.xml', 'fx/explosion.xml'],
  ['2D assets/Explosion Pack/License.txt', 'fx/License.txt'],
];

const sci = 'Audio/Sci-Fi Sounds/Audio';
const impact = 'Audio/Impact Sounds/Audio';
const rpg = 'Audio/RPG Audio/Audio';
const ui = 'Audio/Interface Sounds/Audio';
const jingle = 'Audio/Music Jingles/Audio (Steeldrum)';
const sfx: Array<[string, string]> = [
  [`${sci}/laserSmall_000.ogg`, 'shoot_0.ogg'],
  [`${sci}/laserSmall_001.ogg`, 'shoot_1.ogg'],
  [`${sci}/laserSmall_002.ogg`, 'shoot_2.ogg'],
  [`${sci}/laserLarge_000.ogg`, 'fireball_0.ogg'],
  [`${sci}/forceField_000.ogg`, 'fireball_1.ogg'],
  [`${sci}/explosionCrunch_000.ogg`, 'explosion_0.ogg'],
  [`${sci}/explosionCrunch_001.ogg`, 'explosion_1.ogg'],
  [`${rpg}/knifeSlice.ogg`, 'swing_0.ogg'],
  [`${rpg}/knifeSlice2.ogg`, 'swing_1.ogg'],
  [`${impact}/impactMetal_light_000.ogg`, 'swordhit_0.ogg'],
  [`${impact}/impactMetal_light_001.ogg`, 'swordhit_1.ogg'],
  [`${impact}/impactSoft_medium_000.ogg`, 'enemyhit_0.ogg'],
  [`${impact}/impactSoft_medium_001.ogg`, 'enemyhit_1.ogg'],
  [`${impact}/impactSoft_medium_002.ogg`, 'enemyhit_2.ogg'],
  [`${impact}/impactPunch_heavy_000.ogg`, 'enemydie_0.ogg'],
  [`${impact}/impactPunch_heavy_001.ogg`, 'enemydie_1.ogg'],
  [`${sci}/laserRetro_000.ogg`, 'enemyshot_0.ogg'],
  [`${sci}/laserRetro_001.ogg`, 'enemyshot_1.ogg'],
  [`${impact}/impactPlate_heavy_000.ogg`, 'slam_0.ogg'],
  [`${impact}/impactPlate_heavy_001.ogg`, 'slam_1.ogg'],
  [`${impact}/impactPunch_medium_000.ogg`, 'hurt_0.ogg'],
  [`${impact}/impactPunch_medium_001.ogg`, 'hurt_1.ogg'],
  [`${rpg}/handleCoins.ogg`, 'coin_0.ogg'],
  [`${rpg}/handleCoins2.ogg`, 'coin_1.ogg'],
  [`${ui}/glass_001.ogg`, 'potion_0.ogg'],
  [`${ui}/glass_002.ogg`, 'potion_1.ogg'],
  [`${ui}/pluck_001.ogg`, 'charm_0.ogg'],
  [`${ui}/pluck_002.ogg`, 'charm_1.ogg'],
  [`${jingle}/jingles-steel_00.ogg`, 'levelup.ogg'],
  [`${rpg}/doorClose_1.ogg`, 'doorclose_0.ogg'],
  [`${rpg}/doorClose_2.ogg`, 'doorclose_1.ogg'],
  [`${rpg}/doorOpen_1.ogg`, 'dooropen_0.ogg'],
  [`${rpg}/doorOpen_2.ogg`, 'dooropen_1.ogg'],
  [`${sci}/lowFrequency_explosion_001.ogg`, 'bossroar.ogg'],
  [`${sci}/lowFrequency_explosion_000.ogg`, 'bossphase.ogg'],
  [`${ui}/tick_001.ogg`, 'uimove_0.ogg'],
  [`${ui}/tick_002.ogg`, 'uimove_1.ogg'],
  [`${ui}/select_001.ogg`, 'uiconfirm.ogg'],
  [`${ui}/back_001.ogg`, 'uiback_0.ogg'],
  [`${ui}/back_002.ogg`, 'uiback_1.ogg'],
  [`${jingle}/jingles-steel_05.ogg`, 'victory.ogg'],
];
for (const [src, dest] of sfx) files.push([src, `audio/${dest}`]);

const musicDir = process.env.MUSIC_DIR ?? 'C:/Users/mikeg/OneDrive/Royalty Free Background Music Pack';
const music: Array<[string, string]> = [
  ['Relaxing Melody.mp3', 'music/menu.mp3'],
  ['Complicated Melody.mp3', 'music/ruins.mp3'],
  ['Arpeggio.mp3', 'music/desert.mp3'],
  ['Fight.mp3', 'music/boss.mp3'],
  ['Montage.mp3', 'music/palace.mp3'],
  ['Hard Rock.mp3', 'music/boss-palace.mp3'],
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
