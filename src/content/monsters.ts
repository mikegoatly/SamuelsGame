import { Frame, MinesFrame, MonsterFrame, SewerFrame, Tex } from './assetKeys';
import type { EnemyDef } from './enemies';

/** Hand-drawn sprite from the extra monster sheet. */
const drawn = (frame: number): Pick<EnemyDef, 'texture' | 'textureFrame' | 'frame'> => ({ texture: Tex.monsters, textureFrame: frame, frame: 0 });

/** Hand-drawn sprite from the sewer sheet. */
const sewerDrawn = (frame: number): Pick<EnemyDef, 'texture' | 'textureFrame' | 'frame'> => ({ texture: Tex.sewer, textureFrame: frame, frame: 0 });

/** Hand-drawn sprite from the Crystal Mines sheet. */
const minesDrawn = (frame: number): Pick<EnemyDef, 'texture' | 'textureFrame' | 'frame'> => ({ texture: Tex.mines, textureFrame: frame, frame: 0 });

// Ruins
export const rat: EnemyDef = {
  id: 'rat',
  name: 'Rat',
  ...drawn(MonsterFrame.rat),
  baseHp: 6,
  baseDamage: 3,
  speed: 62,
  behaviour: 'custom',
  custom: 'rat',
  lootTableId: 'rat',
  raisable: false,
  eliteOk: false,
};
export const ratSwarm: EnemyDef = {
  ...rat,
  id: 'ratSwarm',
  name: 'Rat Swarm',
  cost: 2,
  pack: { member: 'rat', count: [6, 9], levelDrop: 0 },
};
export const bombBeetle: EnemyDef = {
  id: 'bombBeetle',
  name: 'Bomb Beetle',
  ...drawn(MonsterFrame.beetle),
  baseHp: 14,
  baseDamage: 4,
  speed: 58,
  behaviour: 'custom',
  custom: 'beetle',
  lootTableId: 'bombBeetle',
  blastDamage: 12,
  raisable: false,
};
export const skeletonArcher: EnemyDef = {
  id: 'skeletonArcher',
  name: 'Skeleton Archer',
  ...drawn(MonsterFrame.skeleton),
  baseHp: 16,
  baseDamage: 6,
  speed: 40,
  behaviour: 'custom',
  custom: 'archer',
  lootTableId: 'skeletonArcher',
  shotSpeed: 105,
  placement: 'back',
};
export const wisp: EnemyDef = {
  id: 'wisp',
  name: 'Wisp',
  ...drawn(MonsterFrame.wisp),
  baseHp: 10,
  baseDamage: 7,
  speed: 52,
  behaviour: 'custom',
  custom: 'wisp',
  lootTableId: 'wisp',
};
export const necromancer: EnemyDef = {
  id: 'necromancer',
  name: 'Necromancer',
  frame: Frame.hooded,
  baseHp: 30,
  baseDamage: 6,
  speed: 30,
  behaviour: 'custom',
  custom: 'necromancer',
  lootTableId: 'necromancer',
  tint: 0x70d890,
  shotSpeed: 70,
  cost: 2,
  placement: 'back',
  raisable: false,
};

