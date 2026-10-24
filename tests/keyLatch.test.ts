import { describe, expect, it } from 'vitest';
import { KeyLatch, WheelThrottle } from '../src/logic/keyLatch';

describe('KeyLatch', () => {
  it('a press and release between two reads still registers once', () => {
    const key = new KeyLatch();
    key.down();
    key.up();
    expect(key.take()).toBe(true);
    expect(key.take()).toBe(false);
  });

  it('read stays true while held, and reports a quick tap for one read only', () => {
    const key = new KeyLatch();
    key.down();
    expect(key.read()).toBe(true);
    expect(key.read()).toBe(true);
    key.up();
    expect(key.read()).toBe(false);
    key.down();
    key.up();
    expect(key.read()).toBe(true);
    expect(key.read()).toBe(false);
  });

  it('take is an edge: holding gives a single press', () => {
    const key = new KeyLatch();
    key.down();
    expect(key.take()).toBe(true);
    expect(key.take()).toBe(false);
    key.down();
    expect(key.take()).toBe(true);
  });

  it('reset drops held and pending state', () => {
    const key = new KeyLatch();
    key.down();
    key.reset();
    expect(key.read()).toBe(false);
  });
});

describe('WheelThrottle', () => {
  it('switches at most once per interval and keeps the net direction', () => {
    const wheel = new WheelThrottle(200);
    wheel.add(100);
    expect(wheel.take(1000)).toBe(1);
    wheel.add(100);
    wheel.add(100);
    expect(wheel.take(1100)).toBe(0);
    expect(wheel.take(1200)).toBe(1);
    expect(wheel.take(1500)).toBe(0);
  });

  it('accumulates delta signs, cancelling opposite spins, and ignores zero', () => {
    const wheel = new WheelThrottle(200);
    wheel.add(0);
    expect(wheel.take(0)).toBe(0);
    wheel.add(-5);
    wheel.add(5);
    expect(wheel.take(5000)).toBe(0);
    wheel.add(-5);
    wheel.add(-5);
    expect(wheel.take(5000)).toBe(-1);
  });
});
