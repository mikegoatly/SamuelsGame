import { describe, expect, it } from 'vitest';
import { SPIKE_CYCLE, spikeDamage, spikeState, spikesHurt, type SpikeCycle } from '../src/logic/spikes';

const cycle: SpikeCycle = { periodMs: 3000, warnMs: 600, upMs: 900, offsetMs: 0 };

describe('spikeState', () => {
  it('is down, then warns, then is up, then repeats', () => {
    expect(spikeState(0, cycle)).toBe('down');
    expect(spikeState(1499, cycle)).toBe('down');
    expect(spikeState(1500, cycle)).toBe('warn');
    expect(spikeState(2099, cycle)).toBe('warn');
    expect(spikeState(2100, cycle)).toBe('up');
    expect(spikeState(2999, cycle)).toBe('up');
    expect(spikeState(3000, cycle)).toBe('down');
    expect(spikeState(3000 + 2100, cycle)).toBe('up');
  });

  it('shifts with the offset so neighbouring traps are out of step', () => {
    const shifted = { ...cycle, offsetMs: 1500 };
    expect(spikeState(0, shifted)).toBe('warn');
    expect(spikeState(600, shifted)).toBe('up');
  });

  it('only hurts while up', () => {
    expect(spikesHurt('down')).toBe(false);
    expect(spikesHurt('warn')).toBe(false);
    expect(spikesHurt('up')).toBe(true);
  });

  it('is up for exactly upMs per period in the shipped cycle', () => {
    let up = 0;
    for (let t = 0; t < SPIKE_CYCLE.periodMs; t += 10) if (spikesHurt(spikeState(t, SPIKE_CYCLE))) up += 10;
    expect(up).toBe(SPIKE_CYCLE.upMs);
  });
});

describe('spikeDamage', () => {
  it('is a fraction of max hp, at least 1', () => {
    expect(spikeDamage(100)).toBeGreaterThanOrEqual(10);
    expect(spikeDamage(100)).toBeLessThanOrEqual(20);
    expect(spikeDamage(1)).toBe(1);
  });
});
