import { describe, expect, it } from 'vitest';
import { toStone } from '../src/logic/grey';

describe('toStone', () => {
  it('desaturates opaque pixels to a grey and leaves transparent ones alone', () => {
    const data = new Uint8ClampedArray([200, 120, 40, 255, 10, 20, 30, 0]);
    toStone(data);
    expect(data[0]).toBe(data[1]);
    expect(data[1]).toBe(data[2]);
    expect(data[3]).toBe(255);
    expect([...data.slice(4)]).toEqual([10, 20, 30, 0]);
  });
});
