import { describe, expect, it } from 'vitest';
import { caveVignetteStrength, CAVE_VIGNETTE, coverSize, vignetteAlphaAt } from '../src/logic/darkness';
import { CART, FIRST_WARN_MIN_MS, nearRail, RUMBLE_REACH, cartAt, cartPhaseSince, cartEntry, cartForward, cartHits, cartPhase, railLength, railOf, runMs } from '../src/logic/hazard/minecart';
import { newResonator, RESONATOR, stepResonator, struckBy, swingTouches, waveRadius, waveTouches, type ResonatorState } from '../src/logic/hazard/resonator';
import { HAZARD_HITS } from '../src/logic/hazard/hits';
import { shardRing } from '../src/logic/shardRing';
import { expectClose } from './builders';

const rail = railOf({ x: 100, y: 200, w: 160, h: 16 });

describe('minecart cycle', () => {
  it('reads a wide strip as a horizontal rail along its centre line and a tall one as vertical', () => {
    expect(rail).toEqual({ a: { x: 100, y: 208 }, b: { x: 260, y: 208 } });
    expect(railOf({ x: 50, y: 10, w: 16, h: 96 })).toEqual({ a: { x: 58, y: 10 }, b: { x: 58, y: 106 } });
    expect(railLength(rail)).toBe(160);
  });

  it('waits, glows for 1.2s, then runs for as long as the cart needs to cross the rail', () => {
    const phases = [0, CART.waitMs - 1, CART.waitMs, CART.waitMs + CART.warnMs - 1, CART.waitMs + CART.warnMs].map((t) => cartPhase(t, 0, rail).name);
    expect(phases).toEqual(['wait', 'wait', 'warn', 'warn', 'run']);
    expect(CART.warnMs).toBe(1200);
    expect(cartPhase(CART.waitMs + CART.warnMs + runMs(rail), 0, rail)).toMatchObject({ name: 'wait', cycle: 1 });
  });

  it('only has a cart while running, which enters off one end and leaves off the other', () => {
    expect(cartAt(rail, cartPhase(10, 0, rail))).toBeNull();
    expect(cartAt(rail, cartPhase(CART.waitMs + 100, 0, rail))).toBeNull();
    const runStart = CART.waitMs + CART.warnMs;
    const early = cartAt(rail, cartPhase(runStart, 0, rail))!;
    const late = cartAt(rail, cartPhase(runStart + runMs(rail) - 1, 0, rail))!;
    expect(early.x).toBeLessThan(rail.a.x);
    expect(late.x).toBeGreaterThan(rail.b.x - 1);
    expect(early.y).toBe(208);
    expect(late.y).toBe(208);
  });

  it('runs the other way every second time, with the warning at the end it will come from', () => {
    expect([0, 1, 2, 3].map(cartForward)).toEqual([true, false, true, false]);
    expect(cartEntry(rail, 0)).toEqual({ from: rail.a, dir: { x: 1, y: 0 } });
    expect(cartEntry(rail, 1)).toEqual({ from: rail.b, dir: { x: -1, y: 0 } });
  });

  it('rattles at its speed', () => {
    const runStart = CART.waitMs + CART.warnMs;
    const a = cartAt(rail, cartPhase(runStart + 200, 0, rail))!;
    const b = cartAt(rail, cartPhase(runStart + 400, 0, rail))!;
    expectClose(b.x - a.x, (CART.speed * 200) / 1000);
  });

  it('offsets shift the whole cycle', () => {
    expect(cartPhase(0, CART.waitMs, rail).name).toBe('warn');
  });

  it('hurts whoever is within the cart and its victim', () => {
    expect(cartHits({ x: 100, y: 100 }, { x: 100, y: 100 + CART.radius + 6 }, 6)).toBe(true);
    expect(cartHits({ x: 100, y: 100 }, { x: 100, y: 100 + CART.radius + 7 }, 6)).toBe(false);
  });

  it('is a single survivable hit on the same table as the other hazards', () => {
    expect(HAZARD_HITS.minecart.fraction).toBeLessThanOrEqual(0.12);
    expect(HAZARD_HITS.minecart.gapMs).toBe(0);
  });
});

describe('minecart start', () => {
  it.each([0, 600, 1900, 3000, 3900, 9000])('offset %i: starts waiting and the first warning comes at least 1.2s after the room wakes', (offset) => {
    expect(cartPhaseSince(0, offset, rail).name).toBe('wait');
    let first = -1;
    for (let t = 0; t < 8000 && first < 0; t += 10) if (cartPhaseSince(t, offset, rail).name === 'warn') first = t;
    expect(first).toBeGreaterThanOrEqual(FIRST_WARN_MIN_MS);
    expect(first).toBeLessThanOrEqual(CART.waitMs);
  });
});

describe('minecart rumble', () => {
  it('is heard from anywhere along the rail, not only near one end', () => {
    expect(nearRail(rail, { x: 180, y: 208 + RUMBLE_REACH - 1 })).toBe(true);
    expect(nearRail(rail, { x: 180, y: 208 + RUMBLE_REACH + 5 })).toBe(false);
    expect(nearRail(rail, { x: rail.a.x - RUMBLE_REACH - 5, y: 208 })).toBe(false);
    expect(nearRail(rail, { x: rail.b.x + 100, y: 208 })).toBe(true);
  });
});

