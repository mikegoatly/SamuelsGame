import { describe, expect, it } from 'vitest';
import { cycleIndex, EYE_CYCLE_MS, eyeState, type EyeState } from '../src/logic/grateEyes';
import { StepOnTrigger } from '../src/logic/stepOn';

describe('eyeState', () => {
  it.each<[number, EyeState]>([
    [0, 'open'],
    [2799, 'open'],
    [2800, 'narrow'],
    [2919, 'narrow'],
    [2920, 'shut'],
    [3899, 'shut'],
    [3900, 'narrow'],
    [4020, 'open'],
    [EYE_CYCLE_MS - 1, 'open'],
  ])('at %i ms the eyes are %s', (now, expected) => {
    expect(eyeState(now)).toBe(expected);
  });

  it('repeats every cycle and shifts with the per-grate offset', () => {
    expect(eyeState(2900 + 3 * EYE_CYCLE_MS)).toBe(eyeState(2900));
    expect(eyeState(0, 2900)).toBe('narrow');
    expect(eyeState(100, -100)).toBe('open');
  });

  it('closes the eyes for a while each cycle, so it reads as a blink and not a stare', () => {
    let shut = 0;
    for (let t = 0; t < EYE_CYCLE_MS; t += 10) if (eyeState(t) === 'shut') shut++;
    expect(shut * 10).toBeGreaterThan(500);
    expect(shut * 10).toBeLessThan(EYE_CYCLE_MS / 2);
  });
});

describe('cycleIndex', () => {
  it('ticks once per period and starts each grate at a different phase', () => {
    expect(cycleIndex(0, 1000, 0)).toBe(0);
    expect(cycleIndex(999, 1000, 0)).toBe(0);
    expect(cycleIndex(1000, 1000, 0)).toBe(1);
    expect(cycleIndex(0, 1000, 1500)).toBe(1);
  });
});

describe('StepOnTrigger', () => {
  it('fires on stepping on, once, and again only after stepping off and back on', () => {
    const trigger = new StepOnTrigger();
    const frames: [boolean, boolean][] = [[false, true], [true, true], [true, true], [true, true], [false, true], [true, true]];
    expect(frames.map(([inside, can]) => trigger.step(inside, can))).toEqual([false, true, false, false, false, true]);
  });

  it('waits while the prompt cannot open (run ended, card up) and fires when it can', () => {
    const trigger = new StepOnTrigger();
    expect(trigger.step(true, false)).toBe(false);
    expect(trigger.step(true, false)).toBe(false);
    expect(trigger.step(true, true)).toBe(true);
    expect(trigger.step(true, true)).toBe(false);
  });

  it('stays quiet when the prompt can never open and the player leaves', () => {
    const trigger = new StepOnTrigger();
    expect(trigger.step(true, false)).toBe(false);
    expect(trigger.step(false, false)).toBe(false);
    expect(trigger.step(true, true)).toBe(true);
  });
});
