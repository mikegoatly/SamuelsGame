import type { Point } from './geometry';
import { distanceToSegment } from './hazard/pendulum';

/** Hookjaw Spider: a dotted aim line that locks shortly before it fires, then a silk tether that reels the player in for a bite. */
export interface SpiderTuning {
  aimRange: number;
  aimMs: number;
  /** The aim stops following the player this long before the shot, so stepping aside dodges it. */
  lockBeforeFireMs: number;
  pullMs: number;
  /** After a shot (hit or miss) the spider waits this long before it aims again. */
  cooldownMs: number;
  /** Silk reach and half-width of the line that counts as a hit. */
  hookRange: number;
  hookWidth: number;
  /** The bite lands once the player is this close. */
  biteRange: number;
  maxPullSpeed: number;
}

export const SPIDER: SpiderTuning = { aimRange: 150, aimMs: 800, lockBeforeFireMs: 300, pullMs: 600, cooldownMs: 4000, hookRange: 180, hookWidth: 5, biteRange: 14, maxPullSpeed: 320 };

export type SpiderPhase = 'idle' | 'aim' | 'pull';

export interface SpiderState {
  phase: SpiderPhase;
  since: number;
  /** Idle spiders may start aiming from this time on. */
  nextAimAt: number;
}

export const newSpider = (now: number, firstAimDelayMs = 1500): SpiderState => ({ phase: 'idle', since: now, nextAimAt: now + firstAimDelayMs });

export interface SpiderInput {
  /** Distance to the player; Infinity when the player is out of sight or untargetable. */
  distance: number;
  /** False while another spider's tether holds the player, so nobody is passed along. */
  playerFree: boolean;
}

export type SpiderEvent = 'aim' | 'lock' | 'fire' | 'bite';

export const aimLocked = (state: SpiderState, now: number, t: SpiderTuning = SPIDER): boolean => state.phase === 'aim' && now - state.since >= t.aimMs - t.lockBeforeFireMs;

export const aimProgress = (state: SpiderState, now: number, t: SpiderTuning = SPIDER): number => (state.phase === 'aim' ? Math.min(1, (now - state.since) / t.aimMs) : 0);

/**
 * Idle -> aim (0.8s) -> fire. A fire goes back to idle with the cooldown; when it caught the player the caller reports it with `hook`, which starts the pull.
 * `lock` is reported once, when the aim stops following the player (`wasLocked` says it already was).
 */
export function stepSpider(state: SpiderState, now: number, input: SpiderInput, t: SpiderTuning = SPIDER, wasLocked = false): { state: SpiderState; event: SpiderEvent | null } {
  if (state.phase === 'idle') {
    if (now < state.nextAimAt || !input.playerFree || input.distance > t.aimRange) return { state, event: null };
    return { state: { phase: 'aim', since: now, nextAimAt: state.nextAimAt }, event: 'aim' };
  }
  if (state.phase === 'aim') {
    if (now - state.since >= t.aimMs) return { state: { phase: 'idle', since: now, nextAimAt: now + t.cooldownMs }, event: 'fire' };
    return { state, event: aimLocked(state, now, t) && !wasLocked ? 'lock' : null };
  }
  if (now - state.since >= t.pullMs) return { state: { phase: 'idle', since: now, nextAimAt: now + t.cooldownMs }, event: 'bite' };
  return { state, event: null };
}

/** An aim or wind-up whose owner has not acted for this long (stunned, knocked back, frozen) is stale and must be dropped. */
export const STALE_ACT_MS = 150;
export const actStale = (now: number, lastActAt: number, limit = STALE_ACT_MS): boolean => now - lastActAt >= limit;

/** Re-aim delay after an aim that was aborted (lost sight, stale, stunned) instead of fired. */
export const REAIM_DELAY_MS = 600;

/** Drops an aim back to idle without firing; the next aim waits `REAIM_DELAY_MS`. */
export const abortAim = (state: SpiderState, now: number): SpiderState =>
  state.phase === 'aim' ? { phase: 'idle', since: now, nextAimAt: Math.max(state.nextAimAt, now + REAIM_DELAY_MS) } : state;

/** The shot connected: the pull starts now. */
export const hook = (state: SpiderState, now: number): SpiderState => ({ phase: 'pull', since: now, nextAimAt: state.nextAimAt });

/** Dash, a hit on the spider, a stun, the end of the run: the tether snaps and the cooldown starts. */
export const breakTether = (state: SpiderState, now: number, t: SpiderTuning = SPIDER): SpiderState =>
  state.phase === 'pull' ? { phase: 'idle', since: now, nextAimAt: now + t.cooldownMs } : state;

/** Does the locked line from `origin` at `angle` catch a player circle? */
export function lineCatches(origin: Point, angle: number, victim: Point, victimRadius: number, t: SpiderTuning = SPIDER): boolean {
  const end = { x: origin.x + Math.cos(angle) * t.hookRange, y: origin.y + Math.sin(angle) * t.hookRange };
  return distanceToSegment(victim, origin, end) <= t.hookWidth + victimRadius;
}

/** Speed that brings the player to the spider as the pull ends: distance over the time left, capped, zero once close enough to bite. */
export function pullSpeed(distance: number, remainingMs: number, t: SpiderTuning = SPIDER): number {
  if (distance <= t.biteRange) return 0;
  return Math.min(t.maxPullSpeed, (distance - t.biteRange) / (Math.max(remainingMs, 80) / 1000));
}

/** Who holds the player in silk: only one spider at a time. */
export class TetherLock {
  private holder: unknown = null;

  get held(): boolean {
    return this.holder !== null;
  }

  heldBy(owner: unknown): boolean {
    return this.holder === owner;
  }

  claim(owner: unknown): boolean {
    if (this.holder !== null && this.holder !== owner) return false;
    this.holder = owner;
    return true;
  }

  release(owner: unknown): void {
    if (this.holder === owner) this.holder = null;
  }
}
