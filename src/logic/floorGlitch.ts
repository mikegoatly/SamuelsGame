export interface Cell {
  cx: number;
  cy: number;
}

/** The arena on the tile grid (inclusive-exclusive: cols x rows from cx0, cy0). */
export interface GridRect {
  cx0: number;
  cy0: number;
  cols: number;
  rows: number;
}

export interface Band {
  vertical: boolean;
  /** First row (or column) of the band. */
  start: number;
  cells: Cell[];
  startedAt: number;
}

export type BandPhase = 'warn' | 'out' | 'reform' | 'done';

export const FLOOR_TIMING = { everyMs: 4000, warnMs: 1200, outMs: 2500, reformMs: 300 };
export const BAND_THICKNESS = 2;
export const MAX_OUT_SHARE = 0.4;
const TRIES = 24;

const key = (c: Cell): string => `${c.cx},${c.cy}`;

export function bandPhase(band: Band, now: number, t = FLOOR_TIMING): BandPhase {
  const age = now - band.startedAt;
  if (age < t.warnMs) return 'warn';
  if (age < t.warnMs + t.outMs) return 'out';
  return age < t.warnMs + t.outMs + t.reformMs ? 'reform' : 'done';
}

/** Floor cells of a 2-thick row or column band through the arena. */
export function bandCells(arena: GridRect, vertical: boolean, start: number, isFloor: (cx: number, cy: number) => boolean): Cell[] {
  const cells: Cell[] = [];
  for (let along = 0; along < (vertical ? arena.rows : arena.cols); along++) {
    for (let w = 0; w < BAND_THICKNESS; w++) {
      const cell = vertical ? { cx: arena.cx0 + start + w, cy: arena.cy0 + along } : { cx: arena.cx0 + along, cy: arena.cy0 + start + w };
      if (isFloor(cell.cx, cell.cy)) cells.push(cell);
    }
  }
  return cells;
}

/** True when every cell in `cells` can be reached from the first one through 4-neighbours inside `cells` (an empty set is not connected). */
export function isConnected(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const all = new Set(cells.map(key));
  const seen = new Set<string>([key(cells[0]!)]);
  const stack = [cells[0]!];
  while (stack.length > 0) {
    const { cx, cy } = stack.pop()!;
    for (const n of [{ cx: cx + 1, cy }, { cx: cx - 1, cy }, { cx, cy: cy + 1 }, { cx, cy: cy - 1 }]) {
      const k = key(n);
      if (all.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push(n);
      }
    }
  }
  return seen.size === all.size;
}

/** Plans the arena floor dropping out in bands: one about every 4s, 1.2s of warning, 2.5s out, then re-forming. Every band gets its full warning (even one picked right under the player), never more than ~40% of the floor is lost at once, and the floor left standing stays in one piece. */
export class FloorGlitchPlan {
  readonly bands: Band[] = [];
  private nextAt: number | undefined;
  readonly floorCells: Cell[] = [];

  constructor(
    private readonly arena: GridRect,
    private readonly isFloor: (cx: number, cy: number) => boolean,
    private readonly rng: () => number,
    private readonly timing = FLOOR_TIMING,
  ) {
    for (let y = 0; y < arena.rows; y++) for (let x = 0; x < arena.cols; x++) if (isFloor(arena.cx0 + x, arena.cy0 + y)) this.floorCells.push({ cx: arena.cx0 + x, cy: arena.cy0 + y });
  }

  get floorCount(): number {
    return this.floorCells.length;
  }

  /** Advance to `now`; returns the band that just started, if any. */
  step(now: number): Band | null {
    for (let i = this.bands.length - 1; i >= 0; i--) if (bandPhase(this.bands[i]!, now, this.timing) === 'done') this.bands.splice(i, 1);
    this.nextAt ??= now + this.timing.everyMs;
    if (now < this.nextAt) return null;
    this.nextAt = now + this.timing.everyMs * (0.8 + this.rng() * 0.4);
    const band = this.pick(now);
    if (band) this.bands.push(band);
    return band;
  }

  /** Cells whose floor is gone right now. */
  outCells(now: number): Cell[] {
    return this.cellsIn(now, 'out');
  }

  warnCells(now: number): Cell[] {
    return this.cellsIn(now, 'warn');
  }

  private cellsIn(now: number, phase: BandPhase): Cell[] {
    return this.bands.filter((b) => bandPhase(b, now, this.timing) === phase).flatMap((b) => b.cells);
  }

  /** Bands end oldest first, so the floor must stay in one piece for every "newest bands only" combination, not just with all of them out. */
  private holds(active: readonly Cell[][]): boolean {
    for (let from = 0; from < active.length; from++) {
      const gone = new Set(active.slice(from).flat().map(key));
      if (gone.size > this.floorCells.length * MAX_OUT_SHARE) return false;
      if (!isConnected(this.floorCells.filter((c) => !gone.has(key(c))))) return false;
    }
    return true;
  }

  private pick(now: number): Band | null {
    const taken = new Set(this.bands.flatMap((b) => b.cells.map(key)));
    for (let i = 0; i < TRIES; i++) {
      const vertical = this.rng() < 0.5;
      const span = (vertical ? this.arena.cols : this.arena.rows) - BAND_THICKNESS;
      if (span < 0) continue;
      const start = Math.floor(this.rng() * (span + 1));
      const cells = bandCells(this.arena, vertical, start, this.isFloor).filter((c) => !taken.has(key(c)));
      if (cells.length === 0) continue;
      if (!this.holds([...this.bands.map((b) => b.cells), cells])) continue;
      return { vertical, start, cells, startedAt: now };
    }
    return null;
  }
}
