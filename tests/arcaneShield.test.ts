import { describe, expect, it } from 'vitest';
import { absorb, newShield, shieldActive, shieldBurstDamage } from '../src/logic/arcaneShield';

describe('arcane shield', () => {
  it('absorbs damage up to its capacity and lets the rest through', () => {
    const shield = newShield(1000, 3000, 40);
    expect(absorb(shield, 25)).toBe(0);
    expect(shield.remaining).toBe(15);
    expect(absorb(shield, 25)).toBe(10);
    expect(shield.remaining).toBe(0);
  });

  it('is active until it expires or is spent', () => {
    const shield = newShield(1000, 3000, 40);
    expect(shieldActive(shield, 1000)).toBe(true);
    expect(shieldActive(shield, 3999)).toBe(true);
    expect(shieldActive(shield, 4000)).toBe(false);
    absorb(shield, 40);
    expect(shieldActive(shield, 1500)).toBe(false);
  });

  it('passes damage straight through once spent', () => {
    const shield = newShield(0, 3000, 10);
    absorb(shield, 10);
    expect(absorb(shield, 7)).toBe(7);
  });
});

describe('shieldBurstDamage', () => {
  it('scales with the shield capacity so higher levels burst harder', () => {
    expect(shieldBurstDamage(40)).toBe(20);
    expect(shieldBurstDamage(80)).toBeGreaterThan(shieldBurstDamage(40));
  });
});