// Desert
export const sandShark: EnemyDef = {
  id: 'sandShark',
  name: 'Sand Shark',
  ...drawn(MonsterFrame.shark),
  baseHp: 38,
  baseDamage: 14,
  speed: 70,
  behaviour: 'custom',
  custom: 'shark',
  lootTableId: 'sandShark',
  tint: 0xe0c898,
  cost: 2,
};
export const fireImp: EnemyDef = {
  id: 'fireImp',
  name: 'Fire Imp',
  ...drawn(MonsterFrame.imp),
  baseHp: 16,
  baseDamage: 7,
  speed: 86,
  behaviour: 'custom',
  custom: 'imp',
  lootTableId: 'fireImp',
  blastDamage: 5,
};
export const cactusTurret: EnemyDef = {
  id: 'cactusTurret',
  name: 'Cactus Turret',
  ...drawn(MonsterFrame.cactus),
  baseHp: 44,
  baseDamage: 9,
  speed: 0,
  behaviour: 'custom',
  custom: 'turret',
  lootTableId: 'cactusTurret',
  shotSpeed: 80,
  cost: 1,
  raisable: false,
};
export const dustDevil: EnemyDef = {
  id: 'dustDevil',
  name: 'Dust Devil',
  ...drawn(MonsterFrame.devil),
  baseHp: 30,
  baseDamage: 8,
  speed: 26,
  behaviour: 'custom',
  custom: 'devil',
  lootTableId: 'dustDevil',
  raisable: false,
};
export const mummyPriest: EnemyDef = {
  id: 'mummyPriest',
  name: 'Mummy Priest',
  frame: Frame.knightGrey,
  baseHp: 36,
  baseDamage: 8,
  speed: 28,
  behaviour: 'custom',
  custom: 'priest',
  lootTableId: 'mummyPriest',
  tint: 0xe8d890,
  shotSpeed: 70,
  cost: 1,
  placement: 'back',
};

// Palace
export const mirrorKnight: EnemyDef = {
  id: 'mirrorKnight',
  name: 'Mirror Knight',
  frame: Frame.knightVisor,
  baseHp: 52,
  baseDamage: 11,
  speed: 26,
  behaviour: 'chaser',
  lootTableId: 'mirrorKnight',
  tint: 0xb8f0ff,
  scale: 1.15,
  shield: { arc: 2.4, reduction: 0.5, turnRate: 1.1 },
  reflect: { damageScale: 0.5 },
};
export const jester: EnemyDef = {
  id: 'jester',
  name: 'Jester',
  frame: Frame.knightGrey,
  baseHp: 30,
  baseDamage: 9,
  speed: 44,
  behaviour: 'custom',
  custom: 'jester',
  lootTableId: 'jester',
  tint: 0xff70d0,
  blastDamage: 11,
  placement: 'back',
};
export const gargoyle: EnemyDef = {
  id: 'gargoyle',
  name: 'Gargoyle',
  ...drawn(MonsterFrame.gargoyle),
  baseHp: 56,
  baseDamage: 13,
  speed: 46,
  behaviour: 'custom',
  custom: 'gargoyle',
  lootTableId: 'gargoyle',
  tint: 0xc8cce0,
  scale: 1.2,
  cost: 2,
  raisable: false,
};
export const twinMage: EnemyDef = {
  id: 'twinMage',
  name: 'Twin Mage',
  frame: Frame.hooded,
  baseHp: 30,
  baseDamage: 11,
  speed: 34,
  behaviour: 'custom',
  custom: 'twin',
  lootTableId: 'twinMage',
  tint: 0x70e8ff,
  shotSpeed: 66,
  placement: 'back',
  eliteOk: false,
};
export const twinMages: EnemyDef = {
  ...twinMage,
  id: 'twinMages',
  name: 'Twin Mages',
  cost: 2,
  pack: { member: 'twinMage', count: [2, 2] },
};
export const hound: EnemyDef = {
  id: 'hound',
  name: 'Hound',
  frame: Frame.wolf,
  baseHp: 18,
  baseDamage: 8,
  speed: 82,
  behaviour: 'custom',
  custom: 'hound',
  lootTableId: 'hound',
  tint: 0xd09070,
  eliteOk: false,
};
export const houndmaster: EnemyDef = {
  id: 'houndmaster',
  name: 'Houndmaster',
  frame: Frame.bandit,
  baseHp: 44,
  baseDamage: 12,
  speed: 30,
  behaviour: 'custom',
  custom: 'houndmaster',
  lootTableId: 'houndmaster',
  tint: 0xe09040,
  scale: 1.15,
  cost: 3,
  pack: { member: 'hound', count: [2, 2], leader: true },
};

