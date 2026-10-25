import { describe, expect, it } from 'vitest';
import { frontalDamage, GoldBonus, MAX_SKELETONS, passiveEffects, potionHeal, risesAgain, Strikes, type PassiveId } from '../src/logic/passives';
import { sequenceRng } from './builders';

describe('passiveEffects', () => {
  it('is neutral for a passive with no numbers of its own', () => {
    expect(passiveEffects('quickCasting').goldMultiplier).toBe(1);
    expect(passiveEffects('quickCasting').frontalReduction).toBe(0);
  });

  it('gives each passive its own effect', () => {
    const ids: PassiveId[] = ['frontGuard', 'daggerTrap', 'prospector', 'longShot', 'stunStreak', 'risenDead', 'fortune'];
    expect(passiveEffects('frontGuard').frontalReduction).toBe(0.2);
    expect(passiveEffects('daggerTrap').dashTrap).toBe(true);
    expect(passiveEffects('prospector')).toMatchObject({ goldMultiplier: 1.25, potionMultiplier: 1.5 });
    expect(passiveEffects('longShot')).toMatchObject({ critDistance: 120, critMultiplier: 1.5 });
    expect(passiveEffects('stunStreak')).toMatchObject({ stunEvery: 5, stunMs: 800 });
    expect(passiveEffects('risenDead').riseChance).toBe(0.15);
    expect(passiveEffects('fortune').luck).toBeGreaterThan(0);
    for (const id of ids) expect(passiveEffects(id)).not.toEqual(passiveEffects('quickCasting'));
  });
});

describe('frontalDamage (knight)', () => {
  const fx = passiveEffects('frontGuard');

  it('takes 20% less from attackers in front', () => {
    expect(frontalDamage(10, 0, { x: 30, y: 0 }, fx)).toBe(8);
    expect(frontalDamage(10, 0, { x: 30, y: 10 }, fx)).toBe(8);
  });

  it('takes full damage from the sides and back', () => {
    expect(frontalDamage(10, 0, { x: 0, y: 30 }, fx)).toBe(10);
    expect(frontalDamage(10, 0, { x: -30, y: 0 }, fx)).toBe(10);
  });

  it('follows the facing and never drops below 1', () => {
    expect(frontalDamage(10, Math.PI, { x: -30, y: 0 }, fx)).toBe(8);
    expect(frontalDamage(1, 0, { x: 30, y: 0 }, fx)).toBe(1);
  });

  it('does nothing for heroes without the passive', () => {
    expect(frontalDamage(10, 0, { x: 30, y: 0 }, passiveEffects('quickCasting'))).toBe(10);
  });

  it('applies to melee, ranged and boss attacks but not hazards', () => {
    for (const source of ['melee', 'ranged', 'boss'] as const) expect(frontalDamage(10, 0, { x: 30, y: 0 }, fx, source), source).toBe(8);
    expect(frontalDamage(10, 0, { x: 30, y: 0 }, fx, 'hazard')).toBe(10);
  });
});

describe('Strikes', () => {
  it('ranger crits only from beyond 120px', () => {
    const strikes = new Strikes(passiveEffects('longShot'));
    expect(strikes.strike(121).multiplier).toBe(1.5);
    expect(strikes.strike(120).multiplier).toBe(1);
    expect(strikes.strike(40).multiplier).toBe(1);
  });

  it('monk stuns on every fifth hit for 0.8s', () => {
    const strikes = new Strikes(passiveEffects('stunStreak'));
    const stuns = Array.from({ length: 10 }, () => strikes.strike(10).stunMs);
    expect(stuns).toEqual([0, 0, 0, 0, 800, 0, 0, 0, 0, 800]);
  });

  it('is plain for heroes without either passive', () => {
    const strikes = new Strikes(passiveEffects('quickCasting'));
    expect(strikes.strike(500)).toEqual({ multiplier: 1, stunMs: 0 });
  });
});

describe('GoldBonus (dwarf)', () => {
  it('carries the fraction so small coins still add up to +25%', () => {
    const bonus = new GoldBonus(1.25);
    const total = Array.from({ length: 100 }, () => bonus.apply(1)).reduce((a, b) => a + b, 0);
    expect(total).toBe(125);
  });

  it('is exact for piles it divides evenly and neutral at 1', () => {
    expect(new GoldBonus(1.25).apply(20)).toBe(25);
    expect(new GoldBonus(1).apply(7)).toBe(7);
  });
});

describe('potionHeal', () => {
  it('heals 50% more for the dwarf and is unchanged otherwise', () => {
    expect(potionHeal(40, passiveEffects('prospector'))).toBe(60);
    expect(potionHeal(40, passiveEffects('quickCasting'))).toBe(40);
  });
});

describe('risesAgain (necromancer)', () => {
  const fx = passiveEffects('risenDead');
  const kill = { boss: false, byAlly: false, live: 0 };

  it('rolls under the chance for ordinary enemies only', () => {
    expect(risesAgain(fx, sequenceRng(0.1), kill)).toBe(true);
    expect(risesAgain(fx, sequenceRng(0.15), kill)).toBe(false);
    expect(risesAgain(fx, sequenceRng(0.01), { ...kill, boss: true })).toBe(false);
  });

  it('allies killing enemies never raise more', () => {
    expect(risesAgain(fx, sequenceRng(0.01), { ...kill, byAlly: true })).toBe(false);
  });

  it('stops at the live skeleton cap', () => {
    expect(MAX_SKELETONS).toBe(3);
    expect(risesAgain(fx, sequenceRng(0.01), { ...kill, live: 2 })).toBe(true);
    expect(risesAgain(fx, sequenceRng(0.01), { ...kill, live: 3 })).toBe(false);
  });

  it('never for heroes without the passive', () => {
    expect(risesAgain(passiveEffects('quickCasting'), sequenceRng(0), kill)).toBe(false);
  });
});
