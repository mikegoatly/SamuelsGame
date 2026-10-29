import { describe, expect, it } from 'vitest';
import { abortAim, actStale, REAIM_DELAY_MS, STALE_ACT_MS, aimLocked, aimProgress, breakTether, hook, lineCatches, newSpider, pullSpeed, SPIDER, stepSpider, TetherLock, type SpiderEvent, type SpiderInput, type SpiderState } from '../src/logic/spiderTether';

const near: SpiderInput = { distance: 100, playerFree: true };
const T = SPIDER;

/** Drives a spider frame by frame (16ms) and records every event with its time. */
function run(state: SpiderState, from: number, to: number, input: SpiderInput = near, onFire?: (now: number) => boolean): { state: SpiderState; events: { at: number; event: SpiderEvent }[] } {
  const events: { at: number; event: SpiderEvent }[] = [];
  let locked = false;
  for (let now = from; now <= to; now += 16) {
    const step = stepSpider(state, now, input, T, locked);
    state = step.state;
    if (step.event === 'lock') locked = true;
    if (step.event === 'aim') locked = false;
    if (step.event) events.push({ at: now, event: step.event });
    if (step.event === 'fire' && onFire?.(now)) state = hook(state, now);
  }
  return { state, events };
}

describe('hookjaw spider timing', () => {
  it('waits for its first aim, then aims for 0.8s and locks 0.3s before it fires', () => {
    const { events } = run(newSpider(0), 0, 4000);
    const names = events.map((e) => e.event);
    expect(names.slice(0, 3)).toEqual(['aim', 'lock', 'fire']);
    const [aim, lock, fire] = events;
    expect(fire!.at - aim!.at).toBeGreaterThanOrEqual(T.aimMs);
    expect(fire!.at - aim!.at).toBeLessThan(T.aimMs + 20);
    expect(fire!.at - lock!.at).toBeGreaterThanOrEqual(T.lockBeforeFireMs - 20);
    expect(fire!.at - lock!.at).toBeLessThanOrEqual(T.lockBeforeFireMs + 20);
  });

  it('reports the lock only once per aim', () => {
    expect(run(newSpider(0), 0, 3000).events.filter((e) => e.event === 'lock')).toHaveLength(1);
  });

  it('only aims when the player is in range and free of another tether', () => {
    expect(run(newSpider(0), 0, 4000, { distance: T.aimRange + 1, playerFree: true }).events).toEqual([]);
    expect(run(newSpider(0), 0, 4000, { distance: 50, playerFree: false }).events).toEqual([]);
    expect(run(newSpider(0), 0, 4000, { distance: Infinity, playerFree: true }).events).toEqual([]);
  });

  it('waits 4s after a shot before the next aim, hit or miss', () => {
    const { events } = run(newSpider(0, 0), 0, 12000);
    const aims = events.filter((e) => e.event === 'aim').map((e) => e.at);
    const fires = events.filter((e) => e.event === 'fire').map((e) => e.at);
    expect(aims.length).toBeGreaterThanOrEqual(3);
    expect(aims[1]! - fires[0]!).toBeGreaterThanOrEqual(T.cooldownMs);
    expect(aims[1]! - fires[0]!).toBeLessThan(T.cooldownMs + 40);
  });

  it('a hook pulls for 0.6s, then bites and starts the cooldown', () => {
    const { events } = run(newSpider(0, 0), 0, 3000, near, () => true);
    const [fire, bite] = [events.find((e) => e.event === 'fire')!, events.find((e) => e.event === 'bite')!];
    expect(bite.at - fire.at).toBeGreaterThanOrEqual(T.pullMs);
    expect(bite.at - fire.at).toBeLessThan(T.pullMs + 40);
    expect(events.filter((e) => e.event === 'aim')).toHaveLength(1);
  });

  it('breaking the tether (dash, a hit on the spider) ends the pull with no bite and starts the cooldown', () => {
    const pulling = hook(newSpider(0), 1000);
    const broken = breakTether(pulling, 1200);
    expect(broken).toMatchObject({ phase: 'idle', nextAimAt: 1200 + T.cooldownMs });
    expect(stepSpider(broken, 1200 + T.pullMs, near).event).toBeNull();
    expect(breakTether(newSpider(0), 50)).toEqual(newSpider(0));
  });

  it('exposes how far the aim has come and when it stopped following', () => {
    const aiming = stepSpider(newSpider(0, 0), 0, near).state;
    expect(aimProgress(aiming, T.aimMs / 2)).toBeCloseTo(0.5, 6);
    expect(aimProgress(newSpider(0), 10)).toBe(0);
    expect(aimLocked(aiming, T.aimMs - T.lockBeforeFireMs - 1)).toBe(false);
    expect(aimLocked(aiming, T.aimMs - T.lockBeforeFireMs)).toBe(true);
  });
});

