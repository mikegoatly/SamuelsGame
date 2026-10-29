import { describe, expect, it } from 'vitest';
import { weaponDps } from '../src/content/weaponDps';
import { apprenticeStaff, bow, brokenWand, javelin, weaponAtLevel } from '../src/content/weapons';
import { weaponUpgradeInfo } from '../src/content/upgradeInfo';
import { rewardsOf } from '../src/content/rewards';
import { JAVELIN, javelinAt, JavelinHits, planJavelin, stuckLook } from '../src/logic/javelin';
const expectClose = (actual: number, expected: number, tolerance = 1e-6): void => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);

const open = () => false;
const wallAt = (x: number) => (px: number) => px >= x;

describe('planJavelin', () => {
  it('flies the full range in the open and sticks in the floor', () => {
    const flight = planJavelin({ x: 0, y: 0 }, { x: 1, y: 0 }, JAVELIN.range, JAVELIN.speed, open);
    expectClose(flight.to.x, JAVELIN.range, 2);
    expectClose(flight.flightMs, (JAVELIN.range / JAVELIN.speed) * 1000, 10);
  });

  it('stops short of a wall and sticks in it', () => {
    const flight = planJavelin({ x: 0, y: 0 }, { x: 1, y: 0 }, JAVELIN.range, JAVELIN.speed, (x) => wallAt(100)(x));
    expect(flight.to.x).toBeLessThan(100);
    expect(flight.to.x).toBeGreaterThan(90);
  });

  it.each([0, 30, 45, 90, 135, 200, 315])('open floor at %i degrees always flies the full range', (degrees) => {
    const a = (degrees * Math.PI) / 180;
    const flight = planJavelin({ x: 500, y: 500 }, { x: Math.cos(a), y: Math.sin(a) }, JAVELIN.range, JAVELIN.speed, open);
    expectClose(Math.hypot(flight.to.x - 500, flight.to.y - 500), JAVELIN.range, 2);
  });

  it('a wall to the side of the path (beyond the javelin body) does not stop it, one on the path does', () => {
    const beside = (x: number, y: number) => y >= 10 && x >= 50 && x <= 60;
    expectClose(planJavelin({ x: 0, y: 0 }, { x: 1, y: 0 }, JAVELIN.range, JAVELIN.speed, beside).to.x, JAVELIN.range, 2);
    const onPath = (x: number, y: number) => y >= -2 && y <= 2 && x >= 50 && x <= 60;
    expect(planJavelin({ x: 0, y: 0 }, { x: 1, y: 0 }, JAVELIN.range, JAVELIN.speed, onPath).to.x).toBeLessThan(50);
  });

  it('boxed in against a wall it stays put without flying', () => {
    const flight = planJavelin({ x: 0, y: 0 }, { x: 1, y: 0 }, JAVELIN.range, JAVELIN.speed, () => true);
    expect(flight.to).toEqual({ x: 0, y: 0 });
    expect(flight.flightMs).toBe(0);
  });

  it('aims any direction (stick, touch, mouse all give a direction)', () => {
    const flight = planJavelin({ x: 10, y: 10 }, { x: 0, y: -1 }, 100, 200, open);
    expectClose(flight.to.y, -90, 2);
    expectClose(flight.to.x, 10);
  });
});

describe('javelinAt', () => {
  const flight = planJavelin({ x: 0, y: 0 }, { x: 1, y: 0 }, 200, 200, open);
  it.each([
    [-10, 0, false],
    [500, 100, false],
    [1000, 200, true],
    [5000, 200, true],
  ])('at %ims the tip is at x=%i, landed=%s', (ms, x, landed) => {
    const at = javelinAt(flight, ms);
    expectClose(at.x, x, 2);
    expect(at.landed).toBe(landed);
  });
});

