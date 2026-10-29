import { describe, expect, it } from 'vitest';
import { boneStaff } from '../src/content/weapons';
import { weaponDps } from '../src/content/weaponDps';
import { BONE_RISE, LESSER_SKELETON, MAX_SKELETONS, passiveEffects, risingFor, SKELETON, type RiseKill } from '../src/logic/passives';
import { sequenceRng } from './builders';

const none = passiveEffects('quickCasting');
const risen = passiveEffects('risenDead');
const kill = (overrides: Partial<RiseKill> = {}): RiseKill => ({ boss: false, byAlly: false, live: 0, crescent: true, ...overrides });

describe('Bone Staff rising (one roll per kill)', () => {
  it.each([
    ['a crescent kill under 10% raises a lesser skeleton', none, 0.05, kill(), 'lesser'],
    ['a crescent kill at 10% or over raises nothing', none, 0.1, kill(), 'none'],
    ['a kill that is not a crescent never raises for a hero without Risen Dead', none, 0.01, kill({ crescent: false }), 'none'],
    ['Risen Dead keeps its own 15% for a full skeleton', risen, 0.1, kill(), 'full'],
    ['a crescent kill on the Necromancer adds the 10% on top (15% to 25%)', risen, 0.2, kill(), 'lesser'],
    ['past both chances nothing rises', risen, 0.25, kill(), 'none'],
    ['a non-crescent kill keeps only Risen Dead', risen, 0.2, kill({ crescent: false }), 'none'],
    ['bosses never rise', none, 0.01, kill({ boss: true }), 'none'],
    ['ally kills never rise', risen, 0.01, kill({ byAlly: true }), 'none'],
  ] as const)('%s', (_, fx, roll, k, expected) => {
    expect(risingFor(fx, sequenceRng(roll), k)).toBe(expected);
  });

  it.each([0, 1, 2])('rises with %i skeletons alive', (live) => {
    expect(risingFor(none, sequenceRng(0.01), kill({ live }))).toBe('lesser');
  });

  it.each([MAX_SKELETONS, MAX_SKELETONS + 1])('never exceeds the cap of 3 (%i alive)', (live) => {
    expect(risingFor(none, sequenceRng(0.01), kill({ live }))).toBe('none');
    expect(risingFor(risen, sequenceRng(0.01), kill({ live }))).toBe('none');
  });

  it('a non-crescent kill right after a crescent kill never raises a lesser skeleton', () => {
    const rng = (): number => 0.01;
    expect(risingFor(none, rng, kill({ crescent: true }))).toBe('lesser');
    expect(risingFor(none, rng, kill({ crescent: false }))).toBe('none');
  });

  it('rolls the rng exactly once per kill', () => {
    let rolls = 0;
    risingFor(risen, () => (rolls++, 0.5), kill());
    expect(rolls).toBe(1);
  });

  it('simulated kills never put more than 3 skeletons up', () => {
    let seed = 7;
    const rng = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let live = 0;
    let peak = 0;
    for (let i = 0; i < 5000; i++) {
      if (risingFor(risen, rng, kill({ live })) !== 'none') live++;
      if (rng() < 0.3) live = Math.max(0, live - 1);
      peak = Math.max(peak, live);
    }
    expect(peak).toBeLessThanOrEqual(MAX_SKELETONS);
  });
});

describe('lesser skeletons', () => {
  it('have half the bite and 5 seconds instead of 8', () => {
    expect(BONE_RISE.chance).toBe(0.1);
    expect(LESSER_SKELETON.biteDamage).toBe(SKELETON.biteDamage / 2);
    expect(LESSER_SKELETON.durationMs).toBe(5000);
    expect(SKELETON.durationMs).toBe(8000);
  });

  it('deal far less damage per second than the Bone Staff, even with all three up', () => {
    const lesserDps = (LESSER_SKELETON.biteDamage * 1000) / LESSER_SKELETON.biteEveryMs;
    expect(lesserDps).toBeLessThan(weaponDps(boneStaff));
    expect(lesserDps * MAX_SKELETONS).toBeLessThan(weaponDps(boneStaff));
  });
});
