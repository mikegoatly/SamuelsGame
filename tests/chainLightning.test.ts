import { describe, expect, it } from 'vitest';
import { chainDamage, chainTargets, type ChainTuning } from '../src/logic/chainLightning';

const tuning: ChainTuning = { coneDeg: 60, coneRange: 100, jumps: 4, jumpRange: 50, falloff: 0.8 };
const seeAll = () => true;
const origin = { x: 0, y: 0 };
const right = { x: 1, y: 0 };
const at = (x: number, y: number) => ({ x, y, reach: 4 });

describe('chainTargets', () => {
  it('starts with the nearest enemy inside the aim cone', () => {
    const targets = [at(80, 0), at(40, 5), at(0, 30)];
    expect(chainTargets(origin, right, tuning, targets, seeAll)[0]).toBe(1);
  });

  it('ignores enemies outside the cone or beyond its range', () => {
    expect(chainTargets(origin, right, tuning, [at(0, 30), at(-30, 0), at(150, 0)], seeAll)).toEqual([]);
  });

  it('requires line of sight to the first target', () => {
    const blocked = (_from: { x: number; y: number }, to: { x: number; y: number }) => to.x !== 40;
    expect(chainTargets(origin, right, tuning, [at(40, 0), at(60, 0)], blocked)).toEqual([1]);
  });

  it('jumps to the nearest unused enemy in range, up to the jump limit', () => {
    const targets = [at(30, 0), at(60, 0), at(90, 0), at(120, 0), at(150, 0), at(180, 0), at(210, 0)];
    expect(chainTargets(origin, right, tuning, targets, seeAll)).toEqual([0, 1, 2, 3, 4]);
  });

  it('does not jump beyond the jump range or revisit an enemy', () => {
    expect(chainTargets(origin, right, tuning, [at(30, 0), at(120, 0)], seeAll)).toEqual([0]);
    expect(chainTargets(origin, right, tuning, [at(30, 0)], seeAll)).toEqual([0]);
  });

  it('needs line of sight for each jump', () => {
    const wallBetween = (from: { x: number; y: number }, to: { x: number; y: number }) => !(from.x === 30 && to.x === 60);
    expect(chainTargets(origin, right, tuning, [at(30, 0), at(60, 0)], wallBetween)).toEqual([0]);
  });
});

describe('chainDamage', () => {
  it('falls off on each jump', () => {
    expect(chainDamage(20, 0.8, 0)).toBe(20);
    expect(chainDamage(20, 0.8, 1)).toBeCloseTo(16);
    expect(chainDamage(20, 0.8, 4)).toBeCloseTo(20 * 0.8 ** 4);
  });
});
