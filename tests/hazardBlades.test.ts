import { describe, expect, it } from 'vitest';
import { bladeHits, bladeTip, distanceToSegment, pendulumAngle, swingBounds } from '../src/logic/hazard/pendulum';
import { ARROW_SPACING, arrowHits, plateState, PLATE_TIMING, stepArrow, volleyLanes } from '../src/logic/hazard/arrows';

const SWING = { base: Math.PI / 2, amplitude: 1, periodMs: 2000 };

describe('pendulum', () => {
  it('swings symmetrically about its rest direction', () => {
    expect(pendulumAngle(0, 0, SWING)).toBeCloseTo(SWING.base);
    expect(pendulumAngle(500, 0, SWING)).toBeCloseTo(SWING.base + 1);
    expect(pendulumAngle(1500, 0, SWING)).toBeCloseTo(SWING.base - 1);
    expect(pendulumAngle(0, 500, SWING)).toBeCloseTo(SWING.base + 1);
  });

  it('measures distance to a segment, clamped to its ends', () => {
    expect(distanceToSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(3);
    expect(distanceToSegment({ x: -3, y: 4 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
  });

  it('hits victims touching the blade only', () => {
    const pivot = { x: 100, y: 100 };
    const tip = bladeTip(pivot, 0, 40);
    expect(tip.x).toBeCloseTo(140);
    expect(bladeHits(pivot, tip, 4, { x: 120, y: 108 }, 5)).toBe(true);
    expect(bladeHits(pivot, tip, 4, { x: 120, y: 120 }, 5)).toBe(false);
  });

  it('bounds every angle of the swing', () => {
    const b = swingBounds({ x: 100, y: 100 }, 40, SWING, 4);
    expect(b.minY).toBeCloseTo(96);
    expect(b.maxY).toBeCloseTo(100 + 40 + 4);
    expect(b.maxX).toBeGreaterThan(100 + 40 * Math.sin(1) - 0.1);
  });
});

describe('arrow wall', () => {
  it('walks armed -> click -> cooldown -> armed', () => {
    const { clickMs, rearmMs } = PLATE_TIMING;
    expect(plateState(null)).toBe('armed');
    expect(plateState(0)).toBe('click');
    expect(plateState(clickMs)).toBe('cooldown');
    expect(plateState(clickMs + rearmMs)).toBe('armed');
  });

  it('spaces volley lanes evenly and centres them on the strip', () => {
    const lanes = volleyLanes({ y: 100, h: 96 });
    expect(lanes).toHaveLength(3);
    expect(lanes[1]! - lanes[0]!).toBe(ARROW_SPACING);
    expect(lanes[1]).toBe(148);
    expect(volleyLanes({ y: 0, h: 16 })).toEqual([8]);
  });

  it('flies and hits what it crosses', () => {
    const arrow = { x: 0, y: 50, dir: 1 as const };
    stepArrow(arrow, 1000);
    expect(arrow.x).toBeGreaterThan(100);
    expect(arrowHits({ ...arrow, x: 100 }, { x: 104, y: 55 }, 5)).toBe(true);
    expect(arrowHits({ ...arrow, x: 100 }, { x: 104, y: 70 }, 5)).toBe(false);
    stepArrow({ ...arrow, dir: -1 }, 10);
  });
});