// Sewer
export const sewerRat: EnemyDef = {
  ...rat,
  id: 'sewerRat',
  name: 'Sewer Rat',
  baseHp: 10,
  baseDamage: 4,
  speed: 66,
  tint: 0x8fb89a,
  lootTableId: 'sewerRat',
  tip: 'Comes in a big gang. Fight them in a corner!',
  xpLevelDrop: 2,
};
export const sewerRatSwarm: EnemyDef = {
  ...sewerRat,
  id: 'sewerRatSwarm',
  name: 'Sewer Rat Swarm',
  cost: 2,
  pack: { member: 'sewerRat', count: [4, 6], levelDrop: 0 },
};
export const sludgeBlob: EnemyDef = {
  id: 'sludgeBlob',
  name: 'Sludge Blob',
  ...sewerDrawn(SewerFrame.slimeBig),
  baseHp: 40,
  baseDamage: 8,
  speed: 27,
  behaviour: 'custom',
  custom: 'blob',
  lootTableId: 'sludgeBlob',
  cost: 2,
  splitInto: { id: 'sludgeBlobSmall', count: 2 },
  raisable: false,
  tip: 'Slow and sticky. It splits in two when it pops!',
  xpLevelDrop: 20,
};
export const sludgeBlobSmall: EnemyDef = {
  ...sludgeBlob,
  id: 'sludgeBlobSmall',
  name: 'Little Blob',
  ...sewerDrawn(SewerFrame.slimeSmall),
  baseHp: 11,
  baseDamage: 5,
  speed: 46,
  lootTableId: 'sludgeBlobSmall',
  splitInto: undefined,
  tip: undefined,
};
export const pipeSpitter: EnemyDef = {
  id: 'pipeSpitter',
  name: 'Pipe Spitter',
  ...sewerDrawn(SewerFrame.spitter),
  baseHp: 52,
  baseDamage: 8,
  speed: 0,
  behaviour: 'custom',
  custom: 'spitter',
  lootTableId: 'pipeSpitter',
  cost: 2,
  placement: 'back',
  raisable: false,
  tip: 'Spits goo at a red circle. Step out of it!',
  maxPerWave: 2,
};
export const bloatToad: EnemyDef = {
  id: 'bloatToad',
  name: 'Bloat Toad',
  ...sewerDrawn(SewerFrame.toadSit),
  baseHp: 36,
  baseDamage: 6,
  speed: 42,
  behaviour: 'custom',
  custom: 'toad',
  lootTableId: 'bloatToad',
  blastDamage: 6,
  raisable: false,
  tip: 'Hops close, puffs up red, then pops into poison gas.',
};
export const sewerGator: EnemyDef = {
  id: 'sewerGator',
  name: 'Sewer Gator',
  ...sewerDrawn(SewerFrame.gator),
  baseHp: 35,
  baseDamage: 17,
  speed: 70,
  behaviour: 'custom',
  custom: 'gator',
  lootTableId: 'sewerGator',
  cost: 2,
  tip: 'Hides in the goo with only its eyes showing. Snap!',
  swims: true,
  maxPerWave: 2,
  maxAlive: 2,
};
export const moldShroom: EnemyDef = {
  id: 'moldShroom',
  name: 'Mold Shroom',
  ...sewerDrawn(SewerFrame.mushroom),
  baseHp: 44,
  baseDamage: 5,
  speed: 30,
  behaviour: 'custom',
  custom: 'shroom',
  lootTableId: 'moldShroom',
  cost: 1,
  placement: 'back',
  raisable: false,
  tip: 'Heals and shields its friends. Pop it first!',
  maxPerWave: 1,
};

