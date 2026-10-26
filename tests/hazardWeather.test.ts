import { describe, expect, it } from 'vitest';
import { pickRubbleTarget, rockHits, rubblePhase, RUBBLE_WARN_MS } from '../src/logic/hazard/rubble';
import { windPhase, windVelocity } from '../src/logic/hazard/wind';
import { stormAt, STORM_PHASES } from '../src/logic/hazard/sandstorm';
import { sequenceRng } from './builders';

describe('rubble', () => {
  it('warns for about a second before the rock lands', () => {
    expect(RUBBLE_WARN_MS).toBe(1000);
    const seen: string[] = [];
    for (let t = 0; t < 3200; t += 100) seen.push(rubblePhase(t, 0).name);
    expect(seen[0]).toBe('wait');
    expect(seen.indexOf('warn')).toBeLessThan(seen.indexOf('impact'));
  });

  const rect = { x: 0, y: 0, w: 200, h: 100 };
  const open = () => false;
  it('aims near the player when the aim roll succeeds, anywhere in the room otherwise', () => {
    const near = pickRubbleTarget(rect, { x: 120, y: 60 }, sequenceRng(0.1, 0.5, 0.5), open, 0.5, 20);
    expect(near).toEqual({ x: 120, y: 60 });
    const far = pickRubbleTarget(rect, { x: 120, y: 60 }, sequenceRng(0.9, 0.25, 0.75), open, 0.5, 20);
    expect(far).toEqual({ x: 50, y: 75 });
  });

  it('retries blocked spots and never leaves the room', () => {
    const blockedLeft = (x: number) => x < 100;
    const spot = pickRubbleTarget(rect, null, sequenceRng(0.1, 0.5, 0.9, 0.5), blockedLeft, 0, 0);
    expect(spot.x).toBeGreaterThanOrEqual(100);
    const clamped = pickRubbleTarget(rect, { x: 500, y: -90 }, sequenceRng(0, 1, 1), open, 1, 40);
    expect(clamped.x).toBeLessThanOrEqual(200);
    expect(clamped.y).toBeGreaterThanOrEqual(0);
  });

  it('hits victims inside the blast circle', () => {
    expect(rockHits({ x: 10, y: 10 }, 20, { x: 20, y: 10 }, 4)).toBe(true);
    expect(rockHits({ x: 10, y: 10 }, 20, { x: 40, y: 10 }, 4)).toBe(false);
  });
});

describe('wind', () => {
  it('only pushes while blowing and eases in', () => {
    expect(windPhase(0, 0).name).toBe('calm');
    const warn = windPhase(3100, 0);
    expect(warn.name).toBe('warn');
    expect(windVelocity(warn, 0, 1)).toEqual({ x: 0, y: 0 });
    const early = windVelocity({ name: 'blow', t: 100, progress: 0.05, cycle: 0 }, 0, 1);
    const late = windVelocity({ name: 'blow', t: 1000, progress: 0.5, cycle: 0 }, 0, 1);
    expect(early.x).toBeGreaterThan(0);
    expect(late.x).toBeGreaterThan(early.x);
    expect(late.y).toBeCloseTo(0);
  });

  it('points along the direction and gets stronger per level', () => {
    const blow = { name: 'blow', t: 1000, progress: 0.6, cycle: 0 } as const;
    const south = windVelocity(blow, Math.PI / 2, 1);
    expect(south.y).toBeGreaterThan(0);
    expect(windVelocity(blow, 0, 2).x).toBeGreaterThan(windVelocity(blow, 0, 1).x);
    expect(windVelocity(blow, 0, 1).x).toBeLessThan(90);
  });
});

describe('sandstorm', () => {
  const at = (ms: number) => stormAt(ms, 0);
  const starts = (name: string) => STORM_PHASES.slice(0, STORM_PHASES.findIndex((p) => p.name === name)).reduce((s, p) => s + p.ms, 0);

  it('is clear when calm, builds dust before the fog, then fogs and clears', () => {
    expect(at(0)).toMatchObject({ fog: 0, dust: 0 });
    const rising = at(starts('rising') + 2000);
    expect(rising.dust).toBeGreaterThan(0.5);
    expect(rising.fog).toBeLessThan(0.2);
    const storm = at(starts('storm') + 2500);
    expect(storm.fog).toBeGreaterThan(0.8);
    const fading = at(starts('fading') + 1900);
    expect(fading.fog).toBeLessThan(0.3);
    expect(at(starts('fading') + 2100).fog).toBe(0);
  });

  it('stays within 0..1', () => {
    for (let t = 0; t < 40000; t += 250) {
      const s = at(t);
      expect(s.fog).toBeLessThanOrEqual(1);
      expect(s.dust).toBeLessThanOrEqual(1);
      expect(s.fog).toBeGreaterThanOrEqual(0);
    }
  });
});
