import { describe, expect, it } from 'vitest';
import { Navigator, PathBudget } from '../src/logic/navigator';
import { aRoom, anyOf, block, NAV, navigatorChase, simulate, straightChase } from './navSim';

const room = aRoom();
const pillar = block(120, 40, 200, 160);
const start = { x: 60, y: 100 };
const goal = { x: 260, y: 100 };

describe('chasing around a pillar', () => {
  const blocked = anyOf(room, pillar);

  it('a straight-line chase gets stuck behind it', () => {
    const result = simulate(blocked, start, goal, 30, straightChase(goal));
    expect(result.reachedAt).toBeNull();
    expect(result.at.x).toBeLessThan(120);
  });

  it('the navigator walks round and reaches the player', () => {
    const result = simulate(blocked, start, goal, 30, navigatorChase(blocked, goal));
    expect(result.reachedAt).not.toBeNull();
  });

  it('follows a moving player round the pillar', () => {
    const nav = new Navigator(blocked, NAV.tileSize);
    const target = { x: 260, y: 100 };
    const result = simulate(blocked, start, target, 40, (now, at) => {
      if (now === 15000) target.y = 30;
      return nav.aim(now, at, target, NAV.radius, 40);
    });
    expect(result.reachedAt).not.toBeNull();
  });
});

describe('stuck detection', () => {
  it('slides sideways when it makes no progress against a wall in the open', () => {
    const wall = anyOf(room, block(100, 80, 116, 120));
    const nav = new Navigator(wall, NAV.tileSize);
    const stuck = { x: 90, y: 100 };
    const target = { x: 260, y: 100 };
    let aim = nav.aim(0, stuck, target, NAV.radius, 40);
    for (let now = 50; now <= 1300; now += 50) aim = nav.aim(now, stuck, target, NAV.radius, 40);
    expect(nav.sliding(1300)).toBe(true);
    expect(Math.abs(aim.y - stuck.y)).toBeGreaterThan(Math.abs(aim.x - stuck.x));
  });

  it('does not call it stuck when standing next to the goal', () => {
    const nav = new Navigator(room, NAV.tileSize);
    const at = { x: 100, y: 100 };
    for (let now = 0; now <= 3000; now += 50) nav.aim(now, at, { x: 112, y: 100 }, NAV.radius, 40);
    expect(nav.sliding(3000)).toBe(false);
  });

  it('does not call it stuck when moving at speed', () => {
    const nav = new Navigator(room, NAV.tileSize);
    const at = { x: 40, y: 100 };
    for (let now = 0; now <= 3000; now += 50) {
      at.x += 2;
      nav.aim(now, at, goal, NAV.radius, 40);
    }
    expect(nav.sliding(3000)).toBe(false);
  });
});

describe('path reuse and throttling', () => {
  const blocked = anyOf(room, pillar);

  it('does not search again while the goal stays put and the path is still good', () => {
    const budget = new PathBudget();
    const nav = new Navigator(blocked, NAV.tileSize, () => 0.5, budget);
    simulate(blocked, start, goal, 6, (now, at) => nav.aim(now, at, goal, NAV.radius, 40));
    expect(budget.searches).toBe(1);
  });

  it('searches again once the goal has moved a tile or more', () => {
    const budget = new PathBudget();
    const nav = new Navigator(blocked, NAV.tileSize, () => 0.5, budget);
    nav.aim(0, start, goal, NAV.radius, 40);
    nav.aim(1000, start, { x: goal.x, y: goal.y + 40 }, NAV.radius, 40);
    expect(budget.searches).toBe(2);
  });

  it('never exceeds the per-frame search budget and defers the rest', () => {
    const budget = new PathBudget(2);
    const navs = Array.from({ length: 6 }, () => new Navigator(blocked, NAV.tileSize, () => 0, budget));
    for (const nav of navs) nav.aim(0, start, goal, NAV.radius, 40);
    expect(budget.searches).toBe(2);
    for (const nav of navs) nav.aim(50, start, goal, NAV.radius, 40);
    expect(budget.searches).toBe(4);
  });

  it('remembers an unreachable goal for about a second instead of searching every time', () => {
    const budget = new PathBudget();
    const nav = new Navigator(() => true, NAV.tileSize, () => 0, budget);
    for (let now = 0; now < 900; now += 50) nav.aim(now, start, goal, NAV.radius, 40);
    expect(budget.searches).toBeLessThanOrEqual(1);
  });

  it('drops a stale path after an idle gap and repaths at once', () => {
    const budget = new PathBudget();
    const nav = new Navigator(blocked, NAV.tileSize, () => 0, budget);
    nav.aim(0, start, goal, NAV.radius, 40);
    nav.aim(100, start, goal, NAV.radius, 40);
    expect(budget.searches).toBe(1);
    nav.aim(900, start, goal, NAV.radius, 40);
    expect(budget.searches).toBe(2);
  });

  it('gives every enemy its own repath period so they do not all search on the same frame', () => {
    const budget = new PathBudget(99);
    const rolls = [0, 1];
    let i = 0;
    const navs = [0, 1].map(() => new Navigator(blocked, NAV.tileSize, () => rolls[i++]!, budget));
    const moved = { x: goal.x, y: goal.y };
    for (const nav of navs) nav.aim(0, start, moved, NAV.radius, 40);
    expect(budget.searches).toBe(2);
    moved.y += 40;
    for (const nav of navs) nav.aim(300, start, moved, NAV.radius, 40);
    expect(budget.searches).toBe(3);
  });
});

describe('stuck detection ignores frames that cannot move', () => {
  it('a body with zero effective speed (windup, knockback) is never called stuck', () => {
    const nav = new Navigator(anyOf(room, block(100, 80, 116, 120)), NAV.tileSize);
    const at = { x: 90, y: 100 };
    for (let now = 0; now <= 3000; now += 50) nav.aim(now, at, goal, NAV.radius, 0);
    expect(nav.sliding(3000)).toBe(false);
  });
});

describe('crowd cost', () => {
  it('15 chasers in a big pillared hall stay under 3 searches and 300 expansions per frame on average', () => {
    const hall = anyOf(block(-64, -64, 720, 0), block(-64, 240, 720, 304), block(-64, 0, 0, 240), block(720, 0, 784, 240), block(160, 64, 192, 96), block(160, 144, 192, 176), block(400, 64, 432, 96), block(400, 144, 432, 176));
    const budget = new PathBudget();
    let seed = 7;
    const rng = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const enemies = Array.from({ length: 15 }, (_, i) => ({ at: { x: 40 + (i % 3) * 20, y: 40 + i * 10 }, nav: new Navigator(hall, NAV.tileSize, rng, budget) }));
    const player = { x: 600, y: 120 };
    const frames = 625;
    let worst = 0;
    for (let frame = 0; frame < frames; frame++) {
      const now = frame * 16;
      player.y = 120 + Math.sin(now / 1500) * 80;
      const before = budget.searches;
      for (const e of enemies) {
        const target = e.nav.aim(now, e.at, player, NAV.radius, 40);
        const d = Math.hypot(target.x - e.at.x, target.y - e.at.y) || 1;
        e.at.x += ((target.x - e.at.x) / d) * 0.64;
        e.at.y += ((target.y - e.at.y) / d) * 0.64;
      }
      worst = Math.max(worst, budget.searches - before);
    }
    expect(worst).toBeLessThanOrEqual(3);
    expect(budget.expanded / frames).toBeLessThan(300);
  });
});
