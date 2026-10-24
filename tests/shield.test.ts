import { describe, expect, it } from 'vitest';
import { isFrontal, shieldedDamage } from '../src/logic/shield';

const shield = { arc: Math.PI, reduction: 0.5 };

describe('isFrontal', () => {
  it('is true for attackers within the front arc and false behind', () => {
    expect(isFrontal(0, { x: 10, y: 0 }, shield.arc)).toBe(true);
    expect(isFrontal(0, { x: 10, y: 9 }, shield.arc)).toBe(true);
    expect(isFrontal(0, { x: -10, y: 1 }, shield.arc)).toBe(false);
  });

  it('wraps the facing angle across +-pi', () => {
    expect(isFrontal(Math.PI, { x: -10, y: -2 }, shield.arc)).toBe(true);
    expect(isFrontal(-Math.PI + 0.1, { x: -10, y: 2 }, 1)).toBe(true);
    expect(isFrontal(Math.PI, { x: 10, y: 0 }, shield.arc)).toBe(false);
  });

  it('a narrow arc leaves the flanks open', () => {
    expect(isFrontal(0, { x: 0, y: 10 }, 1.2)).toBe(false);
  });
});

describe('shieldedDamage', () => {
  it('cuts frontal damage but never below 1, and leaves back hits alone', () => {
    expect(shieldedDamage(20, true, shield.reduction)).toBe(10);
    expect(shieldedDamage(1, true, 0.9)).toBe(1);
    expect(shieldedDamage(20, false, shield.reduction)).toBe(20);
  });
});
