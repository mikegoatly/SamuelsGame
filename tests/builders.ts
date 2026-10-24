import { expect } from 'vitest';
import type { PlayerProgress } from '../src/logic/progression';

export function expectClose(actual: number, expected: number): void {
  expect(actual).toBeCloseTo(expected, 6);
}

export function aProgress(overrides: Partial<PlayerProgress> = {}): PlayerProgress {
  return { level: 1, xp: 0, ...overrides };
}

export function expectProgress(actual: PlayerProgress, level: number, xp: number): void {
  expect(actual).toEqual({ level, xp });
}

/** Deterministic rng cycling through the given values. */
export function sequenceRng(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length]!;
}
