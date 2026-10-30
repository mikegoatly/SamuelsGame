import type { Point, Rect } from './geometry';

export const NAB_HITS_TO_GATE = 3;
/** Hits closer together than this are one hit (a pierce, a cone, an aura or orbit ticking), so the chase always takes a few seconds. */
export const NAB_HIT_GAP_MS = 700;
/** Left alone this long (no hit), he slips away with his loot. */
export const NAB_LINGER_MS = 20000;
/** Walking speed, px/s, and how much faster each hit makes him. */
export const NAB_SPEED = { base: 62, perHit: 18 } as const;
/** How long the gate stays open. */
export const GATE_OPEN_MS = 8000;
/** The countdown ring around the gate, px. */
export const GATE_RING = { max: 72, min: 14 } as const;

export interface NabChase {
  hits: number;
  lastHitAt: number;
  /** When he arrived or was last hit. */
  since: number;
}

export type NabHit = 'ignored' | 'gem' | 'gate';

export const newNabChase = (now: number): NabChase => ({ hits: 0, lastHitAt: -Infinity, since: now });

/** A hit on Nab: a gem every time, and the third opens the gate. */
export function hitNab(chase: NabChase, now: number): { chase: NabChase; result: NabHit } {
  if (chase.hits >= NAB_HITS_TO_GATE || now - chase.lastHitAt < NAB_HIT_GAP_MS) return { chase, result: 'ignored' };
  const hits = chase.hits + 1;
  return { chase: { hits, lastHitAt: now, since: now }, result: hits >= NAB_HITS_TO_GATE ? 'gate' : 'gem' };
}

export const nabSpeed = (hits: number): number => NAB_SPEED.base + NAB_SPEED.perHit * hits;

export const nabGivesUp = (chase: NabChase, now: number): boolean => chase.hits < NAB_HITS_TO_GATE && now - chase.since >= NAB_LINGER_MS;

/** 1 when the gate has just opened, 0 when it closes. */
export const gateLeft = (openedAt: number, now: number): number => Math.min(1, Math.max(0, 1 - (now - openedAt) / GATE_OPEN_MS));

export const gateRingRadius = (left: number): number => GATE_RING.min + (GATE_RING.max - GATE_RING.min) * left;

export function nearestCoin(from: Point, coins: readonly Point[]): Point | undefined {
  let best: Point | undefined;
  let bestDistance = Infinity;
  for (const coin of coins) {
    const distance = Math.hypot(coin.x - from.x, coin.y - from.y);
    if (distance < bestDistance) {
      best = coin;
      bestDistance = distance;
    }
  }
  return best;
}

export interface View {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where an off-screen pointer sits (on the view edge, `inset` in) and which way it points; undefined while the target is in view. */
export function edgeArrow(view: View, target: Point, inset: number): { x: number; y: number; angle: number } | undefined {
  const inside = target.x >= view.x && target.x <= view.x + view.width && target.y >= view.y && target.y <= view.y + view.height;
  if (inside) return undefined;
  const cx = view.x + view.width / 2;
  const cy = view.y + view.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  const halfW = view.width / 2 - inset;
  const halfH = view.height / 2 - inset;
  const scale = Math.min(dx !== 0 ? halfW / Math.abs(dx) : Infinity, dy !== 0 ? halfH / Math.abs(dy) : Infinity);
  return { x: cx + dx * scale, y: cy + dy * scale, angle: Math.atan2(dy, dx) };
}

/**
 * A unit heading for Nab that keeps him in his room: the wanted direction is pulled towards the room centre the nearer a wall is
 * (so he curls round a corner instead of pinning in it), and never points out through a wall or door once he is within `margin` of it.
 */
export function steerInRoom(pos: Point, dir: Point, room: Rect, margin: number): Point {
  const halfW = room.w / 2;
  const halfH = room.h / 2;
  const offX = (pos.x - (room.x + halfW)) / halfW;
  const offY = (pos.y - (room.y + halfH)) / halfH;
  let x = dir.x - offX ** 3 * 1.5;
  let y = dir.y - offY ** 3 * 1.5;
  if ((pos.x <= room.x + margin && x < 0) || (pos.x >= room.x + room.w - margin && x > 0)) x = 0;
  if ((pos.y <= room.y + margin && y < 0) || (pos.y >= room.y + room.h - margin && y > 0)) y = 0;
  const length = Math.hypot(x, y);
  return length < 0.2 ? { x: -offX, y: -offY } : { x: x / length, y: y / length };
}
