import { describe, expect, it } from 'vitest';
import {
  SPLIT,
  applyHp,
  barRatio,
  cancelMerge,
  completeMerge,
  findMerge,
  isDead,
  mergeDue,
  newFamily,
  pieceById,
  splitDue,
  splitPiece,
  startMerge,
  totalHp,
  type Family,
  type Piece,
} from '../src/logic/bossSplit';

const MAX = 1000;
const any = (): boolean => true;
const hp = (f: Family): number[] => f.pieces.map((p) => p.hp);
const tiers = (f: Family): number[] => f.pieces.map((p) => p.tier);

/** Mother hit down to `to` hp, split into two sludgelings. */
function split(to = 650): Family {
  const hit = applyHp(newFamily(MAX, 0), 1, to, 100, true).family;
  return splitPiece(hit, 1, 200)!.family;
}

/** Both sludgelings split once more: four sludgelets. */
function four(): Family {
  let f = split(600);
  for (const p of f.pieces.filter((x) => x.tier === 1)) {
    f = applyHp(f, p.id, Math.floor(p.maxHp / 2), 300, true).family;
    f = splitPiece(f, p.id, 400)!.family;
  }
  return f;
}

describe('a new family', () => {
  it('is one mother at full health with a full bar', () => {
    const f = newFamily(MAX, 0);
    expect(f.pieces).toHaveLength(1);
    expect(f.pieces[0]).toMatchObject({ tier: 0, hp: MAX, maxHp: MAX });
    expect(barRatio(f)).toBe(1);
    expect(isDead(f)).toBe(false);
  });
});

describe('when the mother splits', () => {
  it.each([
    { name: 'a hit to just over the line does nothing', hp: 661, due: false },
    { name: 'at exactly 66% she is due', hp: 660, due: true },
    { name: 'far below the line she is due', hp: 300, due: true },
    { name: 'a sliver of health cannot be shared', hp: 1, due: false },
  ])('$name', ({ hp: to, due }) => {
    const f = applyHp(newFamily(MAX, 0), 1, to, 50, true).family;
    expect(splitDue(f, 1)).toBe(due);
  });

  it.each([650, 660, 401, 400, 333, 10])('two sludgelings share %i hp exactly, never more', (to) => {
    const f = split(to);
    expect(tiers(f)).toEqual([1, 1]);
    expect(hp(f).reduce((a, b) => a + b, 0)).toBe(to);
    expect(Math.abs(hp(f)[0]! - hp(f)[1]!)).toBeLessThanOrEqual(1);
    expect(totalHp(f)).toBe(to);
  });

  it('the bar does not move on a split', () => {
    const before = applyHp(newFamily(MAX, 0), 1, 640, 10, true).family;
    expect(barRatio(splitPiece(before, 1, 20)!.family)).toBe(barRatio(before));
  });

  it('children are born with their share as their own health pool and a fresh idle clock', () => {
    const f = split(650);
    for (const p of f.pieces) {
      expect(p.maxHp).toBe(p.hp);
      expect(p.lastHitAt).toBe(200);
    }
  });

  it('children get new ids and the mother is gone', () => {
    const f = split();
    expect(pieceById(f, 1)).toBeUndefined();
    expect(new Set(f.pieces.map((p) => p.id)).size).toBe(2);
  });

  it('refuses to split a piece that is not due', () => {
    expect(splitPiece(newFamily(MAX, 0), 1, 0)).toBeNull();
  });
});

describe('when sludgelings split', () => {
  it('each splits at half of its own health', () => {
    const f = split(600);
    const [a] = f.pieces;
    expect(splitDue(applyHp(f, a!.id, 151, 5, true).family, a!.id)).toBe(false);
    expect(splitDue(applyHp(f, a!.id, 150, 5, true).family, a!.id)).toBe(true);
  });

  it('children keep the parent current health and the family never exceeds four', () => {
    const f = four();
    expect(f.pieces).toHaveLength(SPLIT.maxPieces);
    expect(tiers(f)).toEqual([2, 2, 2, 2]);
    expect(totalHp(f)).toBe(300);
    expect(barRatio(f)).toBeLessThan(0.4);
  });

  it('a sludgelet never splits again', () => {
    const f = four();
    const p = f.pieces[0]!;
    expect(splitDue(applyHp(f, p.id, 2, 1, true).family, p.id)).toBe(false);
  });

  it('does not split when the family is already at the cap', () => {
    const base = split(600);
    const full: Family = { ...base, pieces: [...base.pieces, { id: 90, tier: 2, hp: 50, maxHp: 50, lastHitAt: 0 }, { id: 91, tier: 2, hp: 50, maxHp: 50, lastHitAt: 0 }] };
    const target = full.pieces[0]!;
    expect(splitDue(applyHp(full, target.id, 1 + Math.floor(target.maxHp / 2) - 1, 5, true).family, target.id)).toBe(false);
  });
});

