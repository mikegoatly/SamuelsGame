import { describe, expect, it } from 'vitest';
import { AFFIXES, SWIFT_SPEED, VOLATILE, affixLabel, armourBar, eliteBonus, rollAffix, splitSpec, vampireHeal } from '../src/logic/elites';
import { WARD_REDUCTION, newWard, wardHit } from '../src/logic/ward';
import { aLootTable, sequenceRng } from './builders';

describe('rollAffix', () => {
  it('can roll every affix and maps the rng range across all of them', () => {
    const rolled = new Set(AFFIXES.map((_, i) => rollAffix(sequenceRng((i + 0.5) / AFFIXES.length))));
    expect(rolled.size).toBe(AFFIXES.length);
    expect(rollAffix(sequenceRng(0.9999))).toBe(AFFIXES[AFFIXES.length - 1]);
  });

  it('has the five proposal affixes with readable labels', () => {
    expect([...AFFIXES].sort()).toEqual(['armoured', 'splitting', 'swift', 'vampiric', 'volatile']);
    for (const affix of AFFIXES) expect(affixLabel(affix).length).toBeGreaterThan(3);
  });
});

describe('armoured ward bar', () => {
  it('halves damage while the bar holds and drains it by the full blow', () => {
    const result = wardHit(newWard(100), 20);
    expect(result.dealt).toBe(Math.round(20 * (1 - WARD_REDUCTION)));
    expect(result.ward?.hp).toBe(80);
    expect(result.broke).toBe(false);
  });

  it('breaks once the bar is spent and then takes full damage', () => {
    const broke = wardHit(newWard(15), 20);
    expect(broke.broke).toBe(true);
    expect(broke.ward).toBeNull();
    expect(broke.dealt).toBe(10);
    expect(wardHit(null, 20)).toEqual({ dealt: 20, ward: null, broke: false });
  });

  it('never deals less than one damage', () => {
    expect(wardHit(newWard(50), 1).dealt).toBe(1);
  });

  it('is sized as a share of max health', () => {
    expect(armourBar(100)).toBe(60);
    expect(armourBar(1)).toBeGreaterThanOrEqual(1);
  });
});

describe('other affixes', () => {
  it('swift is clearly faster', () => {
    expect(SWIFT_SPEED).toBeGreaterThanOrEqual(1.4);
  });

  it('splitting yields two smaller halves that are weaker than the parent and never split again', () => {
    const spec = splitSpec(100);
    expect(spec.count).toBe(2);
    expect(spec.hp).toBeLessThan(100 / 2);
    expect(spec.scale).toBeLessThan(1);
    expect(splitSpec(1).hp).toBeGreaterThanOrEqual(1);
  });

  it('vampiric heals a share of what it dealt, at least 1', () => {
    expect(vampireHeal(10)).toBeGreaterThanOrEqual(5);
    expect(vampireHeal(1)).toBeGreaterThanOrEqual(1);
  });

  it('volatile telegraphs long enough to run away from', () => {
    expect(VOLATILE.telegraphMs).toBeGreaterThanOrEqual(700);
    expect(VOLATILE.radius).toBeGreaterThan(24);
  });
});

describe('elite loot', () => {
  const table = aLootTable({ nothingWeight: 0, entries: [{ itemId: 'coin', weight: 1, rarity: 'common' }] });

  it('adds a bonus roll', () => {
    expect(eliteBonus(table, sequenceRng(0.5, 0.99), 0)).toContain('coin');
  });

  it('sometimes adds a gem on top, picked from all three colours', () => {
    const gems = eliteBonus(table, sequenceRng(0.5, 0.01, 0.5, 0.5, 0.5), 0).filter((id) => id.startsWith('gem'));
    expect(gems).toHaveLength(1);
    expect(eliteBonus(table, sequenceRng(0.5, 0.99), 0).filter((id) => id.startsWith('gem'))).toHaveLength(0);
  });
});
