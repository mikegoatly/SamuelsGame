import { describe, expect, it } from 'vitest';
import { stragglerOf } from '../src/logic/straggler';
import type { EnemyInfo, LevelCurve } from '../src/logic/waveMix';
import { sequenceRng } from './builders';

const curve: LevelCurve = {
  intro: ['b', 'c'],
  waves: [2],
  size: { base: 4, perRoom: 0, perWave: 0, max: 10 },
  elite: { fromRoom: 9, base: 0, perRoom: 0, max: 0 },
};
const infos: Record<string, EnemyInfo> = {
  a: { cost: 1, role: 'back', eliteOk: true },
  b: { cost: 1, role: 'front', eliteOk: true },
  c: { cost: 5, role: 'front', eliteOk: true },
};
const pool = [{ enemyId: 'a', weight: 1 }, { enemyId: 'b', weight: 1 }, { enemyId: 'c', weight: 1 }];
const info = (id: string): EnemyInfo => infos[id]!;

describe('stragglerOf', () => {
  it.each([
    [1, 0, 'a'],
    [1, 0.99, 'b'],
    [2, 0.99, 'b'],
  ])('room %d with roll %d picks %s (cheap, available monsters only)', (order, roll, expected) => {
    expect(stragglerOf(pool, curve, order, [2, 4], info, sequenceRng(roll)).enemyId).toBe(expected);
  });

  it('uses the top of the room level range, its natural role and no affix', () => {
    const spawn = stragglerOf(pool, curve, 2, [2, 4], info, sequenceRng(0.99));
    expect(spawn).toMatchObject({ enemyId: 'b', level: 4, role: 'front' });
    expect(spawn.affix).toBeUndefined();
  });

  it('falls back to any available monster when everything is expensive', () => {
    const spawn = stragglerOf([{ enemyId: 'c', weight: 1 }], { ...curve, intro: [] }, 1, [1, 1], info, sequenceRng(0));
    expect(spawn.enemyId).toBe('c');
  });
});
