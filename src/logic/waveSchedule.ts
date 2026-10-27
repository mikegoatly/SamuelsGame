import { insetRect, type Point, type Rect } from './geometry';
import { pickRectSpawn } from './spawnPoints';
import type { LevelCurve, WaveSpawn } from './waveMix';

/** How a room's monsters arrive over time. See docs/PROPOSAL-timed-waves.md. */
export interface WaveTiming {
  /** Gap between groups released within one wave. */
  trickleMs: number;
  /** Countdown to the next wave once the previous one has finished trickling in: `first` in room 1, minus `perRoom` per room, never below `min`. */
  waveGapMs: { first: number; perRoom: number; min: number };
  /** Start the next wave early once this many (or fewer) clear-counting monsters are alive. */
  earlyAt: number;
  /** Max clear-counting monsters alive; at or above it the trickle and every timer pause. */
  cap: { base: number; perRoom: number; max: number };
  /** Share of a wave's groups that arrive behind the player (never the featured monster). */
  behindShare: number;
  /** After the last wave is out, a single straggler arrives every this many ms until the room clears. */
  overtimeMs: number;
}

/** A planned arrival with its spawn role resolved; `behind` means opposite the player's facing. */
export type ScheduledSpawn = Omit<WaveSpawn, 'role'> & { role: WaveSpawn['role'] | 'behind' };

export type ScheduleEvent = { kind: 'wave'; wave: number } | { kind: 'spawn'; spawn: ScheduledSpawn };

export interface SchedulerOptions {
  /** Room number (arena: always 1; the cap and gaps come from `wave` instead via `arena: true`). */
  order: number;
  /** Planned waves in the room; `Infinity` for the arena. */
  totalWaves: number;
  timing: WaveTiming;
  /** Plans one wave (wraps `planWave`). */
  plan: (wave: number) => WaveSpawn[];
  /** Plans one overtime straggler. */
  straggler: () => WaveSpawn;
  rng: () => number;
  /** Arena: cap and wave gap scale with the wave number rather than the room. */
  arena?: boolean;
  /** Clear-counting monsters a group will add once it arrives (a swarm counts for more than 1). Defaults to 1. */
  sizeOf?: (spawn: ScheduledSpawn) => number;
}

export interface TickInput {
  /** Pause-safe ms since the last tick (GameClock delta). */
  dtMs: number;
  /** Clear-counting monsters currently alive. */
  alive: number;
}

export const DEFAULT_TIMING: WaveTiming = {
  trickleMs: 600,
  waveGapMs: { first: 12000, perRoom: 1000, min: 7000 },
  earlyAt: 1,
  cap: { base: 8, perRoom: 1, max: 14 },
  behindShare: 0.33,
  overtimeMs: 5000,
};

export const timingOf = (curve: LevelCurve): WaveTiming => ({ ...DEFAULT_TIMING, ...curve.timing });

export const maxAlive = (timing: WaveTiming, order: number): number => Math.min(timing.cap.max, timing.cap.base + timing.cap.perRoom * (order - 1));

export const waveGapMs = (timing: WaveTiming, order: number): number => Math.max(timing.waveGapMs.min, timing.waveGapMs.first - timing.waveGapMs.perRoom * (order - 1));

const JITTER = 0.15;

/** Marks round(share * n) of the non-featured groups as arriving from behind. */
function withBehind(spawns: WaveSpawn[], share: number, rng: () => number): ScheduledSpawn[] {
  const eligible = spawns.map((_, i) => i).filter((i) => !spawns[i]!.featured);
  const count = Math.min(eligible.length, Math.round(share * spawns.length));
  const behind = new Set<number>();
  for (let n = 0; n < count; n++) behind.add(eligible.splice(Math.floor(rng() * eligible.length), 1)[0]!);
  return spawns.map((spawn, i) => (behind.has(i) ? { ...spawn, role: 'behind' as const } : spawn));
}

type Phase = 'idle' | 'trickle' | 'gap' | 'overtime';

/** Drives one room: call `tick` every frame; it returns what to announce and spawn this frame. */
export class WaveScheduler {
  wave = 0;
  private phase: Phase = 'idle';
  private queue: ScheduledSpawn[] = [];
  private trickleLeft = 0;
  private gapLeft = 0;
  private gapTotal = 1;
  private overtimeLeft: number;
  private straggler: ScheduledSpawn | undefined;

