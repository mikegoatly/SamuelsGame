import { lineClear } from './lineOfSight';

export interface Point {
  x: number;
  y: number;
}

export const TELEPORT_DISTANCE = 48;
export const TELEGRAPH_MS = 500;
const MIN_PLAYER_GAP = 24;
const TRIES = 8;
const TELEPORT_GAP_MS = { min: 9000, max: 18000 };
const PALETTE = [0xff7ad9, 0x6af0ff, 0xb6ff6a, 0xffe45a, 0xa58cff, 0xffffff];
const SWAP_MS = 3500;
const SWAP_MS_REDUCED = 7000;
const JITTER = { everyMs: [1800, 4500], lastsMs: 130 };
const GHOST = { everyMs: [2500, 6000], lastsMs: 160 };

const between = (rng: () => number, [min, max]: readonly number[]): number => min! + rng() * (max! - min!);

/** A spot ~48px away that is not solid, has a clear straight line from `from` (no hopping through walls) and is not on top of the player, or null when none of a few tries fit. */
export function pickTeleportDest(from: Point, player: Point, rng: () => number, isClear: (x: number, y: number) => boolean): Point | null {
  const offset = rng() * Math.PI * 2;
  for (let i = 0; i < TRIES; i++) {
    const angle = offset + (i / TRIES) * Math.PI * 2;
    const dest = { x: from.x + Math.cos(angle) * TELEPORT_DISTANCE, y: from.y + Math.sin(angle) * TELEPORT_DISTANCE };
    if (Math.hypot(dest.x - player.x, dest.y - player.y) < MIN_PLAYER_GAP) continue;
    if (isClear(dest.x, dest.y) && lineClear(from, dest, (x, y) => !isClear(x, y), 4)) return dest;
  }
  return null;
}

export interface TeleportContext {
  /** False while the run is ending, locked or the player is dead. */
  allowed: boolean;
  pick: () => Point | null;
}

export type TeleportEvent = { type: 'telegraph'; dest: Point } | { type: 'teleport'; dest: Point } | { type: 'cancel' };

class Window {
  private next: number | undefined;
  private until = -1;

  constructor(
    private readonly rng: () => number,
    private readonly tuning: { everyMs: readonly number[]; lastsMs: number },
  ) {}

  on(now: number): boolean {
    this.next ??= now + between(this.rng, this.tuning.everyMs);
    if (now >= this.next) {
      this.until = now + this.tuning.lastsMs;
      this.next = this.until + between(this.rng, this.tuning.everyMs);
    }
    return now < this.until;
  }
}

/** One monster's glitch look and rare teleport, as a state machine on GameClock time. Stats and attacks are never touched. */
export class GlitchMonster {
  private nextTeleportAt: number | undefined;
  private dest: Point | null = null;
  private teleportAt = 0;
  private readonly phase: number;
  private readonly jitterWindow: Window;
  private readonly ghostWindow: Window;

  constructor(private readonly rng: () => number) {
    this.phase = Math.floor(rng() * PALETTE.length);
    this.jitterWindow = new Window(rng, JITTER);
    this.ghostWindow = new Window(rng, GHOST);
  }

  get telegraphing(): boolean {
    return this.dest !== null;
  }

  /** Where the flicker is shown while a teleport is coming. */
  get destination(): Point | null {
    return this.dest;
  }

  step(now: number, ctx: TeleportContext): TeleportEvent | null {
    if (this.dest) {
      if (!ctx.allowed) return this.cancel(now);
      if (now < this.teleportAt) return null;
      const dest = this.dest;
      this.dest = null;
      this.schedule(now);
      return { type: 'teleport', dest };
    }
    this.nextTeleportAt ??= now + between(this.rng, [TELEPORT_GAP_MS.min / 2, TELEPORT_GAP_MS.max / 2]);
    if (!ctx.allowed || now < this.nextTeleportAt) return null;
    const dest = ctx.pick();
    if (!dest) {
      this.schedule(now);
      return null;
    }
    this.dest = dest;
    this.teleportAt = now + TELEGRAPH_MS;
    return { type: 'telegraph', dest };
  }

  private cancel(now: number): TeleportEvent {
    this.dest = null;
    this.schedule(now);
    return { type: 'cancel' };
  }

  private schedule(now: number): void {
    this.nextTeleportAt = now + between(this.rng, [TELEPORT_GAP_MS.min, TELEPORT_GAP_MS.max]);
  }

  tint(now: number, reduced: boolean): number {
    const index = Math.floor(now / (reduced ? SWAP_MS_REDUCED : SWAP_MS)) + this.phase;
    return PALETTE[index % PALETTE.length]!;
  }

  /** 0 or +-2px for a moment now and then; none when flashes are reduced. */
  jitter(now: number, reduced: boolean): Point {
    if (reduced || !this.jitterWindow.on(now)) return { x: 0, y: 0 };
    const pick = (): number => (Math.floor(now / 40) % 2 === 0 ? 2 : -2);
    return { x: pick(), y: Math.floor(now / 80) % 2 === 0 ? 0 : -pick() };
  }

  /** True for a moment now and then: draw a faint copy one frame behind. */
  ghost(now: number, reduced: boolean): boolean {
    return !reduced && this.ghostWindow.on(now);
  }
}
