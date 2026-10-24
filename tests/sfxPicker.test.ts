import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SFX_DEFS, sfxKey, type SfxId } from '../src/content/sfxDefs';
import { jitterRate, pickVariant } from '../src/logic/sfxPicker';
import { sequenceRng } from './builders';

describe('pickVariant', () => {
  it('returns 0 for a single variant', () => {
    expect(pickVariant(1, () => 0.9, 0)).toBe(0);
  });

  it('never repeats the previous variant', () => {
    for (let last = 0; last < 3; last++) {
      for (const r of [0, 0.2, 0.34, 0.5, 0.67, 0.99]) expect(pickVariant(3, () => r, last)).not.toBe(last);
    }
  });

  it('covers every other variant', () => {
    const picked = new Set([0, 0.4, 0.8].map((r) => pickVariant(3, () => r, 1)));
    expect([...picked].sort()).toEqual([0, 2]);
  });

  it('accepts no previous variant', () => {
    expect(pickVariant(4, sequenceRng(0.99), undefined)).toBe(3);
  });
});

describe('jitterRate', () => {
  it('stays within +-spread of the base rate', () => {
    expect(jitterRate(1, 0.1, () => 0)).toBeCloseTo(0.9);
    expect(jitterRate(1, 0.1, () => 0.5)).toBeCloseTo(1);
    expect(jitterRate(2, 0.1, () => 1)).toBeCloseTo(2.2);
  });
});

describe('sfx definitions', () => {
  it('reference files that exist and have unique cache keys', () => {
    const keys = new Set<string>();
    for (const [id, def] of Object.entries(SFX_DEFS)) {
      def.files.forEach((file, i) => {
        expect(existsSync(resolve(__dirname, '..', 'public', 'assets', 'audio', file)), `${id}: ${file}`).toBe(true);
        keys.add(sfxKey(id as SfxId, i));
      });
    }
    expect(keys.size).toBe(Object.values(SFX_DEFS).reduce((n, d) => n + d.files.length, 0));
  });
});
