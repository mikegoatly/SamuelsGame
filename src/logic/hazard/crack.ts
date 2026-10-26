import { bodyClear } from '../lineOfSight';
import type { Point, Rect } from '../geometry';

export type CrackState = 'intact' | 'cracking' | 'pit' | 'reforming';

export interface CrackTiming {
  /** Step to collapse. */
  fuseMs: number;
  pitMs: number;
  /** Final stretch where the pit is filling back in and safe again. */
  reformMs: number;
}

export const CRACK_TIMING: CrackTiming = { fuseMs: 800, pitMs: 3500, reformMs: 700 };

/** State of a cracked-floor patch `elapsed` ms after it was first stepped on (null = untouched). */
export function crackState(elapsed: number | null, timing: CrackTiming = CRACK_TIMING): CrackState {
  if (elapsed === null) return 'intact';
  if (elapsed < timing.fuseMs) return 'cracking';
  if (elapsed < timing.fuseMs + timing.pitMs) return 'pit';
  return elapsed < timing.fuseMs + timing.pitMs + timing.reformMs ? 'reforming' : 'intact';
}

export const pitsOpen = (state: CrackState): boolean => state === 'pit';

/** Nearest point just outside `rect` from a point inside it (where a victim climbs out), skipping sides that are blocked. */
export function edgeExit(rect: Rect, p: Point, margin: number, blocked: (x: number, y: number) => boolean = () => false): Point {
  const gaps = [
    { d: p.x - rect.x, x: rect.x - margin, y: p.y },
    { d: rect.x + rect.w - p.x, x: rect.x + rect.w + margin, y: p.y },
    { d: p.y - rect.y, x: p.x, y: rect.y - margin },
    { d: rect.y + rect.h - p.y, x: p.x, y: rect.y + rect.h + margin },
  ];
  const ordered = [...gaps].sort((a, b) => a.d - b.d);
  const best = ordered.find((g) => !blocked(g.x, g.y)) ?? ordered[0]!;
  return { x: best.x, y: best.y };
}

const RING_STEP = 6;
const RING_MAX = 8;

/** Where to land after a pit: the nearest side that fits a body of `radius`, else widening rings around the pit; null when nothing fits. */
export function safeExit(rect: Rect, p: Point, margin: number, radius: number, blocked: (x: number, y: number) => boolean): Point | null {
  const fits = (q: Point): boolean => bodyClear(q, radius, blocked);
  const first = edgeExit(rect, p, margin, (x, y) => !fits({ x, y }));
  if (fits(first)) return first;
  const centre = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  for (let ring = 1; ring <= RING_MAX; ring++) {
    const reach = margin + ring * RING_STEP;
    const candidates: Point[] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const t = Math.min(rect.w / 2 / Math.max(Math.abs(dx), 1e-6), rect.h / 2 / Math.max(Math.abs(dy), 1e-6));
      candidates.push({ x: centre.x + dx * (t + reach), y: centre.y + dy * (t + reach) });
    }
    const best = candidates.filter(fits).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    if (best) return best;
  }
  return null;
}
