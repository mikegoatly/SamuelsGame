import { Frame, MonsterFrame, Tex } from './assetKeys';
import type { EnemyDef } from './enemies';

/** Hand-drawn sprite from the extra monster sheet. */
const drawn = (frame: number): Pick<EnemyDef, 'texture' | 'textureFrame' | 'frame'> => ({ texture: Tex.monsters, textureFrame: frame, frame: 0 });

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
  pack: { member: 'rat', count: [8, 12], levelDrop: 0 },
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
  blastDamage: 18,
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
  baseHp: 70,
  baseDamage: 16,
  speed: 26,
  behaviour: 'chaser',
  lootTableId: 'mirrorKnight',
  tint: 0xb8f0ff,
  scale: 1.15,
  shield: { arc: 2.4, reduction: 0.5, turnRate: 1.1 },
  reflect: { damageScale: 0.7 },
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
  blastDamage: 16,
  placement: 'back',
};
export const gargoyle: EnemyDef = {
  id: 'gargoyle',
  name: 'Gargoyle',
  ...drawn(MonsterFrame.gargoyle),
  baseHp: 64,
  baseDamage: 15,
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
  baseHp: 20,
  baseDamage: 9,
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
  baseHp: 50,
  baseDamage: 14,
  speed: 30,
  behaviour: 'custom',
  custom: 'houndmaster',
  lootTableId: 'houndmaster',
  tint: 0xe09040,
  scale: 1.15,
  cost: 3,
  pack: { member: 'hound', count: [3, 3], leader: true },
};

export const ruinsMonsters = [ratSwarm, bombBeetle, skeletonArcher, wisp, necromancer];
export const desertMonsters = [fireImp, cactusTurret, mummyPriest, sandShark, dustDevil];
export const palaceMonsters = [jester, mirrorKnight, houndmaster, gargoyle, twinMages];

/** Every new monster def, including pack members that are not in any level pool. */
export const newMonsters: EnemyDef[] = [rat, ...ruinsMonsters, ...desertMonsters, ...palaceMonsters, twinMage, hound];
