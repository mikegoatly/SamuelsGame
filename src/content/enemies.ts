import type { BossBrainConfig } from '../logic/bossBrain';
import type { ChargeTuning } from '../logic/charge';
import { Frame, Tex } from './assetKeys';
import { sandWyrmBrain, stoneGuardianBrain } from './bosses';

export interface EnemyDef {
  id: string;
  frame: number;
  baseHp: number;
  baseDamage: number;
  speed: number;
  behaviour: 'chaser' | 'erratic' | 'ranged' | 'charger' | 'boss';
  lootTableId: string;
  tint?: number;
  name?: string;
  /** Generated texture key used instead of the tile sheet (frame 0). */
  texture?: string;
  scale?: number;
  boss?: boolean;
  fireEveryMs?: number;
  shotSpeed?: number;
  /** Ranged enemies fire `count` bolts fanned over `arc` radians instead of one. */
  spread?: { count: number; arc: number };
  charge?: ChargeTuning;
  brain?: BossBrainConfig;
  slamDamage?: number;
  boltDamage?: number;
  boltSpeed?: number;
}

export const slime: EnemyDef = { id: 'slime', frame: Frame.slime, baseHp: 20, baseDamage: 8, speed: 32, behaviour: 'chaser', lootTableId: 'slime' };
export const bat: EnemyDef = { id: 'bat', frame: Frame.bat, baseHp: 10, baseDamage: 5, speed: 70, behaviour: 'erratic', lootTableId: 'bat' };
export const cyclops: EnemyDef = { id: 'cyclops', frame: Frame.cyclops, baseHp: 50, baseDamage: 16, speed: 26, behaviour: 'chaser', lootTableId: 'cyclops' };

export const spider: EnemyDef = { id: 'spider', frame: Frame.spider, baseHp: 12, baseDamage: 6, speed: 88, behaviour: 'chaser', lootTableId: 'bat' };
export const ghost: EnemyDef = {
  id: 'ghost',
  frame: Frame.ghost,
  baseHp: 14,
  baseDamage: 7,
  speed: 38,
  behaviour: 'ranged',
  lootTableId: 'ghost',
  fireEveryMs: 1800,
  shotSpeed: 70,
};
export const stoneGuardian: EnemyDef = {
  id: 'stoneGuardian',
  name: 'Stone Guardian',
  frame: Frame.cyclops,
  baseHp: 380,
  baseDamage: 14,
  speed: 34,
  behaviour: 'boss',
  lootTableId: 'stoneGuardian',
  texture: Tex.stoneGuardian,
  tint: 0xc4cce0,
  scale: 2.5,
  boss: true,
  brain: stoneGuardianBrain,
  slamDamage: 22,
  boltDamage: 9,
  boltSpeed: 90,
};

export const scorpion: EnemyDef = {
  id: 'scorpion',
  name: 'Scorpion',
  frame: Frame.crab,
  baseHp: 26,
  baseDamage: 11,
  speed: 42,
  behaviour: 'charger',
  lootTableId: 'scorpion',
  tint: 0xffd890,
  charge: { triggerRange: 110, windupMs: 600, dashMs: 380, recoverMs: 800, dashSpeed: 290 },
};
export const bandit: EnemyDef = {
  id: 'bandit',
  name: 'Bandit',
  frame: Frame.bandit,
  baseHp: 22,
  baseDamage: 6,
  speed: 40,
  behaviour: 'ranged',
  lootTableId: 'bandit',
  fireEveryMs: 2300,
  shotSpeed: 95,
  spread: { count: 3, arc: 0.5 },
};
export const mummy: EnemyDef = {
  id: 'mummy',
  name: 'Mummy',
  frame: Frame.ghost,
  baseHp: 80,
  baseDamage: 14,
  speed: 24,
  behaviour: 'chaser',
  lootTableId: 'mummy',
  tint: 0xd8c890,
  scale: 1.35,
};
export const vulture: EnemyDef = {
  id: 'vulture',
  name: 'Vulture',
  frame: Frame.bat,
  baseHp: 12,
  baseDamage: 6,
  speed: 80,
  behaviour: 'erratic',
  lootTableId: 'vulture',
  tint: 0xd0a070,
};
export const sandWyrm: EnemyDef = {
  id: 'sandWyrm',
  name: 'Sand Wyrm',
  frame: Frame.serpent,
  baseHp: 860,
  baseDamage: 14,
  speed: 30,
  behaviour: 'boss',
  lootTableId: 'sandWyrm',
  tint: 0xf0c060,
  scale: 3,
  boss: true,
  brain: sandWyrmBrain,
  slamDamage: 20,
  boltDamage: 8,
  boltSpeed: 95,
};

export const enemies: EnemyDef[] = [slime, bat, cyclops, spider, ghost, stoneGuardian, scorpion, bandit, mummy, vulture, sandWyrm];

export const getEnemy = (id: string): EnemyDef => enemies.find((e) => e.id === id) ?? slime;
