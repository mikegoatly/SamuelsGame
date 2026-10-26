import { describe, expect, it } from 'vitest';
import { newShark, sharkTargetable, stepShark, type SharkTuning } from '../src/logic/shark';
import { FireTrail } from '../src/logic/trail';
import { newTurret, stepTurret, turretOffset, type TurretTuning } from '../src/logic/turret';
import { ringDirections } from '../src/logic/enemyAi';
import { bendVelocity, pullToward } from '../src/logic/whirl';
import { healAmount, pickHealTarget, pickWardTarget, type SupportTarget } from '../src/logic/support';
import { eventsOver } from './builders';

const shark: SharkTuning = { underMinMs: 1500, leapRange: 70, riseMs: 500, leapMs: 350, leapSpeed: 230, exposedMs: 1000 };

describe('sand shark', () => {
  it('swims under, rises with a warning, leaps, is exposed, then dives again', () => {
    let state = newShark(0);
    const log = eventsOver((now) => {
      const step = stepShark(state, now, 40, shark);
      state = step.state;
      return step.event;
    }, 0, 6000);
    expect(log.slice(0, 4).map((e) => e.event)).toEqual(['rise', 'leap', 'expose', 'dive']);
    expect(log[0]!.at).toBeGreaterThanOrEqual(1500);
    expect(log[1]!.at - log[0]!.at).toBeGreaterThanOrEqual(500);
  });

  it('keeps swimming while the player is out of leap range', () => {
    let state = newShark(0);
    for (let now = 0; now < 10_000; now += 100) state = stepShark(state, now, 200, shark).state;
    expect(state.phase).toBe('under');
  });

  it('is only hittable while it leaps or lies exposed', () => {
    expect(sharkTargetable('under')).toBe(false);
    expect(sharkTargetable('rise')).toBe(false);
    expect(sharkTargetable('leap')).toBe(true);
    expect(sharkTargetable('exposed')).toBe(true);
  });
});

describe('fire imp trail', () => {
  it('drops flames only after moving far enough, caps the count and burns out', () => {
    const trail = new FireTrail({ ttlMs: 2000, spacing: 10, max: 3 });
    expect(trail.drop(0, 0, 0)).toBe(true);
    expect(trail.drop(4, 0, 10)).toBe(false);
    expect(trail.drop(12, 0, 20)).toBe(true);
    trail.drop(24, 0, 30);
    trail.drop(36, 0, 40);
    expect(trail.live(50)).toHaveLength(3);
    expect(trail.live(50).some((f) => f.x === 0)).toBe(false);
    expect(trail.live(5000)).toHaveLength(0);
  });

  it('hurts only a player standing on a live flame', () => {
    const trail = new FireTrail({ ttlMs: 1000, spacing: 10, max: 8 });
    trail.drop(50, 50, 0);
    expect(trail.touching({ x: 54, y: 50 }, 6, 100)).toBe(true);
    expect(trail.touching({ x: 80, y: 50 }, 6, 100)).toBe(false);
    expect(trail.touching({ x: 50, y: 50 }, 6, 1500)).toBe(false);
  });
});

describe('cactus turret', () => {
  const tuning: TurretTuning = { range: 150, warnMs: 450, cooldownMs: 2400, count: 8 };

  it('stays quiet out of range, warns, then fires the ring', () => {
    let state = newTurret(0);
    expect(stepTurret(state, 1000, 400, tuning).event).toBeNull();
    const log = eventsOver((now) => {
      const step = stepTurret(state, now, 100, tuning);
      state = step.state;
      return step.event;
    }, 0, 6000);
    expect(log.slice(0, 3).map((e) => e.event)).toEqual(['warn', 'fire', 'warn']);
    expect(log[1]!.at - log[0]!.at).toBeGreaterThanOrEqual(450);
  });

  it('turns half a step between volleys so the gaps move', () => {
    expect(turretOffset(1, 8) - turretOffset(0, 8)).toBeCloseTo(Math.PI / 8);
  });

  it('ringDirections spreads unit vectors evenly round the circle', () => {
    const dirs = ringDirections(4, 0);
    expect(dirs).toHaveLength(4);
    expect(dirs[0]!.x).toBeCloseTo(1);
    expect(dirs[1]!.y).toBeCloseTo(1);
    for (const d of dirs) expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
  });
});

describe('dust devil', () => {
  it('pulls the player gently toward the centre inside the radius, not beyond or at the eye', () => {
    const pull = pullToward({ x: 0, y: 0 }, { x: 40, y: 0 }, 60, 30, 1000);
    expect(pull.x).toBeLessThan(0);
    expect(Math.abs(pull.x)).toBeLessThanOrEqual(30);
    expect(pullToward({ x: 0, y: 0 }, { x: 90, y: 0 }, 60, 30, 1000)).toEqual({ x: 0, y: 0 });
    expect(pullToward({ x: 0, y: 0 }, { x: 2, y: 0 }, 60, 30, 1000)).toEqual({ x: 0, y: 0 });
  });

  it('bends a passing bolt without changing its speed, one way each side of the devil', () => {
    const vel = { x: 200, y: 0 };
    const above = bendVelocity(vel, { x: 0, y: -20 }, { x: 0, y: 0 }, 60, 3, 100);
    const below = bendVelocity(vel, { x: 0, y: 20 }, { x: 0, y: 0 }, 60, 3, 100);
    expect(Math.hypot(above.x, above.y)).toBeCloseTo(200);
    expect(Math.sign(above.y)).toBe(-Math.sign(below.y));
    expect(Math.abs(above.y)).toBeGreaterThan(1);
  });

  it('leaves bolts outside the whirl alone', () => {
    expect(bendVelocity({ x: 200, y: 0 }, { x: 0, y: -90 }, { x: 0, y: 0 }, 60, 3, 100)).toEqual({ x: 200, y: 0 });
  });
});

describe('mummy priest support', () => {
  const ally = (x: number, hp: number, warded = false): SupportTarget => ({ x, y: 0, hp, maxHp: 100, warded });
  const priest = { x: 0, y: 0 };

  it('heals the most wounded ally in reach, ignoring healthy and distant ones', () => {
    const allies = [ally(30, 90), ally(40, 30), ally(50, 60), ally(300, 5)];
    expect(pickHealTarget(allies, priest, 100)).toBe(1);
    expect(pickHealTarget([ally(30, 95)], priest, 100)).toBe(-1);
  });

  it('wards the nearest ally that has no ward yet', () => {
    const allies = [ally(70, 100, true), ally(90, 100), ally(40, 100)];
    expect(pickWardTarget(allies, priest, 100)).toBe(2);
    expect(pickWardTarget([ally(40, 100, true)], priest, 100)).toBe(-1);
  });

  it('heals a quarter of max health', () => {
    expect(healAmount(80)).toBe(20);
  });
});