describe('JavelinHits: through everything, each once', () => {
  const row = ['a', 'b', 'c', 'd', 'e'];
  const targets = row.map((_, i) => ({ x: 40 + i * 30, y: 0, reach: 6 }));

  it('hits every enemy in a line, not just the first few', () => {
    const hits = new JavelinHits();
    expect(hits.sweep({ x: 0, y: 0 }, { x: 260, y: 0 }, JAVELIN.width, targets, row)).toEqual(row);
  });

  it('hits each enemy once even when the sweep overlaps it on later frames', () => {
    const hits = new JavelinHits();
    expect(hits.sweep({ x: 0, y: 0 }, { x: 50, y: 0 }, JAVELIN.width, targets, row)).toEqual(['a']);
    expect(hits.sweep({ x: 50, y: 0 }, { x: 56, y: 0 }, JAVELIN.width, targets, row)).toEqual([]);
    expect(hits.sweep({ x: 56, y: 0 }, { x: 80, y: 0 }, JAVELIN.width, targets, row)).toEqual(['b']);
  });

  it('misses enemies off the line and enemies not yet reached', () => {
    const hits = new JavelinHits();
    expect(hits.sweep({ x: 0, y: 0 }, { x: 100, y: 0 }, JAVELIN.width, [{ x: 50, y: 40, reach: 6 }, { x: 150, y: 0, reach: 6 }], ['off', 'far'])).toEqual([]);
  });

  it('big bodies are hit by the line grazing their edge', () => {
    const hits = new JavelinHits();
    expect(hits.sweep({ x: 0, y: 0 }, { x: 100, y: 0 }, JAVELIN.width, [{ x: 50, y: 20, reach: 18 }], ['boss'])).toEqual(['boss']);
  });
});

describe('stuckLook', () => {
  it.each([
    [0, 1, false],
    [JAVELIN.stuckMs, 1, false],
    [JAVELIN.stuckMs + JAVELIN.fadeMs / 2, 0.5, false],
    [JAVELIN.stuckMs + JAVELIN.fadeMs, 0, true],
  ])('plain javelin %ims after sticking: alpha %f over=%s', (ms, alpha, over) => {
    const look = stuckLook(ms, false);
    expectClose(look.alpha, alpha, 0.01);
    expect(look.over).toBe(over);
    expect(look.glow).toBe(0);
    expect(look.burst).toBe(false);
  });

  it('with the twist it glows up to a burst after 1s, then is over', () => {
    expect(stuckLook(500, true)).toMatchObject({ glow: 0.5, over: false, burst: false, alpha: 1 });
    expect(stuckLook(JAVELIN.burstDelayMs - 1, true).burst).toBe(false);
    expect(stuckLook(JAVELIN.burstDelayMs, true)).toMatchObject({ over: true, burst: true });
  });

  it('bursts reach about 28px', () => {
    expect(JAVELIN.burstRadius).toBe(28);
  });
});

describe('Javelin numbers', () => {
  it('is a slow throw (~700ms), 260px range, ranged, no charge, level 5 twist stickBurst', () => {
    expect(javelin.fireRateMs).toBe(700);
    expect(javelin.range).toBe(JAVELIN.range);
    expect(javelin.kind).toBe('ranged');
    expect(javelin.charge).toBeUndefined();
    expect(weaponAtLevel(javelin, 4).activeTwist).toBeUndefined();
    expect(weaponAtLevel(javelin, 5).activeTwist).toBe('stickBurst');
  });

  it.each([1, 5, 10])('level %i: one-target DPS sits between the staff and the wand, and a line of two out-damages the wand', (level) => {
    const dps = weaponDps(weaponAtLevel(javelin, level));
    expect(dps).toBeGreaterThan(weaponDps(weaponAtLevel(apprenticeStaff, level)));
    expect(dps).toBeLessThan(weaponDps(weaponAtLevel(brokenWand, level)));
    expect(dps * 2).toBeGreaterThan(weaponDps(weaponAtLevel(brokenWand, level)));
    expect(dps * 2).toBeGreaterThan(weaponDps(weaponAtLevel(bow, level)));
  });

  it('upgrades with red gems at tier 3 and says what the twist does', () => {
    expect(weaponUpgradeInfo.javelin).toEqual({ gem: 'red', tier: 3, twist: 'The stuck javelin bursts' });
  });

  it('is announced on the results screen', () => {
    expect(rewardsOf({ rewardWeaponId: 'javelin' })[0]).toMatchObject({ kind: 'weapon', id: 'javelin', headline: 'Burning Javelin acquired!' });
  });
});
