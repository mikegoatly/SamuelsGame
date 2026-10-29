import { describe, expect, it } from 'vitest';
import { HAZARD_HITS, sustainedFractionPerSecond } from '../src/logic/hazard/hits';
import { LINGERING_BURN_SHARE } from './balanceModel';
import { BURN, Burning, OwedTick, burnTicks, weaponBurnTick } from '../src/logic/burning';

const fire = { fraction: 0.06 };

describe('Burning', () => {
  it('ticks on the beat and stops at expiry', () => {
    const b = new Burning<string>();
    b.ignite('rat', 0, BURN.enemyMs, fire);
    const tickTimes: number[] = [];
    for (let t = 0; t <= 4000; t += 100) if (b.step(t).ticks.length > 0) tickTimes.push(t);
    expect(tickTimes).toEqual([500, 1000, 1500, 2000, 2500, 3000]);
    expect(b.burning('rat')).toBe(false);
  });

  it('refreshing does not stack: same ticks, longer burn', () => {
    const b = new Burning<string>();
    b.ignite('rat', 0, BURN.enemyMs, fire);
    b.ignite('rat', 200, BURN.enemyMs, fire);
    b.ignite('rat', 400, BURN.enemyMs, fire);
    let ticks = 0;
    for (let t = 0; t <= 5000; t += 50) ticks += b.step(t).ticks.length;
    expect(ticks).toBe(burnTicks(3400));
  });

  it('refresh takes the newer power', () => {
    const b = new Burning<string>();
    b.ignite('rat', 0, 3000, { weapon: 1 });
    b.ignite('rat', 100, 3000, { weapon: 5 });
    expect(b.step(500).ticks).toEqual([{ key: 'rat', power: { weapon: 5 } }]);
  });

  it('extinguish clears it with no more ticks', () => {
    const b = new Burning<string>();
    b.ignite('hero', 0, BURN.playerMs, fire);
    expect(b.extinguish('hero')).toBe(true);
    expect(b.extinguish('hero')).toBe(false);
    expect(b.step(500).ticks).toEqual([]);
    expect(b.any).toBe(false);
  });

  it('nothing ticks while locked, and everything is reported ended', () => {
    const b = new Burning<string>();
    b.ignite('a', 0, 3000, fire);
    b.ignite('b', 0, 3000, fire);
    const step = b.step(600, true);
    expect(step.ticks).toEqual([]);
    expect(step.ended.sort()).toEqual(['a', 'b']);
    expect(b.step(1000).ticks).toEqual([]);
  });

  it('a dead target never ticks again, so a burn kill is paid once', () => {
    const b = new Burning<string>();
    b.ignite('a', 0, 3000, fire);
    b.ignite('b', 0, 3000, fire);
    const dead = new Set(['a']);
    const step = b.step(500, false, (k) => !dead.has(k));
    expect(step.ticks.map((t) => t.key)).toEqual(['b']);
    expect(step.ended).toContain('a');
    expect(b.step(1000, false, (k) => !dead.has(k)).ticks.map((t) => t.key)).toEqual(['b']);
  });

  it('reports who stopped burning', () => {
    const b = new Burning<string>();
    b.ignite('a', 0, 1000, fire);
    expect(b.step(500).ended).toEqual([]);
    expect(b.step(1000).ended).toEqual(['a']);
  });
});

describe('burn numbers', () => {
  it('a weapon burn tick is a fraction of the hit, never more than the hit', () => {
    expect(weaponBurnTick(20)).toBeCloseTo(20 * BURN.weaponTickScale);
    expect(BURN.weaponTickScale).toBeLessThan(1);
  });

  it('is kind to the hero: shorter than a monster burn and a small slice of health', () => {
    expect(BURN.playerMs).toBeLessThan(BURN.enemyMs);
    expect(BURN.playerFraction).toBeLessThanOrEqual(0.02);
    expect(burnTicks(BURN.playerMs)).toBe(4);
  });
});

describe('fire pit lingering', () => {
  it.each([
    ['hero', BURN.playerMs],
    ['monster', BURN.enemyMs],
  ])('a %s that left the pit keeps burning for the full time, then stops', (_who, ms) => {
    const b = new Burning<string>();
    for (let t = 0; t <= 1000; t += 16) b.ignite('x', t, ms, { fraction: 0.02 });
    expect(b.burning('x')).toBe(true);
    let after = 0;
    for (let t = 1000; t <= 1000 + ms + 500; t += 16) after += b.step(t).ticks.length;
    expect(after).toBeGreaterThanOrEqual(burnTicks(ms) - 1);
    expect(after).toBeLessThanOrEqual(burnTicks(ms) + 1);
    expect(b.burning('x')).toBe(false);
  });

  it('a pit hurts at least as fast as the burn it leaves behind, per second', () => {
    const burnPerSecond = (BURN.playerFraction * 1000) / BURN.tickMs;
    expect(sustainedFractionPerSecond(HAZARD_HITS.firePit)).toBeGreaterThanOrEqual(burnPerSecond);
  });

  it('a pit plus its lingering burn costs no more than the pit used to alone (0.04)', () => {
    expect(HAZARD_HITS.firePit.fraction + LINGERING_BURN_SHARE).toBeLessThanOrEqual(0.04 + 1e-9);
  });

  it('the balance model counts the lingering burn', () => {
    expect(LINGERING_BURN_SHARE).toBeGreaterThan(0);
    expect(LINGERING_BURN_SHARE).toBeLessThanOrEqual(burnTicks(BURN.playerMs) * BURN.playerFraction);
  });
});

describe('OwedTick', () => {
  it('keeps a swallowed tick until it lands, once', () => {
    const owed = new OwedTick();
    owed.add(1);
    const tries: boolean[] = [false, false, true, true];
    let calls = 0;
    for (const result of tries) owed.pay(false, () => (calls++, result));
    expect(calls).toBe(3);
    expect(owed.pending).toBe(false);
  });

  it('owes nothing when no tick came due, and forgets it when dead or cleared', () => {
    const owed = new OwedTick();
    owed.add(0);
    let calls = 0;
    owed.pay(false, () => (calls++, true));
    expect(calls).toBe(0);
    owed.add(2);
    owed.pay(true, () => (calls++, true));
    expect(calls).toBe(0);
    expect(owed.pending).toBe(false);
    owed.add(1);
    owed.clear();
    expect(owed.pending).toBe(false);
  });
});