describe('damage and death', () => {
  it('hits lower the bar by the damage', () => {
    const f = applyHp(newFamily(MAX, 0), 1, 900, 5, true).family;
    expect(barRatio(f)).toBeCloseTo(0.9, 6);
  });

  it('a piece at 0 is removed; the family is dead when the last one goes', () => {
    let f = split(600);
    const [a, b] = f.pieces;
    const first = applyHp(f, a!.id, 0, 10, true);
    expect(first.died).toBe(true);
    expect(first.family.pieces).toHaveLength(1);
    expect(isDead(first.family)).toBe(false);
    f = applyHp(first.family, b!.id, -5, 11, true).family;
    expect(isDead(f)).toBe(true);
    expect(barRatio(f)).toBe(0);
  });

  it('a big hit that kills a piece does not split it', () => {
    const f = applyHp(newFamily(MAX, 0), 1, 0, 5, true);
    expect(f.family.pieces).toHaveLength(0);
  });

  it('unknown ids are ignored', () => {
    const f = newFamily(MAX, 0);
    expect(applyHp(f, 99, 0, 1, true).family).toBe(f);
  });

  it('damage over time updates health without touching the idle clock', () => {
    const f = applyHp(newFamily(MAX, 0), 1, 990, 77, false).family;
    expect(f.pieces[0]!.lastHitAt).toBe(0);
    expect(f.pieces[0]!.hp).toBe(990);
  });
});

