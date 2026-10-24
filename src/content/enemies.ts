import { Frame } from './assetKeys';

export interface EnemyDef {
  id: string;
  frame: number;
  baseHp: number;
  baseDamage: number;
  speed: number;
  behaviour: 'chaser' | 'erratic';
  tint?: number;
}

export const slime: EnemyDef = { id: 'slime', frame: Frame.slime, baseHp: 20, baseDamage: 8, speed: 32, behaviour: 'chaser' };
export const bat: EnemyDef = { id: 'bat', frame: Frame.bat, baseHp: 10, baseDamage: 5, speed: 70, behaviour: 'erratic' };
export const cyclops: EnemyDef = { id: 'cyclops', frame: Frame.cyclops, baseHp: 50, baseDamage: 16, speed: 26, behaviour: 'chaser' };

export const enemies: EnemyDef[] = [slime, bat, cyclops];
