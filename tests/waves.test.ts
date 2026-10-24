import { describe, expect, it } from 'vitest';
import { pickSpawnPoint } from '../src/logic/spawnPoints';
import { waveEnemyLevels } from '../src/logic/waves';
import { sequenceRng } from './builders';

describe('waveEnemyLevels', () => {
  it.each([
    [1, [1, 1, 2]],
    [2, [1, 1, 2, 1]],
    [3, [2, 2, 3, 2, 2]],
  ])('wave %i => %j', (wave, expected) => {
    expect(waveEnemyLevels(wave)).toEqual(expected);
  });

  it('grows in count and caps level at 4 and count at 12', () => {
    expect(waveEnemyLevels(4).length).toBeGreaterThan(waveEnemyLevels(3).length);
    const late = waveEnemyLevels(99);
    expect(late).toHaveLength(12);
    expect(Math.max(...late)).toBe(4);
    expect(Math.min(...late)).toBeGreaterThanOrEqual(1);
  });
});

describe('pickSpawnPoint', () => {
  const grid = { cols: 10, rows: 10, tileSize: 16 };

  it('stays inside the inner floor', () => {
    const point = pickSpawnPoint(grid, { x: 0, y: 0 }, 0, sequenceRng(0, 0));
    expect(point).toEqual({ x: 2 * 16 + 8, y: 2 * 16 + 8 });
    const far = pickSpawnPoint(grid, { x: 0, y: 0 }, 0, sequenceRng(0.999, 0.999));
    expect(far).toEqual({ x: 7 * 16 + 8, y: 7 * 16 + 8 });
  });

  it('rejects points too close to the avoid position', () => {
    const avoid = { x: 40, y: 40 };
    const point = pickSpawnPoint(grid, avoid, 60, sequenceRng(0, 0, 0.999, 0.999));
    expect(point).toEqual({ x: 7 * 16 + 8, y: 7 * 16 + 8 });
  });

  it('falls back to the farthest candidate when none is far enough', () => {
    const point = pickSpawnPoint(grid, { x: 40, y: 40 }, 10_000, sequenceRng(0, 0, 0.999, 0.999));
    expect(point).toEqual({ x: 7 * 16 + 8, y: 7 * 16 + 8 });
  });
});
