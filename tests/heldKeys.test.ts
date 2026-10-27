import { describe, expect, it } from 'vitest';
import { HeldKeys, ReleaseGate } from '../src/logic/heldKeys';

const held = (...codes: string[]): HeldKeys => {
  const keys = new HeldKeys();
  for (const code of codes) keys.down(code);
  return keys;
};

describe('HeldKeys', () => {
  it('tracks which keys are down', () => {
    const keys = held('ArrowLeft', 'KeyW');
    keys.up('ArrowLeft');
    expect(keys.has('ArrowLeft')).toBe(false);
    expect(keys.has('KeyW')).toBe(true);
    expect(keys.any()).toBe(true);
  });

  it('clear releases everything (window blur)', () => {
    const keys = held('ArrowLeft');
    keys.clear();
    expect(keys.any()).toBe(false);
  });
});

describe('ReleaseGate', () => {
  it('is open at once when nothing is held as the dialog opens', () => {
    expect(new ReleaseGate(held()).ready()).toBe(true);
  });

  it.each([
    ['still holding the key', ['ArrowLeft'], [], false],
    ['pressed a second key while the first is held', ['ArrowLeft'], [['down', 'ArrowUp']], false],
    ['released one of two held keys', ['ArrowLeft', 'ArrowUp'], [['up', 'ArrowLeft']], false],
    ['released every held key', ['ArrowLeft', 'ArrowUp'], [['up', 'ArrowLeft'], ['up', 'ArrowUp']], true],
    ['released, then pressed a new key', ['ArrowLeft'], [['up', 'ArrowLeft'], ['down', 'Space']], true],
    ['window lost focus', ['ArrowLeft'], [['clear', '']], true],
  ] as const)('%s → ready %s', (_name, atOpen, events, expected) => {
    const keys = held(...atOpen);
    const gate = new ReleaseGate(keys);
    for (const [kind, code] of events) {
      if (kind === 'clear') keys.clear();
      else keys[kind](code);
    }
    expect(gate.ready()).toBe(expected);
  });
});
