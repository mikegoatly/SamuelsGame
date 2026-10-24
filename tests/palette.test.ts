import { describe, expect, it } from 'vitest';
import { toTone } from '../src/logic/palette';

describe('toTone', () => {
  it('recolours opaque pixels to the tone and leaves transparent ones alone', () => {
    const data = new Uint8ClampedArray([200, 120, 40, 255, 10, 20, 30, 0]);
    toTone(data, [120, 80, 200]);
    expect(data[3]).toBe(255);
    expect(data[2]!).toBeGreaterThan(data[0]!);
    expect(data[0]!).toBeGreaterThan(data[1]!);
    expect([...data.slice(4)]).toEqual([10, 20, 30, 0]);
  });

  it('makes brown floor pixels read purple (blue over red over green)', () => {
    const data = new Uint8ClampedArray([140, 100, 60, 255]);
    toTone(data, [140, 100, 200]);
    expect(data[2]!).toBeGreaterThan(data[0]!);
    expect(data[0]!).toBeGreaterThan(data[1]!);
  });

  it('clamps to 255', () => {
    const data = new Uint8ClampedArray([255, 255, 255, 255]);
    toTone(data, [255, 255, 255], 3);
    expect([...data]).toEqual([255, 255, 255, 255]);
  });
});