describe('hookjaw spider line and pull', () => {
  it('catches a player standing on the locked line but not one who stepped aside', () => {
    const origin = { x: 0, y: 0 };
    expect(lineCatches(origin, 0, { x: 100, y: 0 }, 6)).toBe(true);
    expect(lineCatches(origin, 0, { x: 100, y: 4 }, 6)).toBe(true);
    expect(lineCatches(origin, 0, { x: 100, y: 25 }, 6)).toBe(false);
    expect(lineCatches(origin, 0, { x: T.hookRange + 40, y: 0 }, 6)).toBe(false);
    expect(lineCatches(origin, 0, { x: -50, y: 0 }, 6)).toBe(false);
  });

  it('pulls fast enough to arrive as the pull ends, never faster than the cap, and stops at bite range', () => {
    expect(pullSpeed(T.biteRange, 300)).toBe(0);
    expect(pullSpeed(T.biteRange - 3, 300)).toBe(0);
    expect(pullSpeed(T.biteRange + 60, 600)).toBeCloseTo(100, 6);
    expect(pullSpeed(1000, 600)).toBe(T.maxPullSpeed);
    expect(pullSpeed(T.biteRange + 20, 0)).toBeGreaterThan(0);
  });

  it('a hook from the farthest aim distance lands inside the pull time at the capped speed', () => {
    expect((T.aimRange - T.biteRange) / T.maxPullSpeed).toBeLessThan(T.pullMs / 1000);
  });
});

describe('aborted aims', () => {
  const aiming = stepSpider(newSpider(0, 0), 0, near).state;

  it('go back to idle without firing and wait 600ms before aiming again', () => {
    const state = abortAim(aiming, 300);
    expect(state).toMatchObject({ phase: 'idle', nextAimAt: 300 + REAIM_DELAY_MS });
    expect(stepSpider(state, 899, near).event).toBeNull();
    expect(stepSpider(state, 900, near).event).toBe('aim');
  });

  it('never shorten a longer cooldown and leave idle and pulling spiders alone', () => {
    expect(abortAim({ ...aiming, nextAimAt: 9000 }, 300).nextAimAt).toBe(9000);
    expect(abortAim(newSpider(0), 10)).toEqual(newSpider(0));
    const pulling = hook(newSpider(0), 5);
    expect(abortAim(pulling, 10)).toBe(pulling);
  });

  it('an owner that has not acted for 150ms (stunned, knocked back) is stale', () => {
    expect(actStale(1000 + STALE_ACT_MS - 1, 1000)).toBe(false);
    expect(actStale(1000 + STALE_ACT_MS, 1000)).toBe(true);
  });
});

describe('only one tether on the player at a time', () => {
  it('lets the first spider claim it and refuses the second until it is released', () => {
    const lock = new TetherLock();
    const [a, b] = [{}, {}];
    expect(lock.held).toBe(false);
    expect(lock.claim(a)).toBe(true);
    expect(lock.claim(b)).toBe(false);
    expect(lock.claim(a)).toBe(true);
    expect(lock.heldBy(a)).toBe(true);
    expect(lock.heldBy(b)).toBe(false);
    lock.release(b);
    expect(lock.held).toBe(true);
    lock.release(a);
    expect(lock.held).toBe(false);
    expect(lock.claim(b)).toBe(true);
  });
});