  constructor(private readonly options: SchedulerOptions) {
    this.overtimeLeft = options.timing.overtimeMs;
  }

  get allReleased(): boolean {
    return this.phase === 'overtime';
  }

  get nextWaveProgress(): number | undefined {
    return this.phase === 'gap' ? Math.min(1, Math.max(0, 1 - this.gapLeft / this.gapTotal)) : undefined;
  }

  tick({ dtMs, alive }: TickInput): ScheduleEvent[] {
    const { timing } = this.options;
    const events: ScheduleEvent[] = [];
    let living = alive;
    const cap = (): number => maxAlive(timing, this.scale(Math.max(1, this.wave)));
    const upcomingWave = this.phase === 'gap' || this.phase === 'idle' ? this.wave + 1 : this.wave;
    if (living >= maxAlive(timing, this.scale(upcomingWave))) return events;
    if (this.phase === 'idle') this.startWave(events);
    else if (this.phase === 'gap') {
      this.gapLeft -= dtMs;
      if (living <= timing.earlyAt || this.gapLeft <= 0) this.startWave(events);
    } else if (this.phase === 'overtime') {
      if (living > 0) this.overtimeLeft -= dtMs;
      if (this.overtimeLeft <= 0) {
        this.straggler ??= this.options.straggler();
        if (living + this.sizeOf(this.straggler) <= cap()) {
          events.push({ kind: 'spawn', spawn: this.straggler });
          this.straggler = undefined;
          this.overtimeLeft = timing.overtimeMs;
        }
      }
      return events;
    } else this.trickleLeft -= dtMs;
    if (this.phase !== 'trickle') return events;
    while (this.queue.length > 0 && this.trickleLeft <= 0) {
      const size = this.sizeOf(this.queue[0]!);
      if (living > 0 && living + size > cap()) break;
      events.push({ kind: 'spawn', spawn: this.queue.shift()! });
      living += size;
      this.trickleLeft += timing.trickleMs * (1 - JITTER + 2 * JITTER * this.options.rng());
    }
    if (this.queue.length === 0) this.finishTrickle();
    else this.trickleLeft = Math.max(0, this.trickleLeft);
    return events;
  }

  private sizeOf(spawn: ScheduledSpawn): number {
    return this.options.sizeOf?.(spawn) ?? 1;
  }

  private scale(wave: number): number {
    return this.options.arena ? wave : this.options.order;
  }

  private startWave(events: ScheduleEvent[]): void {
    this.wave++;
    this.phase = 'trickle';
    this.trickleLeft = 0;
    this.queue = withBehind(this.options.plan(this.wave), this.options.timing.behindShare, this.options.rng);
    events.push({ kind: 'wave', wave: this.wave });
  }

  private finishTrickle(): void {
    if (this.wave >= this.options.totalWaves) {
      this.phase = 'overtime';
      return;
    }
    this.phase = 'gap';
    this.gapTotal = waveGapMs(this.options.timing, this.scale(this.wave));
    this.gapLeft = this.gapTotal;
  }
}

/** Spawn point for a `behind` arrival: in the half of `rect` opposite `facing` from the player, at least `minDistance` away. */
export function pickBehindSpawn(rect: Rect, player: Point, facing: Point, rng: () => number, blocked: (x: number, y: number) => boolean, inset: number, minDistance: number): Point {
  const area = insetRect(rect, inset);
  const anyDirection = facing.x === 0 && facing.y === 0;
  for (let attempt = 0; attempt < BEHIND_ATTEMPTS; attempt++) {
    const candidate = { x: area.x + rng() * area.w, y: area.y + rng() * area.h };
    const dx = candidate.x - player.x;
    const dy = candidate.y - player.y;
    if (blocked(candidate.x, candidate.y) || Math.hypot(dx, dy) < minDistance) continue;
    if (anyDirection || dx * facing.x + dy * facing.y < 0) return candidate;
  }
  return pickRectSpawn(rect, player, minDistance, rng, blocked, inset);
}

const BEHIND_ATTEMPTS = 24;