describe('resonating crystal', () => {
  const step = (state: ResonatorState, now: number, struck = false) => stepResonator(state, now, struck);

  it('rings after a strike, sends a shockwave, then rests until the cooldown ends', () => {
    let state = newResonator();
    const events: (string | null)[] = [];
    for (const [now, struck] of [[0, false], [1000, true], [1000 + RESONATOR.ringMs, false], [1000 + RESONATOR.ringMs + RESONATOR.waveMs, false], [1000 + RESONATOR.cooldownMs, false]] as const) {
      const result = step(state, now, struck);
      state = result.state;
      events.push(result.event);
    }
    expect(events).toEqual([null, 'ring', 'wave', 'cooldown', 'ready']);
  });

  it('ignores strikes while ringing, waving or cooling down, so it cannot be spammed', () => {
    let state = step(newResonator(), 0, true).state;
    for (const now of [100, RESONATOR.ringMs + 50, RESONATOR.ringMs + RESONATOR.waveMs + 50, RESONATOR.cooldownMs - 1]) state = step(state, now, true).state;
    expect(state.struckAt).toBe(0);
    expect(state.phase).toBe('cooldown');
    expect(step(state, RESONATOR.cooldownMs, true).event).toBe('ready');
  });

  it('a strike on the very frame it is ready again starts a new ring on the next frame', () => {
    const ready = step(step(newResonator(), 0, true).state, RESONATOR.cooldownMs, true).state;
    expect(step(ready, RESONATOR.cooldownMs + 16, true).event).toBe('ring');
  });

  it('the shockwave grows from nothing to its full radius and touches a monster once as it crosses', () => {
    expect(waveRadius(0)).toBe(0);
    expect(waveRadius(RESONATOR.waveMs)).toBe(RESONATOR.radius);
    expect(waveRadius(RESONATOR.waveMs * 4)).toBe(RESONATOR.radius);
    const centre = { x: 0, y: 0 };
    const monster = { x: 40, y: 0 };
    const touched = Array.from({ length: 51 }, (_, i) => waveTouches(centre, waveRadius(i * 10), monster, 5));
    expect(touched.some(Boolean)).toBe(true);
    expect(touched.filter(Boolean).length).toBeLessThan(20);
    expect(waveTouches(centre, RESONATOR.radius, { x: RESONATOR.radius + 40, y: 0 }, 5)).toBe(false);
  });

  it('counts a hit near the crystal as a strike', () => {
    expect(struckBy({ x: 0, y: 0 }, { x: 8, y: 0 }, 10)).toBe(true);
    expect(struckBy({ x: 0, y: 0 }, { x: 20, y: 0 }, 10)).toBe(false);
  });
});

describe('cave vignette gradient', () => {
  it('is clear in the middle, rises smoothly and is fully dark at the edge', () => {
    expect(vignetteAlphaAt(0)).toBe(0);
    expect(vignetteAlphaAt(0.2)).toBe(0);
    expect(vignetteAlphaAt(1)).toBe(1);
    const steps = Array.from({ length: 21 }, (_, i) => vignetteAlphaAt(i / 20));
    for (let i = 1; i < steps.length; i++) expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!);
    expect(vignetteAlphaAt(0.6)).toBeGreaterThan(0);
    expect(vignetteAlphaAt(0.6)).toBeLessThan(0.5);
  });

  it('covers the whole screen under camera zoom, whatever the viewport', () => {
    expect(coverSize(640, 360, 1).width).toBeGreaterThanOrEqual(640);
    const z = coverSize(1280, 720, 2);
    expect(z.width * 2).toBeGreaterThanOrEqual(1280);
    expect(z.height * 2).toBeGreaterThanOrEqual(720);
  });
});

describe('shard ring and cave darkness', () => {
  it.each([4, 6, 8])('spreads %i shards evenly on the unit circle', (count) => {
    const ring = shardRing(count, 0.3);
    expect(ring).toHaveLength(count);
    for (const d of ring) expectClose(Math.hypot(d.x, d.y), 1);
    expectClose(ring[0]!.x, Math.cos(0.3));
    const sum = ring.reduce((acc, d) => ({ x: acc.x + d.x, y: acc.y + d.y }), { x: 0, y: 0 });
    expectClose(sum.x, 0);
    expectClose(sum.y, 0);
  });

  it('is darker normally, softer and steady with reduced flashes', () => {
    const normal = Array.from({ length: 20 }, (_, i) => caveVignetteStrength(false, i * 300));
    const reduced = Array.from({ length: 20 }, (_, i) => caveVignetteStrength(true, i * 300));
    expect(new Set(reduced).size).toBe(1);
    expect(reduced[0]).toBe(CAVE_VIGNETTE.reducedStrength);
    expect(Math.min(...normal)).toBeGreaterThan(reduced[0]!);
    expect(new Set(normal.map((n) => n.toFixed(3))).size).toBeGreaterThan(5);
  });
});

describe('melee strikes on a crystal', () => {
  const o = { x: 0, y: 0 };
  it.each([
    ['in front and in reach', 0, { x: 24, y: 0 }, true],
    ['in front but out of reach', 0, { x: 60, y: 0 }, false],
    ['behind the swing', 0, { x: -24, y: 0 }, false],
    ['a little off the aim line but inside the arc', 0, { x: 24, y: 10 }, true],
    ['at the side, outside a narrow arc', 0, { x: 5, y: 24 }, false],
  ])('%s', (_, aim, crystal, expected) => {
    expect(swingTouches(o, aim, 1.2, 30, crystal, 8)).toBe(expected);
  });
});
