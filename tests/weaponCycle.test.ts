import { describe, expect, it } from 'vitest';
import { nextWeapon } from '../src/logic/weaponCycle';

const owned = ['apprenticeStaff', 'brokenWand', 'goldenSword'];

describe('nextWeapon', () => {
  it('steps forward and wraps', () => {
    expect(nextWeapon(owned, 'apprenticeStaff', 1)).toBe('brokenWand');
    expect(nextWeapon(owned, 'goldenSword', 1)).toBe('apprenticeStaff');
  });

  it('steps backward and wraps', () => {
    expect(nextWeapon(owned, 'brokenWand', -1)).toBe('apprenticeStaff');
    expect(nextWeapon(owned, 'apprenticeStaff', -1)).toBe('goldenSword');
  });

  it('keeps a lone weapon and recovers from an unknown current one', () => {
    expect(nextWeapon(['apprenticeStaff'], 'apprenticeStaff', 1)).toBe('apprenticeStaff');
    expect(nextWeapon(owned, 'mystery', 1)).toBe('apprenticeStaff');
    expect(nextWeapon([], 'x', 1)).toBe('x');
  });
});
