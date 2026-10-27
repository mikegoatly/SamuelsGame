import { describe, expect, it } from 'vitest';
import { MARKER_MS, markerProgress, markerPulse, playerOnMarker } from '../src/logic/spawnMarker';

describe('markerProgress', () => {
  it.each([
    [1000, 0],
    [1000 + MARKER_MS / 2, 0.5],
    [1000 + MARKER_MS, 1],
    [9000, 1],
    [500, 0],
  ])('at %d ms (started at 1000) progress is %d', (now, expected) => {
    expect(markerProgress(now, 1000)).toBeCloseTo(expected, 5);
  });
});

describe('playerOnMarker', () => {
  it.each([
    [{ x: 100, y: 100 }, { x: 100, y: 100 }, true],
    [{ x: 100, y: 100 }, { x: 120, y: 100 }, true],
    [{ x: 100, y: 100 }, { x: 140, y: 100 }, false],
    [{ x: 100, y: 100 }, { x: 118, y: 118 }, false],
  ])('marker %j player %j on it: %s', (marker, player, expected) => {
    expect(playerOnMarker(marker, player, 24)).toBe(expected);
  });
});

describe('markerPulse', () => {
  it('grows steadily as the arrival gets closer', () => {
    expect(markerPulse(1, false).radius).toBeGreaterThan(markerPulse(0, false).radius);
  });

  it('flickers normally but holds steady when reducing flashes', () => {
    const alphas = [0, 0.1, 0.2, 0.3, 0.4].map((p) => markerPulse(p, false).alpha);
    const steady = [0, 0.1, 0.2, 0.3, 0.4].map((p) => markerPulse(p, true).alpha);
    expect(new Set(alphas).size).toBeGreaterThan(1);
    expect(new Set(steady).size).toBe(1);
  });
});
