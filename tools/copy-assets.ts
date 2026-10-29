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
  ['Icons/Input Prompts Pixel 16×/Tilemap/tilemap_packed.png', 'controls/prompts.png'],
  ['Icons/Input Prompts Pixel 16×/License.txt', 'controls/Prompts-License.txt'],
  ['2D assets/Particle Pack/PNG (Transparent)/flame_05.png', 'fx/skill-flame.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/star_08.png', 'fx/skill-frost.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/spark_06.png', 'fx/skill-lightning.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/circle_03.png', 'fx/skill-shield.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/twirl_02.png', 'fx/skill-blink.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/slash_03.png', 'fx/skill-slash.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/smoke_08.png', 'fx/skill-poison.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/scratch_01.png', 'fx/skill-wolf.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/fire_02.png', 'fx/skill-meteor.png'],
  ['2D assets/Particle Pack/PNG (Transparent)/magic_02.png', 'fx/skill-gravity.png'],
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
  [`${sci}/forceField_002.ogg`, 'frostnova_0.ogg'],
  [`${sci}/forceField_003.ogg`, 'frostnova_1.ogg'],
  [`${sci}/laserRetro_002.ogg`, 'zap_0.ogg'],
  [`${sci}/laserRetro_003.ogg`, 'zap_1.ogg'],
  [`${sci}/forceField_001.ogg`, 'shield_0.ogg'],
  [`${sci}/impactMetal_000.ogg`, 'shieldhit_0.ogg'],
  [`${sci}/impactMetal_001.ogg`, 'shieldhit_1.ogg'],
  [`${sci}/forceField_004.ogg`, 'shieldbreak_0.ogg'],
  [`${sci}/spaceEngineSmall_000.ogg`, 'blink_0.ogg'],
  [`${sci}/spaceEngineSmall_001.ogg`, 'blink_1.ogg'],
  [`${sci}/slime_000.ogg`, 'poison_0.ogg'],
  [`${sci}/slime_001.ogg`, 'poison_1.ogg'],
  [`${sci}/spaceEngineLow_000.ogg`, 'gravity_0.ogg'],
  [`${sci}/spaceEngineLow_001.ogg`, 'gravity_1.ogg'],
  [`${sci}/thrusterFire_000.ogg`, 'meteorfall_0.ogg'],
  [`${sci}/lowFrequency_explosion_000.ogg`, 'meteorhit_0.ogg'],
  [`${sci}/lowFrequency_explosion_001.ogg`, 'meteorhit_1.ogg'],
  [`${sci}/laserLarge_002.ogg`, 'wolf_0.ogg'],
  [`${sci}/laserLarge_003.ogg`, 'wolfbite_0.ogg'],
];
for (const [src, dest] of sfx) files.push([src, `audio/${dest}`]);

// Sewer level art, fonts and sounds (see docs/assets-sewer.md)
const rogueDungeon = '2D assets/Roguelike Dungeon Pack';
const rogueBase = '2D assets/Roguelike Base Pack';
files.push(
  [`${rogueDungeon}/Spritesheet/roguelikeDungeon_transparent.png`, 'sewer/roguelike-dungeon.png'],
  [`${rogueDungeon}/License.txt`, 'sewer/RoguelikeDungeon-License.txt'],
  [`${rogueBase}/Spritesheet/roguelikeSheet_transparent.png`, 'sewer/roguelike-base.png'],
  [`${rogueBase}/License.txt`, 'sewer/RoguelikeBase-License.txt'],
  ['2D assets/Tiny Town/Tilemap/tilemap_packed.png', 'sewer/tiny-town.png'],
  ['2D assets/Tiny Town/License.txt', 'sewer/TinyTown-License.txt'],
  ['2D assets/Tiny Battle/Tilemap/tilemap_packed.png', 'sewer/tiny-battle.png'],
  ['2D assets/Tiny Battle/License.txt', 'sewer/TinyBattle-License.txt'],
);
const fontNames = [
  'Blocks', 'Bold', 'Future Narrow', 'Future Square', 'Future', 'High Square', 'High', 'Mini Square Mono',
  'Mini Square', 'Mini', 'Pixel Square', 'Pixel', 'Rocket Square', 'Rocket', 'Space', 'Thick',
];
for (const name of fontNames) files.push([`Other/Fonts/Kenney ${name}.ttf`, `fonts/Kenney${name.replace(/ /g, '')}.ttf`]);
// The Fonts pack ships no licence file; Kenney's packs are all CC0, so ship the Tiny Dungeon one beside them.
files.push(['2D assets/Tiny Dungeon/License.txt', 'fonts/License.txt']);

