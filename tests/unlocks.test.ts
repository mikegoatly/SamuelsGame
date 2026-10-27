import { describe, expect, it } from 'vitest';
import { heroesCoverBosses, newlyUnlocked, recordBossKill, type RunRecord } from '../src/logic/unlocks';
import { aRunRecord, anAccount } from './builders';

const unlockedBy = (run: Partial<RunRecord>, account = anAccount(), already: string[] = ['wizard']): string[] => newlyUnlocked(already, account, aRunRecord(run));

describe('knight', () => {
  it('needs the whole Ruins level cleared without a single skill attempt', () => {
    expect(unlockedBy({ levelId: 'ruins', skillAttempts: 0 })).toEqual(['knight']);
  });

  it('is not earned with an attempt (even a fizzle), another level, or no clear', () => {
    expect(unlockedBy({ levelId: 'ruins', skillAttempts: 1 })).toEqual([]);
    expect(unlockedBy({ levelId: 'desert', skillAttempts: 0 })).toEqual([]);
    expect(unlockedBy({ levelId: 'ruins', skillAttempts: 0, cleared: false })).toEqual([]);
  });
});

describe('rogue', () => {
  it('needs the Lost Desert cleared in under five minutes', () => {
    expect(unlockedBy({ levelId: 'desert', timeMs: 299_999 })).toEqual(['rogue']);
  });

  it('is not earned at five minutes, in another level or without a clear', () => {
    expect(unlockedBy({ levelId: 'desert', timeMs: 300_000 })).toEqual([]);
    expect(unlockedBy({ levelId: 'ruins', timeMs: 100_000 })).toEqual([]);
    expect(unlockedBy({ levelId: 'desert', timeMs: 100_000, cleared: false })).toEqual([]);
  });
});

describe('dwarf and necromancer (account stats, no run needed)', () => {
  it('the dwarf comes from holding 800 gold at once', () => {
    expect(newlyUnlocked(['wizard'], anAccount({ goldPeak: 799 }))).toEqual([]);
    expect(newlyUnlocked(['wizard'], anAccount({ goldPeak: 800 }))).toEqual(['dwarf']);
  });

  it('the necromancer comes from 600 kills in total', () => {
    expect(newlyUnlocked(['wizard'], anAccount({ totalKills: 599 }))).toEqual([]);
    expect(newlyUnlocked(['wizard'], anAccount({ totalKills: 600 }))).toEqual(['necromancer']);
  });
});

describe('ranger', () => {
  const damageTaken = { melee: 0, ranged: 40, hazard: 10, boss: 60 };

  it('needs the desert or palace cleared with at most a graze of melee damage (20), other damage allowed', () => {
    expect(unlockedBy({ levelId: 'desert', timeMs: 999_999, damageTaken })).toEqual(['ranger']);
    expect(unlockedBy({ levelId: 'palace', damageTaken })).toEqual(['ranger']);
  });

  it('is not earned in the ruins, with melee damage, or without a clear', () => {
    expect(unlockedBy({ levelId: 'ruins', damageTaken })).toEqual([]);
    expect(unlockedBy({ levelId: 'palace', damageTaken: { ...damageTaken, melee: 21 } })).toEqual([]);
    expect(unlockedBy({ levelId: 'palace', damageTaken: { ...damageTaken, melee: 20 } })).toEqual(['ranger']);
    expect(unlockedBy({ levelId: 'palace', damageTaken, cleared: false })).toEqual([]);
  });
});

describe('monk', () => {
  it('needs a clear with no potion drunk, dashing is fine', () => {
    expect(unlockedBy({ potionsUsed: 0, dashes: 0 })).toEqual(['monk']);
    expect(unlockedBy({ potionsUsed: 1, dashes: 0 })).toEqual([]);
    expect(unlockedBy({ potionsUsed: 0, dashes: 12 })).toEqual(['monk']);
    expect(unlockedBy({ potionsUsed: 0, dashes: 0, cleared: false })).toEqual([]);
  });
});

describe('secret hero', () => {
  const all = ['stoneGuardian', 'sandRat', 'madKing'];

  it('needs all three bosses beaten, each by a different hero', () => {
    expect(heroesCoverBosses({ wizard: ['stoneGuardian'], knight: ['sandRat'], rogue: ['madKing'] }, all)).toBe(true);
  });

  it('is found when one hero did several but others cover the rest', () => {
    expect(heroesCoverBosses({ wizard: ['stoneGuardian', 'sandRat'], knight: ['sandRat'], rogue: ['madKing'] }, all)).toBe(true);
  });

  it('is not earned with fewer than three heroes, or a missing boss', () => {
    expect(heroesCoverBosses({ wizard: all }, all)).toBe(false);
    expect(heroesCoverBosses({ wizard: all, knight: ['sandRat'] }, all)).toBe(false);
    expect(heroesCoverBosses({ wizard: ['stoneGuardian'], knight: ['sandRat'] }, all)).toBe(false);
    expect(heroesCoverBosses({ wizard: ['stoneGuardian', 'sandRat'], knight: ['stoneGuardian', 'sandRat'], rogue: ['stoneGuardian'] }, all)).toBe(false);
  });

  it('unlocks through newlyUnlocked', () => {
    const account = anAccount({ bossKillsByHero: { wizard: ['stoneGuardian'], knight: ['sandRat'], rogue: ['madKing'] } });
    expect(newlyUnlocked(['wizard'], account)).toEqual(['secret']);
  });
});

describe('newlyUnlocked', () => {
  it('skips heroes already unlocked and never reports the wizard', () => {
    expect(newlyUnlocked(['wizard', 'dwarf'], anAccount({ goldPeak: 900 }))).toEqual([]);
  });

  it('reports several at once, in roster order', () => {
    const account = anAccount({ goldPeak: 900, totalKills: 1200 });
    expect(newlyUnlocked(['wizard'], account)).toEqual(['dwarf', 'necromancer']);
  });
});

describe('recordBossKill', () => {
  it('adds a boss to a hero once without mutating', () => {
    const before = { wizard: ['sandRat'] };
    const once = recordBossKill(before, 'wizard', 'madKing');
    expect(once).toEqual({ wizard: ['sandRat', 'madKing'] });
    expect(recordBossKill(once, 'wizard', 'madKing')).toEqual(once);
    expect(before).toEqual({ wizard: ['sandRat'] });
    expect(recordBossKill({}, 'knight', 'sandRat')).toEqual({ knight: ['sandRat'] });
  });
});

describe('heroic runs', () => {
  it('a Heroic run carries the base level id, so it earns level-based heroes exactly like a normal clear', () => {
    expect(unlockedBy({ levelId: 'ruins', skillAttempts: 0 })).toEqual(['knight']);
    expect(unlockedBy({ levelId: 'desert', timeMs: 100_000 })).toEqual(['rogue']);
  });
});