// Crystal Mines
export const caveBat: EnemyDef = {
  id: 'caveBat',
  name: 'Cave Bat',
  frame: Frame.bat,
  tint: 0xa898ff,
  baseHp: 12,
  baseDamage: 6,
  speed: 78,
  behaviour: 'erratic',
  lootTableId: 'caveBat',
  raisable: false,
  eliteOk: false,
  xpLevelDrop: 3,
};
export const caveBatSwarm: EnemyDef = {
  ...caveBat,
  id: 'caveBatSwarm',
  name: 'Cave Bat Swarm',
  cost: 2,
  pack: { member: 'caveBat', count: [5, 7], levelDrop: 0 },
  tip: 'A flapping swarm. They zigzag, so stay moving!',
};
export const goblinMiner: EnemyDef = {
  id: 'goblinMiner',
  name: 'Goblin Miner',
  ...minesDrawn(MinesFrame.miner),
  baseHp: 34,
  baseDamage: 12,
  speed: 38,
  behaviour: 'custom',
  custom: 'miner',
  lootTableId: 'goblinMiner',
  cost: 1,
  placement: 'back',
  tip: 'Throws a pickaxe that comes back like a boomerang.',
  maxPerWave: 3,
  maxAlive: 3,
};
export const crystalBeetle: EnemyDef = {
  id: 'crystalBeetle',
  name: 'Crystal Beetle',
  ...minesDrawn(MinesFrame.beetle),
  baseHp: 46,
  baseDamage: 11,
  speed: 32,
  behaviour: 'chaser',
  lootTableId: 'crystalBeetle',
  cost: 2,
  raisable: false,
  shield: { arc: 2.6, reduction: 0.8, turnRate: 1.2 },
  shieldGlint: MinesFrame.beetleGlint,
  tip: 'Its shell blocks shots from the front. Hit it from the side!',
};
export const rockMole: EnemyDef = {
  id: 'rockMole',
  name: 'Rock Mole',
  ...minesDrawn(MinesFrame.mole),
  baseHp: 44,
  baseDamage: 17,
  speed: 62,
  behaviour: 'custom',
  custom: 'mole',
  lootTableId: 'rockMole',
  cost: 2,
  raisable: false,
  tip: 'Digs under you. Move when the dirt mound shakes!',
  maxPerWave: 2,
};
export const shardWisp: EnemyDef = {
  id: 'shardWisp',
  name: 'Shard Wisp',
  ...minesDrawn(MinesFrame.wisp),
  baseHp: 19,
  baseDamage: 7,
  speed: 50,
  behaviour: 'custom',
  custom: 'shard',
  lootTableId: 'shardWisp',
  raisable: false,
  tip: 'Bursts into flying shards when it pops. Shoot it from far away!',
};
export const hookjawSpider: EnemyDef = {
  id: 'hookjawSpider',
  name: 'Hookjaw Spider',
  ...minesDrawn(MinesFrame.spider),
  baseHp: 48,
  baseDamage: 14,
  speed: 46,
  behaviour: 'custom',
  custom: 'spider',
  lootTableId: 'hookjawSpider',
  cost: 2,
  raisable: false,
  tip: 'Shoots a silk line to reel you in. Step aside or dash to break free!',
  maxPerWave: 2,
  maxAlive: 2,
};

export const ruinsMonsters = [ratSwarm, bombBeetle, skeletonArcher, wisp, necromancer];
export const desertMonsters = [fireImp, cactusTurret, mummyPriest, sandShark, dustDevil];
export const palaceMonsters = [jester, mirrorKnight, houndmaster, gargoyle, twinMages];
export const sewerMonsters = [sewerRatSwarm, sludgeBlob, pipeSpitter, bloatToad, sewerGator, moldShroom];
export const minesMonsters = [caveBatSwarm, goblinMiner, crystalBeetle, rockMole, shardWisp, hookjawSpider];

/** Every new monster def, including pack members that are not in any level pool. */
export const newMonsters: EnemyDef[] = [rat, ...ruinsMonsters, ...desertMonsters, ...palaceMonsters, twinMage, hound, ...sewerMonsters, sewerRat, sludgeBlobSmall, ...minesMonsters, caveBat];
