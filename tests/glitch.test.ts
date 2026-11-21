import { describe, expect, it } from 'vitest';
import { chooseRunMap, type RunMapInput } from '../src/logic/runSeed';
import { GLITCH_CHANCE, glitchBossLevel, glitchRoomRange, isGlitchUnlocked, shouldPlaceGlitch, type GlitchTileInput } from '../src/logic/glitch';

const ALL = ['ruins', 'desert', 'palace'];
const input = (over: Partial<GlitchTileInput> = {}): GlitchTileInput => ({
  levelId: 'desert',
  heroicCleared: ALL,
  glitchFound: false,
  randomMap: true,
  fresh: true,
  rng: () => 0.99,
  ...over,
});

describe('isGlitchUnlocked', () => {
  it.each([
    [[], false],
    [['ruins'], false],
    [['ruins', 'desert'], false],
    [['desert', 'palace'], false],
    [['ruins', 'desert', 'palace'], true],
    [['sewer', 'palace', 'desert', 'ruins'], true],
  ])('heroic cleared %j -> %s', (cleared, expected) => {
    expect(isGlitchUnlocked(cleared)).toBe(expected);
  });
});

describe('shouldPlaceGlitch', () => {
  it.each([
    ['guaranteed before discovery, whatever the roll', {}, true],
    ['not before the trio is cleared', { heroicCleared: ['ruins', 'desert'] }, false],
    ['never on a classic map', { randomMap: false }, false],
    ['never on a retry or dev-seeded run', { fresh: false }, false],
    ['never on Glitch itself', { levelId: 'glitch' }, false],
    ['never on Survival', { levelId: 'survival' }, false],
    ['after discovery, a bad roll misses', { glitchFound: true, rng: () => GLITCH_CHANCE }, false],
    ['after discovery, a good roll hits', { glitchFound: true, rng: () => GLITCH_CHANCE - 0.001 }, true],
    ['forced even when nothing else allows it', { force: true, heroicCleared: [], randomMap: true, glitchFound: true, rng: () => 0.99 }, true],
    ['force still skips Glitch itself', { force: true, levelId: 'glitch' }, false],
    ['force still needs a random map', { force: true, randomMap: false }, false],
  ] as [string, Partial<GlitchTileInput>, boolean][])('%s', (_, over, expected) => {
    expect(shouldPlaceGlitch(input(over))).toBe(expected);
  });

  it('is 20% after discovery', () => {
    expect(GLITCH_CHANCE).toBe(0.2);
  });
});

describe('glitch monster levels', () => {
  it.each([
    [1, 1, 15, 16],
    [3, 1, 15, 16],
    [4, 1, 16, 17],
    [6, 1, 16, 17],
    [1, 20, 20, 21],
    [6, 20, 21, 22],
  ])('room %i at hero level %i -> %i-%i', (order, hero, low, high) => {
    expect(glitchRoomRange(order, 6, hero, false)).toEqual([low, high]);
  });

  it('tops out at heroLevel + 2 (minimum 15) and Heroic is one level harder', () => {
    expect(glitchRoomRange(6, 6, 10, false)[1]).toBe(17);
    expect(glitchRoomRange(1, 6, 10, true)).toEqual([16, 17]);
  });

  it('never passes the level cap', () => {
    expect(glitchRoomRange(6, 6, 49, true)[1]).toBeLessThanOrEqual(50);
  });

  it.each([
    [1, false, 18],
    [20, false, 23],
    [20, true, 24],
  ])('boss at hero %i heroic %s is level %i', (hero, heroic, expected) => {
    expect(glitchBossLevel(hero, heroic)).toBe(expected);
  });
});

describe('chooseRunMap and the glitch tile', () => {
  const choose = (over: Partial<RunMapInput> = {}) =>
    chooseRunMap({ levelId: 'desert', cleared: ['desert'], hasRandomMap: true, rng: () => 0.4, heroicCleared: ALL, ...over });

  it.each([
    ['guaranteed on a fresh eligible run before discovery', {}, true],
    ['not when the trio is not cleared', { heroicCleared: ['ruins'] }, false],
    ['not on a classic map (level not cleared yet)', { cleared: [] }, false],
    ['not on a map without a random version', { hasRandomMap: false }, false],
    ['not on a dev-seeded run', { devSeed: 5 }, false],
    ['forced on a dev-seeded run', { devSeed: 5, forceGlitch: true }, true],
    ['forced on an uncleared level, which then gets a random map', { cleared: [], forceGlitch: true }, true],
    ['not on Glitch itself, even forced', { levelId: 'glitch', cleared: [], forceGlitch: true }, false],
  ] as [string, Partial<RunMapInput>, boolean][])('%s', (_, over, expected) => {
    expect(choose(over).glitch === true).toBe(expected);
  });

  it('keeps the tile (or its absence) on a retry', () => {
    const first = choose();
    expect(choose({ previous: first })).toBe(first);
    const without = choose({ glitchFound: true, rng: () => 0.4, previous: { seed: 9, classic: false } });
    expect(without.glitch).toBeUndefined();
  });

  it('is always a random map for Glitch, even before it is cleared', () => {
    expect(choose({ levelId: 'glitch', cleared: [] }).classic).toBe(false);
  });

  it('rolls about one run in five once Glitch is found', () => {
    let hits = 0;
    let seed = 1;
    const rng = (): number => ((seed = (seed * 48271) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) if (choose({ glitchFound: true, rng }).glitch) hits++;
    expect(hits / 2000).toBeGreaterThan(0.16);
    expect(hits / 2000).toBeLessThan(0.24);
  });
});

describe('the post-discovery chance is exactly 20%', () => {
  it('hits for rolls below 0.2 and only those, across the whole rng range', () => {
    let hits = 0;
    for (let i = 0; i < 1000; i++) if (shouldPlaceGlitch(input({ glitchFound: true, rng: () => i / 1000 }))) hits++;
    expect(hits).toBe(200);
  });

  it('through chooseRunMap, even for consecutive seeds (the roll stream is seeded per run)', () => {
    let hits = 0;
    for (let seed = 0; seed < 5000; seed++) {
      const rng = (): number => seed / 2 ** 31;
      if (chooseRunMap({ levelId: 'desert', cleared: ['desert'], hasRandomMap: true, rng, heroicCleared: ALL, glitchFound: true }).glitch) hits++;
    }
    expect(hits / 5000).toBeGreaterThan(0.18);
    expect(hits / 5000).toBeLessThan(0.22);
  });
});
