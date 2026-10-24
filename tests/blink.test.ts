import { describe, expect, it } from 'vitest';
import { newBlinkState, pickBlinkPoint, stepBlink, type BlinkTuning } from '../src/logic/blink';
import { bodyClear } from '../src/logic/lineOfSight';

const tuning: BlinkTuning = { triggerRange: 60, distance: 80, vanishMs: 300, castDelayMs: 200, cooldownMs: 4000 };

describe('stepBlink', () => {
  it('stays idle while the player is far', () => {
    expect(stepBlink(newBlinkState(), 0, 200, tuning)).toEqual({ state: newBlinkState(), event: null });
  });

  it('vanishes when the player is close, then appears, casts and goes on cooldown', () => {
    let s = stepBlink(newBlinkState(), 1000, 40, tuning);
    expect(s.event).toBe('vanish');
    expect(s.state.phase).toBe('vanish');
    expect(stepBlink(s.state, 1200, 40, tuning).event).toBeNull();
    s = stepBlink(s.state, 1300, 40, tuning);
    expect(s.event).toBe('appear');
    expect(stepBlink(s.state, 1400, 40, tuning).event).toBeNull();
    s = stepBlink(s.state, 1500, 40, tuning);
    expect(s.event).toBe('cast');
    expect(s.state.phase).toBe('idle');
    expect(s.state.readyAt).toBe(1500 + tuning.cooldownMs);
  });

  it('does not blink again until the cooldown ends', () => {
    const cooling = { phase: 'idle' as const, until: 0, readyAt: 5000 };
    expect(stepBlink(cooling, 4999, 10, tuning).event).toBeNull();
    expect(stepBlink(cooling, 5000, 10, tuning).event).toBe('vanish');
  });
});

describe('pickBlinkPoint', () => {
  const from = { x: 100, y: 100 };
  const player = { x: 90, y: 100 };

  it('lands at the blink distance, further from the player than before', () => {
    const p = pickBlinkPoint(from, player, 80, () => 0.5, () => false);
    expect(Math.hypot(p.x - from.x, p.y - from.y)).toBeCloseTo(80, 3);
    expect(Math.hypot(p.x - player.x, p.y - player.y)).toBeGreaterThan(Math.hypot(from.x - player.x, from.y - player.y));
  });

  it('never lands in a wall, and stays put when everything is blocked', () => {
    const wallRight = (x: number) => x > 120;
    for (let i = 0; i < 30; i++) {
      const p = pickBlinkPoint(from, player, 80, () => (i % 10) / 10, wallRight);
      expect(wallRight(p.x)).toBe(false);
    }
    expect(pickBlinkPoint(from, player, 80, () => 0.5, () => true)).toEqual(from);
  });

  it('rejects a spot whose straight path crosses a wall', () => {
    const thinWall = (x: number) => x > 140 && x < 150;
    for (let i = 0; i < 20; i++) {
      const p = pickBlinkPoint(from, { x: 60, y: 100 }, 80, () => (i % 10) / 10, thinWall);
      expect(p.x <= 140).toBe(true);
    }
  });
});

describe('bodyClear', () => {
  it('needs the whole body circle free, not just its centre', () => {
    const wallAt = (x: number) => x >= 20;
    expect(bodyClear({ x: 10, y: 0 }, 5, (x) => wallAt(x))).toBe(true);
    expect(bodyClear({ x: 16, y: 0 }, 5, (x) => wallAt(x))).toBe(false);
    expect(bodyClear({ x: 16, y: 0 }, 0, (x) => wallAt(x))).toBe(true);
  });

  it('pickBlinkPoint keeps body-radius clearance from walls', () => {
    const wallRight = (x: number) => x >= 175;
    for (let i = 0; i < 20; i++) {
      const p = pickBlinkPoint({ x: 100, y: 100 }, { x: 90, y: 100 }, 80, () => (i % 10) / 10, wallRight, 8);
      expect(p.x + 8 < 175).toBe(true);
    }
  });
});
