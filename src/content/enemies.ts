import { Frame, Tex } from './assetKeys';

export interface EnemyDef {
  id: string;
  frame: number;
  baseHp: number;
  baseDamage: number;
  speed: number;
  behaviour: 'chaser' | 'erratic' | 'ranged' | 'boss';
  lootTableId: string;
  tint?: number;
  name?: string;
  /** Generated texture key used instead of the tile sheet (frame 0). */
  texture?: string;
  scale?: number;
  boss?: boolean;
  fireEveryMs?: number;
  shotSpeed?: number;
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
};

export const enemies: EnemyDef[] = [slime, bat, cyclops, spider, ghost, stoneGuardian];

export const getEnemy = (id: string): EnemyDef => enemies.find((e) => e.id === id) ?? slime;
