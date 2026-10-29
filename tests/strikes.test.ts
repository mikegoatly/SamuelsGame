import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { onStrike, strikeAt } from '../src/systems/strikes';

const sceneOf = () => ({ events: new EventEmitter() }) as unknown as Parameters<typeof strikeAt>[0];

describe('player strikes', () => {
  it('reach every listener with the point and reach, until unsubscribed', () => {
    const scene = sceneOf();
    const a = vi.fn();
    const b = vi.fn();
    const offA = onStrike(scene, a);
    onStrike(scene, b);
    strikeAt(scene, 10, 20, 8);
    offA();
    strikeAt(scene, 1, 2, 3);
    expect(a.mock.calls).toEqual([[10, 20, 8]]);
    expect(b.mock.calls).toEqual([[10, 20, 8], [1, 2, 3]]);
  });
});
