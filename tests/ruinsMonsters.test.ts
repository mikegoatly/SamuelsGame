import { describe, expect, it } from 'vitest';
import { newFuse, stepFuse, fuseFlashOn, type FuseTuning } from '../src/logic/fuse';
import { newOrbit, orbitPoint, stepOrbit, type OrbitTuning } from '../src/logic/orbitDive';
import { newArcher, stepArcher, type ArcherTuning } from '../src/logic/archer';
import { pickCover } from '../src/logic/cover';
import { flankGoal, packCount, scatterAround } from '../src/logic/pack';
import { Graveyard } from '../src/logic/graveyard';
import { lineClear } from '../src/logic/lineOfSight';
import { aWall, eventsOver, noWalls, sequenceRng } from './builders';

describe('bomb beetle fuse', () => {
  const tuning: FuseTuning = { triggerRange: 26, fuseMs: 900 };

  it('rushes until close, lights the fuse once, then explodes after the fuse time', () => {
    let state = newFuse();
    const log = eventsOver((now) => {
      const step = stepFuse(state, now, now < 500 ? 120 : 20, tuning);
      state = step.state;
      return step.event;
    }, 0, 3000);
    expect(log.slice(0, 2).map((e) => e.event)).toEqual(['lit', 'boom']);
    expect(log[0]!.at).toBe(500);
    expect(log[1]!.at - log[0]!.at).toBeGreaterThanOrEqual(900);
    expect(log[1]!.at - log[0]!.at).toBeLessThan(1000);
  });

  it('keeps burning even if the player backs away', () => {
    const lit = stepFuse(newFuse(), 0, 10, tuning).state;
    const later = stepFuse(lit, 400, 500, tuning);
    expect(later.state.phase).toBe('lit');
    expect(stepFuse(later.state, 900, 500, tuning).event).toBe('boom');
  });

  it('flashes faster as the fuse runs down', () => {
    const lit = stepFuse(newFuse(), 0, 10, tuning).state;
    const flips = (from: number, to: number): number => {
      let count = 0;
      let last = fuseFlashOn(lit, from, tuning);
      for (let t = from; t < to; t += 10) {
        const on = fuseFlashOn(lit, t, tuning);
        if (on !== last) count++;
        last = on;
      }
      return count;
    };
    expect(flips(600, 900)).toBeGreaterThan(flips(0, 300));
    expect(fuseFlashOn(newFuse(), 100, tuning)).toBe(false);
  });
});

describe('wisp orbit then dive', () => {
  const tuning: OrbitTuning = { radius: 60, angularSpeed: 2, orbitMs: 2000, warnMs: 500, diveMs: 450, diveSpeed: 220, recoverMs: 700 };
  const target = { x: 100, y: 100 };

  it('orbits at the radius, warns, dives, recovers and orbits again', () => {
    let state = newOrbit(0, tuning);
    const log = eventsOver((now) => {
      const step = stepOrbit(state, now, 50, { x: 160, y: 100 }, target, tuning);
      state = step.state;
      return step.event;
    }, 50, 5000);
    expect(log.slice(0, 4).map((e) => e.event)).toEqual(['warn', 'dive', 'recover', 'orbit']);
    expect(log[0]!.at).toBeGreaterThanOrEqual(2000);
    expect(log[1]!.at - log[0]!.at).toBeGreaterThanOrEqual(500);
  });

  it('locks the dive line when the warning starts', () => {
    let state = newOrbit(0, tuning);
    state = stepOrbit(state, 2000, 50, { x: 160, y: 100 }, target, tuning).state;
    expect(state.phase).toBe('warn');
    expect(state.dive.x).toBeCloseTo(-1);
    const warned = stepOrbit(state, 2200, 50, { x: 0, y: 0 }, { x: 500, y: 500 }, tuning).state;
    expect(warned.dive).toEqual(state.dive);
  });

  it('sweeps its orbit angle and the orbit point sits on the ring', () => {
    const first = stepOrbit(newOrbit(0, tuning), 50, 500, { x: 0, y: 0 }, target, tuning).state;
    expect(first.angle).toBeCloseTo(1);
    const p = orbitPoint(first.angle, target, tuning.radius);
    expect(Math.hypot(p.x - target.x, p.y - target.y)).toBeCloseTo(60);
  });
});

