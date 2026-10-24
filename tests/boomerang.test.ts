import { describe, expect, it } from 'vitest';
import { HitOnce, launchBlade, stepBlade, type BladeState } from '../src/logic/boomerang';

const open = () => false;
const RIGHT = { x: 1, y: 0 };
const player = { x: 0, y: 0 };

function fly(blade: BladeState, steps: number, distance: number, blocked: (x: number, y: number) => boolean = open, target = player): BladeState {
  let state = blade;
  for (let i = 0; i < steps; i++) state = stepBlade(state, { dir: RIGHT, target, distance, range: 140, blocked, catchRadius: 6 });
  return state;
}

describe('stepBlade', () => {
  it('flies out along the aim up to the range, then turns back', () => {
    const out = fly(launchBlade(player), 13, 10);
    expect(out).toMatchObject({ phase: 'out', x: 130 });
    const turned = fly(out, 1, 20);
    expect(turned.phase).toBe('back');
    expect(turned.x).toBeCloseTo(140);
  });

  it('turns back early at a wall without entering it', () => {
    const wall = (x: number) => x >= 50;
    const state = fly(launchBlade(player), 10, 10, wall);
    expect(state.phase).toBe('back');
    expect(state.x).toBeLessThan(50);
  });

  it('returns to the player, following them, and finishes when caught', () => {
    let state: BladeState = { x: 100, y: 0, phase: 'back', done: false };
    state = fly(state, 3, 10, open, { x: 100, y: 60 });
    expect(state.y).toBeGreaterThan(0);
    expect(state.done).toBe(false);
    state = fly(state, 20, 10, open, { x: 100, y: 20 });
    expect(state.done).toBe(true);
  });

  it('does not overshoot the player in one big step', () => {
    const state = fly({ x: 20, y: 0, phase: 'back', done: false }, 1, 500);
    expect(state.done).toBe(true);
  });
});

describe('stepBlade return flight', () => {
  it('is dropped (done) when the way back runs into a wall', () => {
    const wall = (x: number) => x >= 60 && x <= 70;
    const state = fly({ x: 100, y: 0, phase: 'back', done: false }, 10, 10, wall);
    expect(state.done).toBe(true);
    expect(state.x).toBeGreaterThan(70);
  });
});

describe('HitOnce', () => {
  it('lets each enemy be hit once per pass', () => {
    const hits = new HitOnce<string>();
    expect(hits.claim('out', 'a')).toBe(true);
    expect(hits.claim('out', 'a')).toBe(false);
    expect(hits.claim('back', 'a')).toBe(true);
    expect(hits.claim('back', 'a')).toBe(false);
    expect(hits.claim('out', 'b')).toBe(true);
  });
});