const foley = 'Audio/Foley Sounds/Audio';
const retro = 'Audio/Retro Sounds 1/Audio';
const sewerSfx: Array<[string, string]> = [
  [`${foley}/Water/sinkWater1.ogg`, 'splash_0.ogg'],
  [`${foley}/Water/sinkWater2.ogg`, 'splash_1.ogg'],
  [`${foley}/Water/sinkWater3.ogg`, 'gurgle_0.ogg'],
  [`${foley}/Water/sinkWater4.ogg`, 'gurgle_1.ogg'],
  [`${foley}/Water/drip1.ogg`, 'drip_0.ogg'],
  [`${foley}/Water/drip2.ogg`, 'drip_1.ogg'],
  [`${impact}/impactSoft_heavy_000.ogg`, 'squelch_0.ogg'],
  [`${impact}/impactSoft_heavy_001.ogg`, 'squelch_1.ogg'],
  [`${retro}/creature1.ogg`, 'croak_0.ogg'],
  [`${retro}/creature2.ogg`, 'croak_1.ogg'],
  [`${rpg}/chop.ogg`, 'snap_0.ogg'],
  [`${impact}/impactWood_light_000.ogg`, 'snap_1.ogg'],
];
for (const [src, dest] of sewerSfx) files.push([src, `audio/${dest}`]);

const minesSfx: Array<[string, string]> = [
  [`${retro}/rumble1.ogg`, 'rumble_0.ogg'],
  [`${retro}/rumble2.ogg`, 'rumble_1.ogg'],
  [`${impact}/impactBell_heavy_000.ogg`, 'chime_0.ogg'],
  [`${impact}/impactBell_heavy_001.ogg`, 'chime_1.ogg'],
  [`${impact}/impactGlass_light_000.ogg`, 'crystalhit_0.ogg'],
  [`${impact}/impactGlass_light_001.ogg`, 'crystalhit_1.ogg'],
  [`${impact}/impactGlass_heavy_000.ogg`, 'shatter_0.ogg'],
  [`${impact}/impactGlass_heavy_001.ogg`, 'shatter_1.ogg'],
  [`${foley}/Rocks/stonesHit1.ogg`, 'crumble_0.ogg'],
  [`${foley}/Rocks/stonesHit2.ogg`, 'crumble_1.ogg'],
  [`${foley}/Rocks/stoneDrag1.ogg`, 'roll_0.ogg'],
  [`${foley}/Woosh/woosh1.ogg`, 'thwip_0.ogg'],
  [`${foley}/Woosh/woosh2.ogg`, 'thwip_1.ogg'],
];
for (const [src, dest] of minesSfx) files.push([src, `audio/${dest}`]);
files.push(
  ['Audio/Foley Sounds/License.txt', 'audio/Foley-License.txt'],
  ['Audio/Retro Sounds 1/License.txt', 'audio/Retro1-License.txt'],
  ['Audio/RPG Audio/License.txt', 'audio/RPG-License.txt'],
);

const musicDir = process.env.MUSIC_DIR ?? 'C:/Users/mikeg/OneDrive/Royalty Free Background Music Pack';
const music: Array<[string, string]> = [
  ['Relaxing Melody.mp3', 'music/menu.mp3'],
  ['Complicated Melody.mp3', 'music/ruins.mp3'],
  ['Arpeggio.mp3', 'music/desert.mp3'],
  ['Fight.mp3', 'music/boss.mp3'],
  ['Montage.mp3', 'music/palace.mp3'],
  ['Hard Rock.mp3', 'music/boss-palace.mp3'],
  ['Synth.mp3', 'music/mines.mp3'],
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
