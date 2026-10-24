import { describe, expect, it } from 'vitest';
import { solidAt, type TileLookup } from '../src/logic/solidity';

const bounds = { width: 100, height: 100 };
const floor: TileLookup = () => ({ collides: false });
const wallRightOf = (x: number): TileLookup => (px) => (px >= x ? { collides: true } : { collides: false });

describe('solidAt', () => {
  it('does not treat floor tiles that merely exist as solid (training arena ground)', () => {
    expect(solidAt(bounds, [floor], 50, 50)).toBe(false);
  });

  it('is solid on colliding tiles in any layer', () => {
    expect(solidAt(bounds, [floor, wallRightOf(60)], 70, 50)).toBe(true);
    expect(solidAt(bounds, [floor, wallRightOf(60)], 40, 50)).toBe(false);
  });

  it('treats empty cells as open and anything outside the map as solid', () => {
    expect(solidAt(bounds, [() => null], 50, 50)).toBe(false);
    for (const [x, y] of [[-1, 5], [5, -1], [100, 5], [5, 100]] as const) expect(solidAt(bounds, [floor], x, y)).toBe(true);
  });
});
