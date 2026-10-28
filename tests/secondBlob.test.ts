import { describe, expect, it, vi } from 'vitest';
import { KnockoutRules, SECOND_BLOB, secondBlobHp } from '../src/logic/secondBlob';
import { passiveEffects } from '../src/logic/passives';

describe('secondBlobHp', () => {
  it.each([
    [100, 30],
    [150, 45],
    [33, 10],
    [1, 1],
  ])('max %i comes back at %i', (max, expected) => {
    expect(secondBlobHp(max)).toBe(expected);
  });
});

describe('KnockoutRules', () => {
  const never = () => false;

  it('lets a hero without the passive die or use a revive as before', () => {
    expect(new KnockoutRules(false).resolve(never)).toBe('die');
    expect(new KnockoutRules(false).resolve(() => true)).toBe('revive');
  });

  it('Second Blob saves once, and does not spend the revive token', () => {
    const reviver = vi.fn(() => true);
    const rules = new KnockoutRules(true);
    expect(rules.resolve(reviver)).toBe('secondBlob');
    expect(reviver).not.toHaveBeenCalled();
    expect(rules.used).toBe(true);
  });

  it('after Second Blob a later lethal hit uses the revive token, then dies', () => {
    const rules = new KnockoutRules(true);
    rules.resolve(never);
    expect(rules.resolve(() => true)).toBe('revive');
    expect(rules.resolve(never)).toBe('die');
  });

  it('a second lethal hit without a token kills', () => {
    const rules = new KnockoutRules(true);
    rules.resolve(never);
    expect(rules.resolve(never)).toBe('die');
  });

  it('does nothing once the run has ended', () => {
    const reviver = vi.fn(() => true);
    const rules = new KnockoutRules(true);
    expect(rules.resolve(reviver, true)).toBe('die');
    expect(reviver).not.toHaveBeenCalled();
    expect(rules.used).toBe(false);
  });

  it('a fresh rule set (a retry) is ready again', () => {
    const first = new KnockoutRules(true);
    first.resolve(never);
    expect(new KnockoutRules(true).resolve(never)).toBe('secondBlob');
  });
});

describe('Second Blob numbers', () => {
  it('is 30% HP, about 1.5s of safety and a 0.75 scale', () => {
    expect(SECOND_BLOB).toMatchObject({ hpFraction: 0.3, iframesMs: 1500, scale: 0.75 });
  });

  it('is a passive effect of its own', () => {
    expect(passiveEffects('secondBlob')).toMatchObject({ secondBlob: true, trail: true });
    expect(passiveEffects('quickCasting')).toMatchObject({ secondBlob: false, trail: false });
  });
});
