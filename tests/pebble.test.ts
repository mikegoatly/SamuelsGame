import { describe, expect, it } from 'vitest';
import { bertsPebble, skillCooldown, skillParams } from '../src/content/skills';
import { skillUpgradeInfo } from '../src/content/upgradeInfo';
import { previewUpgrade } from '../src/content/upgradePreview';
import { PEBBLE_INTERCEPT, PEBBLE_ORBIT_RADIUS, PEBBLE_REACH, blockShot, newPebble, orbitAngle, orbitPoint, pebbleReady, pebbleToBlock, pebbleTouches } from '../src/logic/pebble';
import { expectClose } from './builders';

describe('a pebble', () => {
  it('starts ready, and after blocking a shot is busy until its recharge is over', () => {
    const pebble = newPebble(1000);
    expect(pebbleReady(pebble, 1000)).toBe(true);
    const spent = blockShot(pebble, 1500, 4000);
    expect(pebbleReady(spent, 1500)).toBe(false);
    expect(pebbleReady(spent, 5499)).toBe(false);
    expect(pebbleReady(spent, 5500)).toBe(true);
  });

  it('is pure: blocking returns a new pebble', () => {
    const pebble = newPebble(0);
    blockShot(pebble, 100, 4000);
    expect(pebbleReady(pebble, 100)).toBe(true);
  });

  it('only a shot within reach of its centre counts as touching', () => {
    expect(pebbleTouches({ x: 10, y: 10 }, { x: 13, y: 14 }, 6)).toBe(true);
    expect(pebbleTouches({ x: 10, y: 10 }, { x: 20, y: 10 }, 6)).toBe(false);
  });
});

describe('orbit', () => {
  it('goes once round per period', () => {
    expectClose(orbitAngle(0, 0, 1, 2000), 0);
    expectClose(orbitAngle(500, 0, 1, 2000), Math.PI / 2);
    expectClose(orbitAngle(2000, 0, 1, 2000) % (Math.PI * 2), 0);
  });

  it('spreads several pebbles evenly round the player', () => {
    expectClose(orbitAngle(0, 1, 2, 2000) - orbitAngle(0, 0, 2, 2000), Math.PI);
  });

  it('puts the pebble on a circle round the player', () => {
    const at = orbitPoint({ x: 50, y: 50 }, Math.PI / 2, 20);
    expectClose(at.x, 50);
    expectClose(at.y, 70);
  });
});

describe("Bert's Pebble the skill", () => {
  it('is a blue-gem skill with a twist and its own icon key', () => {
    expect(bertsPebble.id).toBe('bertsPebble');
    expect(bertsPebble.icon).toBe('skill-bertsPebble');
    expect(skillUpgradeInfo.bertsPebble).toMatchObject({ gem: 'blue' });
    expect(skillUpgradeInfo.bertsPebble!.twist.length).toBeGreaterThan(5);
  });

  it('at level 1 stays out for a while and blocks one shot every few seconds', () => {
    const params = skillParams(bertsPebble, 1);
    expect(params.durationMs).toBeGreaterThanOrEqual(8000);
    expect(params.rechargeMs).toBeGreaterThanOrEqual(3000);
    expect(params.rechargeMs).toBeLessThanOrEqual(6000);
    expect(params.count).toBe(1);
    expect(params.twist).toBe(false);
  });

  it('only gets better with levels, and the twist (level 5) adds a second pebble', () => {
    for (let level = 2; level <= 5; level++) {
      const before = skillParams(bertsPebble, level - 1);
      const after = skillParams(bertsPebble, level);
      expect(after.durationMs).toBeGreaterThanOrEqual(before.durationMs);
      expect(after.rechargeMs).toBeLessThanOrEqual(before.rechargeMs);
      expect(skillCooldown(bertsPebble, level)).toBeLessThan(skillCooldown(bertsPebble, level - 1));
    }
    expect(skillParams(bertsPebble, 5)).toMatchObject({ count: 2, twist: true });
    expect(skillParams(bertsPebble, 4).count).toBe(1);
  });

  it('is on a cooldown short enough to keep it out most of the time but never permanently', () => {
    for (let level = 1; level <= 5; level++) expect(skillCooldown(bertsPebble, level)).toBeGreaterThan(skillParams(bertsPebble, level).durationMs);
  });

  it('shows what the next level changes', () => {
    const { lines } = previewUpgrade('skill', 'bertsPebble', 1);
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe('interception', () => {
  const player = { x: 100, y: 100 };
  const ready = (n: number) => Array.from({ length: n }, () => newPebble(0));

  it.each([
    ['a shot right on the player', { x: 100, y: 100 }, 0],
    ['a shot just inside the intercept ring', { x: 100 + PEBBLE_INTERCEPT - 1, y: 100 }, 0],
    ['a shot just outside it', { x: 100 + PEBBLE_INTERCEPT + 1, y: 100 }, -1],
    ['a shot far away', { x: 300, y: 100 }, -1],
  ])('%s (first ready pebble blocks it)', (_, shot, expected) => {
    expect(pebbleToBlock(ready(2), 10, shot, player)).toBe(expected);
  });

  it('skips pebbles that are recharging and uses the next ready one', () => {
    const pebbles = [blockShot(newPebble(0), 0, 4000), newPebble(0)];
    expect(pebbleToBlock(pebbles, 100, { x: 100, y: 110 }, player)).toBe(1);
  });

  it('blocks nothing when every pebble is recharging', () => {
    const pebbles = [blockShot(newPebble(0), 0, 4000), blockShot(newPebble(0), 0, 4000)];
    expect(pebbleToBlock(pebbles, 100, { x: 100, y: 110 }, player)).toBe(-1);
  });

  it('the intercept ring reaches the orbit, so a shot is stopped before it reaches the player', () => {
    expect(PEBBLE_INTERCEPT).toBe(PEBBLE_ORBIT_RADIUS + PEBBLE_REACH);
  });
});
