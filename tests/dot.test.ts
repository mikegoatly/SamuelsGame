import { describe, expect, it } from 'vitest';
import { DotTracker } from '../src/logic/dot';
import { newZone, zoneStep } from '../src/logic/zone';

describe('DotTracker', () => {
  it('ticks every interval while the poison lasts', () => {
    const dot = new DotTracker<string>();
    dot.apply('rat', 0, 1000, 500);
    expect(dot.due(400)).toEqual([]);
    expect(dot.due(500)).toEqual(['rat']);
    expect(dot.due(900)).toEqual([]);
    expect(dot.due(1000)).toEqual(['rat']);
    expect(dot.active('rat')).toBe(false);
  });

  it('refreshing keeps a single stack: no extra or reset ticks', () => {
    const dot = new DotTracker<string>();
    dot.apply('rat', 0, 1000, 500);
    dot.apply('rat', 100, 1000, 500);
    dot.apply('rat', 200, 1000, 500);
    expect(dot.due(500)).toEqual(['rat']);
    expect(dot.due(1000)).toEqual(['rat']);
    expect(dot.due(1199)).toEqual([]);
    expect(dot.due(1200)).toEqual([]);
    expect(dot.active('rat')).toBe(false);
  });

  it('tracks enemies separately and forgets removed ones', () => {
    const dot = new DotTracker<string>();
    dot.apply('a', 0, 1000, 500);
    dot.apply('b', 250, 1000, 500);
    expect(dot.due(500)).toEqual(['a']);
    expect(dot.due(750)).toEqual(['b']);
    dot.remove('a');
    expect(dot.active('a')).toBe(false);
  });

  it('catches up with at most one tick after a long gap', () => {
    const dot = new DotTracker<string>();
    dot.apply('a', 0, 5000, 500);
    expect(dot.due(3000)).toEqual(['a']);
    expect(dot.due(3100)).toEqual([]);
  });
});

describe('zoneStep', () => {
  it('ticks on its interval, then expires', () => {
    const zone = newZone(0, 1000, 400);
    expect(zoneStep(zone, 399)).toBe('idle');
    expect(zoneStep(zone, 400)).toBe('tick');
    expect(zoneStep(zone, 500)).toBe('idle');
    expect(zoneStep(zone, 800)).toBe('tick');
    expect(zoneStep(zone, 1000)).toBe('expired');
  });
});
