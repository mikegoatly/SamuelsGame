import { describe, expect, it } from 'vitest';
import { KeyLatch } from '../src/logic/keyLatch';

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

  it.each([
    ['released while the game was paused', true, false, false],
    ['pressed while the game was paused', false, true, true],
  ])('sync after %s matches the real key without a phantom press', (_name, heldBefore, heldNow, expected) => {
    const key = new KeyLatch();
    if (heldBefore) key.down();
    key.read();
    key.sync(heldNow);
    expect(key.read()).toBe(expected);
    expect(key.take()).toBe(false);
  });

  it('reset drops held and pending state', () => {
    const key = new KeyLatch();
    key.down();
    key.reset();
    expect(key.read()).toBe(false);
  });
});
