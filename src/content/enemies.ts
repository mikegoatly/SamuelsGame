import type { BossBrainConfig } from '../logic/bossBrain';
import type { BlinkTuning } from '../logic/blink';
import type { ChargeTuning } from '../logic/charge';
import type { Shield } from '../logic/shield';
import { Frame, Tex } from './assetKeys';
import { madKingBrain, sandRatBrain, stoneGuardianBrain } from './bosses';

export interface EnemyDef {
  id: string;
  frame: number;
  baseHp: number;
  baseDamage: number;
  speed: number;
  behaviour: 'chaser' | 'erratic' | 'ranged' | 'charger' | 'mage' | 'boss';
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
  /** Takes reduced damage from the front; the shield turns slowly toward the player. */
  shield?: Shield;
  /** Ranged enemies aim where the player is going rather than where they are. */
  lead?: boolean;
  /** Orbs steer toward the player for `ms` at `turnRate` radians per second. */
  homing?: { turnRate: number; ms: number };
  /** Mages teleport away when the player closes in, then fire an orb. */
  blink?: BlinkTuning;
  /** Charger alpha while stalking (assassins fade out until they strike). */
  cloak?: number;
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
  baseHp: 455,
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
export const sandRat: EnemyDef = {
  id: 'sandRat',
  name: 'Sand Rat',
  frame: Frame.serpent,
  baseHp: 1030,
  baseDamage: 14,
  speed: 30,
  behaviour: 'boss',
  lootTableId: 'sandRat',
  tint: 0xf0c060,
  scale: 3,
  boss: true,
  brain: sandRatBrain,
  slamDamage: 20,
  boltDamage: 8,
  boltSpeed: 95,
};

export const palaceGuard: EnemyDef = {
  id: 'palaceGuard',
  name: 'Palace Guard',
  frame: Frame.knightVisor,
  baseHp: 80,
  baseDamage: 17,
  speed: 27,
  behaviour: 'chaser',
  lootTableId: 'palaceGuard',
  tint: 0xc8d4ff,
  scale: 1.15,
  shield: { arc: 2.6, reduction: 0.55, turnRate: 1.3 },
};
export const royalArcher: EnemyDef = {
  id: 'royalArcher',
  name: 'Royal Archer',
  frame: Frame.knightGrey,
  baseHp: 26,
  baseDamage: 11,
  speed: 36,
  behaviour: 'ranged',
  lootTableId: 'royalArcher',
  tint: 0xffc080,
  fireEveryMs: 2200,
  shotSpeed: 140,
  lead: true,
};
export const darkMage: EnemyDef = {
  id: 'darkMage',
  name: 'Dark Mage',
  frame: Frame.hooded,
  baseHp: 32,
  baseDamage: 12,
  speed: 34,
  behaviour: 'mage',
  lootTableId: 'darkMage',
  tint: 0xb878ff,
  fireEveryMs: 3400,
  shotSpeed: 62,
  homing: { turnRate: 1.3, ms: 2600 },
  blink: { triggerRange: 62, distance: 85, vanishMs: 350, castDelayMs: 300, cooldownMs: 4500 },
};
export const assassin: EnemyDef = {
  id: 'assassin',
  name: 'Assassin',
  frame: Frame.bandit,
  baseHp: 20,
  baseDamage: 15,
  speed: 64,
  behaviour: 'charger',
  lootTableId: 'assassin',
  tint: 0x7878a8,
  charge: { triggerRange: 80, windupMs: 350, dashMs: 240, recoverMs: 900, dashSpeed: 340 },
  cloak: 0.14,
};
export const madKing: EnemyDef = {
  id: 'madKing',
  name: 'Mad King',
  frame: Frame.horned,
  baseHp: 1800,
  baseDamage: 18,
  speed: 40,
  behaviour: 'boss',
  lootTableId: 'madKing',
  tint: 0xffd070,
  scale: 3,
  boss: true,
  brain: madKingBrain,
  slamDamage: 20,
  boltDamage: 11,
  boltSpeed: 85,
};

export const enemies: EnemyDef[] = [slime, bat, cyclops, spider, ghost, stoneGuardian, scorpion, bandit, mummy, vulture, sandRat, palaceGuard, royalArcher, darkMage, assassin, madKing];

export const getEnemy = (id: string): EnemyDef => enemies.find((e) => e.id === id) ?? slime;
