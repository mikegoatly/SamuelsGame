import { Frame } from './assetKeys';

export interface EnemyDef {
  id: string;
  frame: number;
  baseHp: number;
  baseDamage: number;
  speed: number;
  behaviour: 'chaser' | 'erratic';
  lootTableId: string;
  tint?: number;
}

export const slime: EnemyDef = { id: 'slime', frame: Frame.slime, baseHp: 20, baseDamage: 8, speed: 32, behaviour: 'chaser', lootTableId: 'slime' };
export const bat: EnemyDef = { id: 'bat', frame: Frame.bat, baseHp: 10, baseDamage: 5, speed: 70, behaviour: 'erratic', lootTableId: 'bat' };
export const cyclops: EnemyDef = { id: 'cyclops', frame: Frame.cyclops, baseHp: 50, baseDamage: 16, speed: 26, behaviour: 'chaser', lootTableId: 'cyclops' };

export const enemies: EnemyDef[] = [slime, bat, cyclops];

export const getEnemy = (id: string): EnemyDef => enemies.find((e) => e.id === id) ?? slime;