describe('merging', () => {
  const T0 = 1000;
  const idleFor = (f: Family, ms: number) => findMerge(f, T0 + ms, any);

  it('two sludgelets left alone for 5s are paired; sooner is not', () => {
    const f = four();
    const born = f.pieces[0]!.lastHitAt;
    expect(findMerge(f, born + SPLIT.idleMs - 1, any)).toBeNull();
    const pair = findMerge(f, born + SPLIT.idleMs, any);
    expect(pair).not.toBeNull();
    expect(pair![0].tier).toBe(2);
    expect(pair![1].tier).toBe(2);
  });

  it('a piece that was hit recently does not take part', () => {
    const f = four();
    const born = f.pieces[0]!.lastHitAt;
    let busy = f;
    for (const p of f.pieces.slice(0, 3)) busy = applyHp(busy, p.id, p.hp, born + 4000, true).family;
    expect(findMerge(busy, born + SPLIT.idleMs, any)).toBeNull();
  });

  it('only same-tier pieces pair, the mother never merges, and a lone piece has no partner', () => {
    const mixed: Family = {
      motherMax: MAX,
      nextId: 10,
      merge: null,
      pieces: [
        { id: 1, tier: 1, hp: 100, maxHp: 200, lastHitAt: 0 },
        { id: 2, tier: 2, hp: 50, maxHp: 50, lastHitAt: 0 },
      ],
    };
    expect(findMerge(mixed, 99_999, any)).toBeNull();
    expect(findMerge(newFamily(MAX, 0), 99_999, any)).toBeNull();
    expect(findMerge(split(), 99_999, any)).not.toBeNull();
  });

  it('the caller can veto a pair (too far apart, busy)', () => {
    expect(findMerge(four(), 99_999, () => false)).toBeNull();
    const only = findMerge(four(), 99_999, (a, b) => a.id === four().pieces[2]!.id && b.id === four().pieces[3]!.id);
    expect(only).not.toBeNull();
  });

  it('starting a merge sets a ~1.2s countdown and only one merge runs at a time', () => {
    const f = four();
    const [a, b] = findMerge(f, 99_000, any)!;
    const started = startMerge(f, a, b, 99_000);
    expect(started.merge).toEqual({ a: a.id, b: b.id, startedAt: 99_000, mergeAt: 99_000 + SPLIT.mergeMs });
    expect(findMerge(started, 120_000, any)).toBeNull();
  });

  it('nothing happens before the countdown ends, then the pair becomes one sludgeling with the summed health', () => {
    const f = four();
    const [a, b] = findMerge(f, 99_000, any)!;
    const sum = a.hp + b.hp;
    const started = startMerge(f, a, b, 99_000);
    expect(mergeDue(started, 99_000 + SPLIT.mergeMs - 1)).toBe(false);
    expect(mergeDue(started, 99_000 + SPLIT.mergeMs)).toBe(true);
    const done = completeMerge(started, 100_500)!;
    expect(done.piece).toMatchObject({ tier: 1, hp: sum, maxHp: sum, lastHitAt: 100_500 });
    expect(done.family.pieces).toHaveLength(f.pieces.length - 1);
    expect(done.family.merge).toBeNull();
    expect(totalHp(done.family)).toBe(totalHp(f));
    expect(barRatio(done.family)).toBe(barRatio(f));
  });

  it('merging never heals: the total never rises', () => {
    let f = four();
    const before = totalHp(f);
    for (let i = 0; i < 3 && f.pieces.length > 1; i++) {
      const pair = findMerge(f, 999_999, any);
      if (!pair) break;
      f = completeMerge(startMerge(f, pair[0], pair[1], 999_999), 1_001_000)!.family;
      expect(totalHp(f)).toBe(before);
    }
  });

  it('two sludgelings may merge into a bigger sludgeling, never into a mother', () => {
    const f = split(600);
    const [a, b] = findMerge(f, 99_000, any)!;
    const done = completeMerge(startMerge(f, a, b, 99_000), 101_000)!;
    expect(done.piece.tier).toBe(1);
    expect(done.family.pieces).toHaveLength(1);
    expect(done.family.pieces.every((p) => p.tier >= 1)).toBe(true);
  });

  it('a merged sludgeling can split again at half its own (summed) health', () => {
    const f = four();
    const [a, b] = findMerge(f, 99_000, any)!;
    const done = completeMerge(startMerge(f, a, b, 99_000), 101_000)!;
    const p = done.piece;
    expect(splitDue(done.family, p.id)).toBe(false);
    expect(splitDue(applyHp(done.family, p.id, Math.floor(p.maxHp / 2), 102_000, true).family, p.id)).toBe(true);
  });

  it('hitting either piece cancels the merge', () => {
    const f = four();
    const [a, b] = findMerge(f, 99_000, any)!;
    const started = startMerge(f, a, b, 99_000);
    for (const id of [a.id, b.id]) {
      const hit = applyHp(started, id, pieceById(started, id)!.hp - 5, 99_500, true);
      expect(hit.family.merge).toBeNull();
      expect(hit.mergeCancelled).toBe(true);
    }
  });

  it('hitting an unrelated piece leaves it running', () => {
    const f = four();
    const [a, b] = findMerge(f, 99_000, any)!;
    const started = startMerge(f, a, b, 99_000);
    const other = f.pieces.find((p) => p.id !== a.id && p.id !== b.id)!;
    const hit = applyHp(started, other.id, other.hp - 5, 99_500, true);
    expect(hit.family.merge).not.toBeNull();
    expect(hit.mergeCancelled).toBe(false);
  });

  it('killing or splitting a partner cancels it too, and cancelMerge is idempotent', () => {
    const f = four();
    const [a, b] = findMerge(f, 99_000, any)!;
    const started = startMerge(f, a, b, 99_000);
    expect(applyHp(started, a.id, 0, 99_500, true).family.merge).toBeNull();
    expect(cancelMerge(cancelMerge(started))).toEqual(cancelMerge(started));
    expect(cancelMerge(started).merge).toBeNull();
  });

  it('completing with no merge running does nothing', () => {
    expect(completeMerge(four(), 1)).toBeNull();
    expect(mergeDue(four(), 1e9)).toBe(false);
  });

  it('a cancelled pair waits out the idle time again before pairing', () => {
    const f = four();
    const [a, b] = findMerge(f, 99_000, any)!;
    const hit = applyHp(startMerge(f, a, b, 99_000), a.id, a.hp - 1, 99_500, true).family;
    const next = findMerge(hit, 99_500 + SPLIT.idleMs - 1, any);
    expect(next === null || (next[0].id !== a.id && next[1].id !== a.id)).toBe(true);
  });

  it('idleFor helper stays honest', () => {
    expect(idleFor(newFamily(MAX, T0), 99_999)).toBeNull();
  });
});

describe('invariants over a long scripted fight', () => {
  it('total health only ever falls, even with merges and splits mixed in', () => {
    let f: Family = newFamily(MAX, 0);
    let last = totalHp(f);
    let now = 0;
    for (let step = 0; step < 400 && !isDead(f); step++) {
      now += 700;
      const target: Piece = f.pieces[step % f.pieces.length]!;
      if (step % 7 !== 0) f = applyHp(f, target.id, target.hp - 9, now, true).family;
      const due = f.pieces.find((p) => splitDue(f, p.id));
      if (due) f = splitPiece(f, due.id, now)!.family;
      if (!f.merge) {
        const pair = findMerge(f, now, any);
        if (pair) f = startMerge(f, pair[0], pair[1], now);
      } else if (mergeDue(f, now)) f = completeMerge(f, now)!.family;
      expect(totalHp(f)).toBeLessThanOrEqual(last);
      expect(f.pieces.length).toBeLessThanOrEqual(SPLIT.maxPieces);
      last = totalHp(f);
    }
    expect(isDead(f)).toBe(true);
  });
});
