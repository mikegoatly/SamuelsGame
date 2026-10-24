import type { Point } from './geometry';
import { corridorClear } from './lineOfSight';
import { findPath } from './pathfinding';

const REPATH_MS = 350;
const DEFER_MS = 40;
const UNREACHABLE_MS = 1000;
const STUCK_MS = 1000;
const STUCK_PROGRESS = 0.3;
const MOVING_SPEED = 1;
const SLIDE_MS = 700;
const SLIDE_PROBE = 40;
const SLIDE_FORWARD = 0.35;
const IDLE_GAP_MS = 300;

/** Shared by every navigator in a scene: caps A* runs per frame (keyed by the game clock) and counts the work done. */
export class PathBudget {
  searches = 0;
  expanded = 0;
  private frameAt = -1;
  private used = 0;

  constructor(private readonly perFrame = 3) {}

  take(now: number): boolean {
    if (now !== this.frameAt) {
      this.frameAt = now;
      this.used = 0;
    }
    if (this.used >= this.perFrame) return false;
    this.used++;
    return true;
  }
}

/**
 * Chase steering for one body: heads straight for the goal while a body-wide corridor is clear, otherwise follows an A* path.
 * Searches are throttled (own period, shared per-frame budget, reuse while the goal barely moves, unreachable goals remembered).
 * If the body barely moves for a second it slides sideways along the obstacle and repaths. `now` must be the pausable game clock.
 */
export class Navigator {
  private path: Point[] = [];
  private goalAt: Point | null = null;
  private nextCheck = 0;
  private anchor: Point | null = null;
  private anchorAt = 0;
  private lastCall = 0;
  private slide: { dir: Point; until: number } | null = null;
  private readonly periodMs: number;

  constructor(
    private readonly blocked: (x: number, y: number) => boolean,
    private readonly tileSize: number,
    private readonly rng: () => number = Math.random,
    private readonly budget: PathBudget = new PathBudget(),
  ) {
    this.periodMs = REPATH_MS * (0.8 + 0.4 * rng());
  }

  sliding(now: number): boolean {
    return this.slide !== null && now < this.slide.until;
  }

  /** The point to walk toward this frame; `speed` is the effective speed now (0 while winding up or knocked back). */
  aim(now: number, from: Point, to: Point, radius: number, speed: number): Point {
    if (now - this.lastCall > IDLE_GAP_MS) this.forget();
    if (this.slide && now < this.slide.until) {
      this.lastCall = now;
      return this.slideTarget(from);
    }
    this.slide = null;
    this.watchProgress(now, from, to, radius, speed);
    if (this.slide) return this.slideTarget(from);
    if (now >= this.nextCheck) this.refresh(now, from, to, radius);
    while (this.path.length > 1 && Math.hypot(this.path[0]!.x - from.x, this.path[0]!.y - from.y) < this.tileSize / 2) this.path.shift();
    return this.path.length > 1 ? this.path[0]! : to;
  }

  private forget(): void {
    this.path = [];
    this.goalAt = null;
    this.nextCheck = 0;
    this.anchor = null;
    this.slide = null;
  }

  private refresh(now: number, from: Point, to: Point, radius: number): void {
    this.nextCheck = now + this.periodMs;
    if (corridorClear(from, to, radius, this.blocked)) {
      this.path = [{ ...to }];
      this.goalAt = { ...to };
      return;
    }
    const goalMoved = this.goalAt ? Math.hypot(to.x - this.goalAt.x, to.y - this.goalAt.y) : Infinity;
    if (this.path.length > 1 && goalMoved < this.tileSize) return;
    if (!this.budget.take(now)) {
      this.nextCheck = now + DEFER_MS;
      return;
    }
    this.path = findPath(from, to, { blocked: this.blocked, tileSize: this.tileSize, radius, stats: this.budget }) ?? [];
    this.goalAt = { ...to };
    if (this.path.length === 0) this.nextCheck = now + UNREACHABLE_MS;
  }

  private slideTarget(from: Point): Point {
    const { dir } = this.slide!;
    return { x: from.x + dir.x * SLIDE_PROBE, y: from.y + dir.y * SLIDE_PROBE };
  }

  private watchProgress(now: number, from: Point, to: Point, radius: number, speed: number): void {
    this.lastCall = now;
    if (!this.anchor || speed < MOVING_SPEED) {
      this.reanchor(now, from);
      return;
    }
    if (now - this.anchorAt < STUCK_MS) return;
    const moved = Math.hypot(from.x - this.anchor.x, from.y - this.anchor.y);
    const arrived = Math.hypot(to.x - from.x, to.y - from.y) < radius * 2 + this.tileSize;
    this.reanchor(now, from);
    if (arrived || moved >= (speed * STUCK_MS * STUCK_PROGRESS) / 1000) return;
    this.slide = { dir: this.slideDirection(from, to, radius), until: now + SLIDE_MS };
    this.nextCheck = 0;
    this.path = [];
  }

  private reanchor(now: number, from: Point): void {
    this.anchor = { ...from };
    this.anchorAt = now;
  }

  /** Perpendicular to the way we wanted to go (with a nudge forward), on whichever side has more room. */
  private slideDirection(from: Point, to: Point, radius: number): Point {
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const fx = (to.x - from.x) / length;
    const fy = (to.y - from.y) / length;
    const side = (sign: number): Point => ({ x: -fy * sign + fx * SLIDE_FORWARD, y: fx * sign + fy * SLIDE_FORWARD });
    const free = (sign: number): boolean => {
      const d = side(sign);
      return corridorClear(from, { x: from.x + d.x * SLIDE_PROBE, y: from.y + d.y * SLIDE_PROBE }, radius, this.blocked);
    };
    const left = free(1);
    const right = free(-1);
    return side(left === right ? (this.rng() < 0.5 ? 1 : -1) : left ? 1 : -1);
  }
}
