import { describe, expect, it } from 'vitest';
import { HitStopGate, ShakeBudget } from '../src/logic/feel';

describe('ShakeBudget', () => {
  it('passes the first shake through, capped', () => {
    expect(new ShakeBudget().request(0, 100, 0.004)).toEqual({ ms: 100, intensity: 0.004 });
    expect(new ShakeBudget().request(0, 500, 0.5)?.intensity).toBeLessThanOrEqual(0.015);
  });

  it('drops a weaker shake while a stronger one is running', () => {
    const b = new ShakeBudget();
    b.request(0, 500, 0.012);
    expect(b.request(100, 100, 0.004)).toBeNull();
  });

  it('lets a stronger shake replace a running weaker one', () => {
    const b = new ShakeBudget();
    b.request(0, 200, 0.004);
    expect(b.request(50, 300, 0.01)).toEqual({ ms: 300, intensity: 0.01 });
  });

  it('accepts new shakes once the old one has finished', () => {
    const b = new ShakeBudget();
    b.request(0, 100, 0.01);
    expect(b.request(101, 100, 0.002)).toEqual({ ms: 100, intensity: 0.002 });
  });

  it('shakes nothing in reduced mode', () => {
    const b = new ShakeBudget();
    b.reduced = true;
    expect(b.request(0, 100, 0.01)).toBeNull();
  });
});

describe('HitStopGate', () => {
  it('allows a stop, then blocks until the gap has passed', () => {
    const g = new HitStopGate(150);
    expect(g.take(1000, 40)).toBe(40);
    expect(g.take(1100, 40)).toBe(0);
    expect(g.take(1190, 40)).toBe(40);
  });

  it('caps the duration to 50ms', () => {
    expect(new HitStopGate(0).take(0, 500)).toBe(50);
  });
});

describe('reset between scenes', () => {
  it('ShakeBudget forgets a running shake but keeps the reduced flag', () => {
    const b = new ShakeBudget();
    b.request(0, 1000, 0.012);
    b.reset();
    expect(b.request(10, 100, 0.002)).toEqual({ ms: 100, intensity: 0.002 });
    b.reduced = true;
    b.reset();
    expect(b.reduced).toBe(true);
  });

  it('HitStopGate allows a stop right after reset', () => {
    const g = new HitStopGate(150);
    g.take(1000, 40);
    g.reset();
    expect(g.take(1010, 40)).toBe(40);
  });
});
