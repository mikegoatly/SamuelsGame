import type { Point, Rect } from '../geometry';
import { phaseAt, type PhaseAt } from './cycle';

/** The sewer's signature hazard: a drain gurgles for a second, then the channel carries everything in it downstream for two. No damage. */
export const FLUSH = { calmMs: 9000, warnMs: 1000, pushMs: 2000, speed: 80, rampMs: 300 } as const;

const PHASES = [
  { name: 'calm', ms: FLUSH.calmMs },
  { name: 'warn', ms: FLUSH.warnMs },
  { name: 'push', ms: FLUSH.pushMs },
] as const;

export type FlushPhase = PhaseAt<(typeof PHASES)[number]['name']>;

/** Phase offsets are drawn from 0 up to this, so a room's first flush lands 6-9s after it wakes. */
export const FLUSH_OFFSET_MAX_MS = 3000;
export const FLUSH_FIRST_MS = [FLUSH.calmMs - FLUSH_OFFSET_MAX_MS, FLUSH.calmMs] as const;

export const flushPhase = (now: number, offsetMs: number): FlushPhase => phaseAt(now, offsetMs, PHASES);

export const dirVector = (deg: number): Point => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) });

/** Downstream push in px/s: nothing outside the push, easing in and out over `rampMs` so nobody is yanked. */
export function flushVelocity(phase: FlushPhase, deg: number): Point {
  if (phase.name !== 'push') return { x: 0, y: 0 };
  const ease = Math.min(1, phase.t / FLUSH.rampMs, (FLUSH.pushMs - phase.t) / FLUSH.rampMs);
  const speed = FLUSH.speed * Math.max(0, ease);
  const d = dirVector(deg);
  return { x: d.x * speed, y: d.y * speed };
}

/** True when the point is in any of the channel's segments (the bridges between them are dry). */
export const inChannel = (segments: readonly Rect[], p: Point): boolean => segments.some((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);

export interface FlushArrow {
  x: number;
  y: number;
  /** Heading in degrees (0 east, 90 south). */
  angle: number;
  alpha: number;
}

const ARROW_GAP = 28;
const TILE = 16;

/** Chevrons marching downstream along the channel: fading in during the telegraph, solid through the push. */
export function flushArrows(rect: Rect, deg: number, phase: FlushPhase): FlushArrow[] {
  if (phase.name === 'calm') return [];
  const alongX = Math.abs(Math.cos((deg * Math.PI) / 180)) > 0.5;
  const sign = Math.cos((deg * Math.PI) / 180) + Math.sin((deg * Math.PI) / 180) > 0 ? 1 : -1;
  const span = alongX ? rect.w : rect.h;
  const across = alongX ? rect.h : rect.w;
  const drift = phase.name === 'warn' ? phase.progress * ARROW_GAP : ARROW_GAP + (phase.t / 1000) * FLUSH.speed;
  const alpha = phase.name === 'warn' ? 0.25 + 0.6 * phase.progress : Math.min(0.85, (FLUSH.pushMs - phase.t) / FLUSH.rampMs);
  const arrows: FlushArrow[] = [];
  const lines = Math.max(1, Math.floor(across / TILE));
  for (let line = 0; line < lines; line++) {
    const lateral = (line + 0.5) * (across / lines);
    for (let i = 0; i < Math.floor(span / ARROW_GAP); i++) {
      const along = (i * ARROW_GAP + drift) % span;
      const at = sign > 0 ? along : span - along;
      arrows.push({ x: alongX ? rect.x + at : rect.x + lateral, y: alongX ? rect.y + lateral : rect.y + at, angle: deg, alpha });
    }
  }
  return arrows;
}
