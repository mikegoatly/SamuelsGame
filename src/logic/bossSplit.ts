/**
 * Mother Sludge's family: one shared health pool seen as several pieces. Pure rules only; the runtime reports each piece's health
 * and acts on what comes back (split, merge, died).
 *
 * - tier 0 (mother) splits once, at 66% of her max health, into two tier 1 sludgelings.
 * - a tier 1 piece splits at half of its own birth health into two tier 2 sludgelets, as long as the family stays within four pieces.
 * - children share the parent's current health exactly (the bar never rises).
 * - two pieces of the same tier 1 or 2 left unhit for a while start a merge; the result is a tier 1 piece with the summed health
 *   (so merging never heals and never rebuilds a mother). Hitting either piece cancels it.
 */
export type Tier = 0 | 1 | 2;

export interface Piece {
  id: number;
  tier: Tier;
  hp: number;
  /** Health the piece was born with: a sludgeling splits at half of it. */
  maxHp: number;
  /** Game-clock time of the last hit (or birth), for the merge idle timer. */
  lastHitAt: number;
}

export interface MergeJob {
  a: number;
  b: number;
  startedAt: number;
  mergeAt: number;
}

export interface Family {
  /** The mother's full health: the bar's denominator. */
  motherMax: number;
  pieces: readonly Piece[];
  merge: MergeJob | null;
  nextId: number;
}

export const SPLIT = {
  /** The mother splits at this share of her max health. */
  motherAt: 0.66,
  /** A sludgeling splits at this share of its own health. */
  tierOneAt: 0.5,
  maxPieces: 4,
  /** Unhit for this long before two pieces start to merge. */
  idleMs: 5000,
  /** Wobble, glow line and slide together before they join. */
  mergeMs: 1200,
} as const;

/** What a merge always produces. */
export const MERGED_TIER: Tier = 1;

export function newFamily(motherMax: number, now: number): Family {
  return { motherMax, pieces: [{ id: 1, tier: 0, hp: motherMax, maxHp: motherMax, lastHitAt: now }], merge: null, nextId: 2 };
}

export const pieceById = (f: Family, id: number): Piece | undefined => f.pieces.find((p) => p.id === id);

export const totalHp = (f: Family): number => f.pieces.reduce((sum, p) => sum + p.hp, 0);

/** The boss bar: all the pieces' health over the mother's full health. */
export const barRatio = (f: Family): number => Math.min(1, Math.max(0, totalHp(f) / f.motherMax));

export const isDead = (f: Family): boolean => f.pieces.length === 0;

const involves = (m: MergeJob | null, id: number): boolean => m !== null && (m.a === id || m.b === id);

export function cancelMerge(f: Family): Family {
  return f.merge ? { ...f, merge: null } : f;
}

export interface HpResult {
  family: Family;
  died: boolean;
  mergeCancelled: boolean;
}

/** Records a piece's new health. A hit (not damage over time) also restarts its idle timer and cancels a merge it is part of. */
export function applyHp(f: Family, id: number, hp: number, now: number, hit: boolean): HpResult {
  const piece = pieceById(f, id);
  if (!piece) return { family: f, died: false, mergeCancelled: false };
  const died = hp <= 0;
  const cancels = f.merge !== null && involves(f.merge, id) && (died || hit);
  const pieces = died ? f.pieces.filter((p) => p.id !== id) : f.pieces.map((p) => (p.id === id ? { ...p, hp, lastHitAt: hit ? now : p.lastHitAt } : p));
  return { family: { ...f, pieces, merge: cancels ? null : f.merge }, died, mergeCancelled: cancels };
}

/** Is this piece wounded enough to split, and is there room for one more? */
export function splitDue(f: Family, id: number): boolean {
  const p = pieceById(f, id);
  if (!p || p.hp < 2) return false;
  if (p.tier === 0) return p.hp <= f.motherMax * SPLIT.motherAt;
  if (p.tier === 1) return p.hp <= p.maxHp * SPLIT.tierOneAt && f.pieces.length < SPLIT.maxPieces;
  return false;
}

/** Replaces the piece with two children of the next tier that share its current health exactly. Null when it is not due. */
export function splitPiece(f: Family, id: number, now: number): { family: Family; children: Piece[] } | null {
  const p = pieceById(f, id);
  if (!p || !splitDue(f, id)) return null;
  const tier = (p.tier + 1) as Tier;
  const big = Math.ceil(p.hp / 2);
  const children: Piece[] = [big, p.hp - big].map((hp, i) => ({ id: f.nextId + i, tier, hp, maxHp: hp, lastHitAt: now }));
  const pieces = [...f.pieces.filter((x) => x.id !== id), ...children];
  return { family: { ...f, pieces, nextId: f.nextId + 2, merge: involves(f.merge, id) ? null : f.merge }, children };
}

const idle = (p: Piece, now: number): boolean => now - p.lastHitAt >= SPLIT.idleMs;
const mergeable = (a: Piece, b: Piece): boolean => a.tier === b.tier && a.tier >= 1;

/** The first pair that has been left alone long enough and that `allowed` accepts (distance, busy); null while a merge is already running. */
export function findMerge(f: Family, now: number, allowed: (a: Piece, b: Piece) => boolean): [Piece, Piece] | null {
  if (f.merge) return null;
  const { pieces } = f;
  for (let i = 0; i < pieces.length; i++) {
    const a = pieces[i]!;
    if (!idle(a, now)) continue;
    for (let j = i + 1; j < pieces.length; j++) {
      const b = pieces[j]!;
      if (idle(b, now) && mergeable(a, b) && allowed(a, b)) return [a, b];
    }
  }
  return null;
}

export function startMerge(f: Family, a: Piece, b: Piece, now: number): Family {
  return { ...f, merge: { a: a.id, b: b.id, startedAt: now, mergeAt: now + SPLIT.mergeMs } };
}

export const mergeDue = (f: Family, now: number): boolean => f.merge !== null && now >= f.merge.mergeAt;

/** Joins the pair into one piece with the summed health (a fresh health pool, so it splits again at half of the sum). */
export function completeMerge(f: Family, now: number): { family: Family; piece: Piece } | null {
  const job = f.merge;
  const a = job && pieceById(f, job.a);
  const b = job && pieceById(f, job.b);
  if (!job || !a || !b) return null;
  const hp = a.hp + b.hp;
  const piece: Piece = { id: f.nextId, tier: MERGED_TIER, hp, maxHp: hp, lastHitAt: now };
  const pieces = [...f.pieces.filter((p) => p.id !== a.id && p.id !== b.id), piece];
  return { family: { ...f, pieces, nextId: f.nextId + 1, merge: null }, piece };
}
