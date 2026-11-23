import { describe, expect, it } from 'vitest';
import { cardLines, cardRows, MERGED_HEIGHT } from '../src/logic/levelCardLayout';

describe('cardRows', () => {
  it.each([
    [98, 4],
    [78, 4],
    [64, 4],
    [MERGED_HEIGHT - 1, 3],
    [47, 3],
  ])('a %i px card has %i rows', (height, count) => {
    expect(cardRows(height)).toHaveLength(count);
  });

  it.each([98, 78, 64, 47, 46])('rows fit inside a %i px card with room for a 16px line', (height) => {
    const rows = cardRows(height);
    expect(rows[0]).toBeGreaterThanOrEqual(8);
    expect(rows[rows.length - 1]! + 8).toBeLessThanOrEqual(height);
  });

  it('rows are at least 14px apart', () => {
    for (const height of [98, 78, 64, 47, 46]) {
      const rows = cardRows(height);
      rows.slice(1).forEach((row, i) => expect(row - rows[i]!).toBeGreaterThanOrEqual(14));
    }
  });
});

describe('cardLines', () => {
  it('keeps all survival lines on a tall card', () => {
    expect(cardLines(['a', 'b', 'c'], 98)).toEqual(['a', 'b', 'c']);
  });
  it('drops the first survival line on a merged card', () => {
    expect(cardLines(['a', 'b', 'c'], 47)).toEqual(['b', 'c']);
  });
});
