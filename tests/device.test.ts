import { describe, expect, it } from 'vitest';
import { defaultDevice, deviceForPointer } from '../src/logic/device';

describe('device', () => {
  it('maps pointer types', () => {
    expect(deviceForPointer('touch')).toBe('touch');
    expect(deviceForPointer('pen')).toBe('touch');
    expect(deviceForPointer('mouse')).toBe('keyboard');
    expect(deviceForPointer('')).toBe('keyboard');
  });

  it('defaults to touch only on coarse-pointer devices', () => {
    expect(defaultDevice(true)).toBe('touch');
    expect(defaultDevice(false)).toBe('keyboard');
  });
});
