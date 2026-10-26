import { insideInset, type LayoutRoom, type Pillar } from '../dungeonLayout';
import type { RoomShape } from '../layoutPresets';
import { randInt } from '../rng';

/** Interior walls (`blocks`) and/or a fixed cover pattern (`cover`) that give a combat room its character. */
export interface ShapeTiles {
  blocks: Pillar[];
  cover: Pillar[] | null;
}

const PLAIN: ShapeTiles = { blocks: [], cover: null };
/** The corridor cross is |dx| <= 1 or |dy| <= 1; shapes keep a further tile clear of it. */
const BAND = 2;

const tile = (room: LayoutRoom, x: number, y: number): Pillar => ({ room: room.index, x, y });
const pick = <T>(rng: () => number, items: readonly T[]): T => items[randInt(rng, 0, items.length - 1)]!;

/** A wall block filling one corner of the room, stopping short of the corridor cross. */
function ell(rng: () => number, room: LayoutRoom): ShapeTiles | null {
  const { rect } = room;
  const sx = rng() < 0.5 ? -1 : 1;
  const sy = rng() < 0.5 ? -1 : 1;
  const availW = sx < 0 ? room.cx - BAND - rect.x : rect.x + rect.w - (room.cx + BAND + 1);
  const availH = sy < 0 ? room.cy - BAND - rect.y : rect.y + rect.h - (room.cy + BAND + 1);
  if (availW < 4 || availH < 4) return null;
  const bw = randInt(rng, 3, availW - 1);
  const bh = randInt(rng, 3, availH - 1);
  const blocks: Pillar[] = [];
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) blocks.push(tile(room, sx < 0 ? rect.x + i : rect.x + rect.w - 1 - i, sy < 0 ? rect.y + j : rect.y + rect.h - 1 - j));
  }
  return { blocks, cover: null };
}

/** Mirrored 1x1 (small rooms) or 2x2 pillars at fixed offsets from the room centre. */
function pillared(room: LayoutRoom): ShapeTiles | null {
  const { rect } = room;
  const size = rect.w >= 15 && rect.h >= 11 ? 2 : 1;
  const cover = new Map<string, Pillar>();
  for (const [dx, dy] of [[4, 4], [8, 4], [4, 8], [8, 8]] as const) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cells = Array.from({ length: size * size }, (_, k) => ({ x: room.cx + sx * (dx + (k % size)), y: room.cy + sy * (dy + Math.floor(k / size)) }));
        if (!cells.every((c) => insideInset(rect, c.x, c.y, 2))) continue;
        for (const c of cells) cover.set(`${c.x},${c.y}`, tile(room, c.x, c.y));
      }
    }
  }
  return cover.size >= 4 ? { blocks: [], cover: [...cover.values()] } : null;
}

/** Wall bars standing off both walls (top and bottom, or left and right) up to the corridor cross, leaving a wide gap in the middle. */
function split(rng: () => number, room: LayoutRoom, symmetric: boolean): ShapeTiles | null {
  const { rect } = room;
  const vertical = rng() < 0.5;
  for (const upright of [vertical, !vertical]) {
    const [centre, lo, hi, cross, crossLo, crossHi] = upright
      ? [room.cx, rect.x, rect.x + rect.w - 1, room.cy, rect.y, rect.y + rect.h - 1]
      : [room.cy, rect.y, rect.y + rect.h - 1, room.cx, rect.x, rect.x + rect.w - 1];
    const headA = cross - BAND - crossLo;
    const headB = crossHi - (cross + BAND);
    if (headA < 2 || headB < 2) continue;
    const offsets = [4, 5, 6, 7].filter((d) => centre - d >= lo + 1 && centre + d <= hi - 1);
    if (offsets.length === 0) continue;
    const d = pick(rng, offsets);
    const sides = symmetric || rng() < 0.5 ? [-1, 1] : [rng() < 0.5 ? -1 : 1];
    const blocks: Pillar[] = [];
    for (const s of sides) {
      const at = centre + s * d;
      const lines = [...Array.from({ length: headA }, (_, k) => crossLo + k), ...Array.from({ length: headB }, (_, k) => crossHi - k)];
      for (const along of lines) blocks.push(upright ? tile(room, at, along) : tile(room, along, at));
    }
    return { blocks, cover: null };
  }
  return null;
}

/** Shape tiles for a combat room, falling back to plain when the room is too small for the shape. */
export function shapeTiles(shape: RoomShape, rng: () => number, room: LayoutRoom, symmetric: boolean): ShapeTiles {
  const made = shape === 'ell' && !symmetric ? ell(rng, room) : shape === 'pillared' ? pillared(room) : shape === 'split' ? split(rng, room, symmetric) : null;
  return made ?? PLAIN;
}