describe('skeleton archer', () => {
  const tuning: ArcherTuning = { shootMs: 1800, volleyEveryMs: 700, panicRange: 50, retreatMaxMs: 2200, hideMs: 1600 };

  it('shoots volleys, retreats to cover, hides, then peeks out to shoot again', () => {
    let state = newArcher(0);
    let atCover = false;
    const log = eventsOver((now) => {
      atCover = state.phase === 'retreat' && now > state.until - 1500;
      const step = stepArcher(state, now, { distance: 120, atCover }, tuning);
      state = step.state;
      return step.event;
    }, 0, 9000);
    const names = log.map((e) => e.event);
    expect(names.filter((n) => n === 'volley').length).toBeGreaterThanOrEqual(2);
    expect(names).toContain('retreat');
    expect(names).toContain('peek');
    expect(names.indexOf('retreat')).toBeLessThan(names.indexOf('peek'));
  });

  it('panics into a retreat when the player closes in', () => {
    const step = stepArcher(newArcher(0), 100, { distance: 30, atCover: false }, tuning);
    expect(step.event).toBe('retreat');
    expect(step.state.phase).toBe('retreat');
  });

  it('gives up retreating after the time limit and hides where it stands', () => {
    let state = stepArcher(newArcher(0), 100, { distance: 30, atCover: false }, tuning).state;
    state = stepArcher(state, 100 + tuning.retreatMaxMs, { distance: 90, atCover: false }, tuning).state;
    expect(state.phase).toBe('hide');
  });
});

describe('pickCover', () => {
  const wall = aWall(100, -500, 110, 500);
  const archer = { x: 80, y: 0 };
  const threat = { x: 220, y: 0 };
  const options = { minRange: 20, maxRange: 70, attempts: 24, bodyRadius: 4 };

  it('finds a free spot out of the threat line of sight, near the archer', () => {
    const spot = pickCover(archer, threat, wall, sequenceRng(0.1, 0.5, 0.9, 0.3, 0.7), options);
    expect(spot).not.toBeNull();
    expect(wall(spot!.x, spot!.y)).toBe(false);
    expect(lineClear(spot!, threat, wall)).toBe(false);
    expect(Math.hypot(spot!.x - archer.x, spot!.y - archer.y)).toBeLessThanOrEqual(70);
  });

  it('returns null in the open', () => {
    expect(pickCover(archer, threat, noWalls, Math.random, options)).toBeNull();
  });
});

describe('rat swarm packs', () => {
  it('rolls a size inside the range and scatters that many free points around the anchor', () => {
    expect(packCount([8, 12], sequenceRng(0))).toBe(8);
    expect(packCount([8, 12], sequenceRng(0.999))).toBe(12);
    const points = scatterAround({ x: 100, y: 100 }, 10, 24, Math.random, aWall(0, 0, 90, 300));
    expect(points).toHaveLength(10);
    for (const p of points) {
      expect(p.x).toBeGreaterThan(90);
      expect(Math.hypot(p.x - 100, p.y - 100)).toBeLessThanOrEqual(24.5);
    }
  });

  it('flankers head for a point off to their side until they are close, then rush the player', () => {
    const target = { x: 100, y: 0 };
    const left = flankGoal({ x: 0, y: 0 }, target, 1, 45, 30);
    const right = flankGoal({ x: 0, y: 0 }, target, -1, 45, 30);
    expect(left.y).toBeGreaterThan(20);
    expect(right.y).toBeLessThan(-20);
    expect(flankGoal({ x: 90, y: 0 }, target, 1, 45, 30)).toEqual(target);
  });
});

describe('necromancer graveyard', () => {
  const corpse = (key: number, x = 50) => ({ key, enemyId: 'slime', level: 2, x, y: 0, at: 0 });

  it('raises each corpse once and only within range and lifetime', () => {
    const yard = new Graveyard(10_000);
    yard.record(corpse(1));
    yard.record(corpse(2, 400));
    expect(yard.nearest({ x: 0, y: 0 }, 120, 1000)?.key).toBe(1);
    yard.raise(1);
    expect(yard.nearest({ x: 0, y: 0 }, 120, 1000)).toBeNull();
    expect(yard.nearest({ x: 400, y: 0 }, 120, 20_000)).toBeNull();
  });

  it('picks the nearest corpse and never re-records a raised monster', () => {
    const yard = new Graveyard(10_000);
    yard.record(corpse(1, 90));
    yard.record(corpse(2, 30));
    expect(yard.nearest({ x: 0, y: 0 }, 120, 100)?.key).toBe(2);
    yard.raise(2);
    yard.record(corpse(2, 30));
    expect(yard.nearest({ x: 0, y: 0 }, 120, 100)?.key).toBe(1);
  });
});
