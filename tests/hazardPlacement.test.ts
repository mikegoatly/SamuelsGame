import { describe, expect, it } from 'vitest';
import { TILE_SIZE } from '../src/content/assetKeys';
import { floorMask, type DungeonLayout } from '../src/logic/dungeonLayout';
import { rectsOverlap, type Rect } from '../src/logic/geometry';
import { hazardCount } from '../src/logic/hazard/plan';
import { type ActiveHazardKind } from '../src/logic/hazard/kinds';
import type { PlacedHazard } from '../src/logic/hazard/placement';
import { buildWorld } from '../src/logic/map/mapBuilder';
import { THEMES } from '../src/logic/map/mapThemes';

const AREA_KINDS: ActiveHazardKind[] = ['rubble', 'wind', 'sandstorm'];
const tiles = (r: Rect): [number, number][] => Array.from({ length: r.w * r.h }, (_, i) => [r.x + (i % r.w), r.y + Math.floor(i / r.w)]);
const inside = (outer: Rect, r: Rect): boolean => r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;
const roomOf = (layout: DungeonLayout, h: PlacedHazard) => layout.rooms[h.room]!;
const levelOf = (h: PlacedHazard): number => h.params.level ?? h.params.rocks ?? 1;

describe.each(THEMES.map((theme) => [theme.id, theme] as const))('hazard placement in %s', (_id, theme) => {
  const { layout, active } = buildWorld(theme);
  const combat = layout.rooms.filter((r) => r.kind === 'combat');
  const bossRoom = layout.rooms[layout.rooms.length - 1]!;

  it('is deterministic', () => {
    expect(buildWorld(theme).active).toEqual(active);
  });

  it('gives each combat room exactly the planned hazards and the start room none', () => {
    expect(active.filter((h) => h.room === 0)).toEqual([]);
    for (const room of combat) {
      for (const kind of Object.keys(theme.hazards ?? {}) as ActiveHazardKind[]) {
        const placed = active.filter((h) => h.room === room.index && h.kind === kind);
        const want = hazardCount(theme.hazards!, kind, room.index);
        if (AREA_KINDS.includes(kind)) expect(placed.map(levelOf), `${kind} in room ${room.index}`).toEqual(want > 0 ? [want] : []);
        else expect(placed.length, `${kind} in room ${room.index}`).toBe(want);
      }
    }
  });

  it('puts exactly one kind in the boss arena and nothing in the rooms past the plan', () => {
    const boss = active.filter((h) => h.room === bossRoom.index);
    if (theme.bossHazard) {
      expect(boss.length).toBeGreaterThan(0);
      expect(new Set(boss.map((h) => h.kind))).toEqual(new Set([theme.bossHazard.kind]));
    } else expect(boss).toEqual([]);
    expect(active.every((h) => h.room >= 1)).toBe(true);
  });

  it('keeps every footprint in its room, off the corridor lanes and off cover', () => {
    const cover = new Set(layout.pillars.map((p) => `${p.x},${p.y}`));
    for (const h of active) {
      const room = roomOf(layout, h);
      expect(inside(room.rect, h.rect), `${h.kind} in room ${h.room}`).toBe(true);
      if (AREA_KINDS.includes(h.kind)) continue;
      for (const block of h.blocks) {
        for (const [x, y] of tiles(block)) {
          expect(Math.abs(x - room.cx) >= 2 && Math.abs(y - room.cy) >= 2, `${h.kind} at ${x},${y} touches a lane of room ${h.room}`).toBe(true);
          expect(cover.has(`${x},${y}`), `${h.kind} on cover`).toBe(false);
        }
      }
    }
  });

  it('never stacks hazards on each other or on quicksand and spikes', () => {
    const { quicksand, spikes } = buildWorld(theme);
    const blocks = active.filter((h) => !AREA_KINDS.includes(h.kind)).flatMap((h, i) => h.blocks.map((b) => ({ b, i })));
    for (const a of blocks) {
      for (const other of [...quicksand, ...spikes]) expect(rectsOverlap(a.b, other)).toBe(false);
      for (const c of blocks) if (a.i !== c.i) expect(rectsOverlap(a.b, c.b)).toBe(false);
    }
  });

  it('keeps every room walkable with all hazard footprints treated as walls', () => {
    const blocked = new Set<string>();
    for (const p of layout.pillars) blocked.add(`${p.x},${p.y}`);
    const reach = (extra: boolean): Set<string> => {
      const floor = floorMask(layout);
      const wall = new Set(blocked);
      if (extra) for (const h of active) for (const b of h.blocks) for (const [x, y] of tiles(b)) wall.add(`${x},${y}`);
      const seen = new Set<string>();
      const stack: [number, number][] = [[layout.rooms[0]!.cx, layout.rooms[0]!.cy]];
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;
        if (!floor[y]?.[x] || wall.has(key) || seen.has(key)) continue;
        seen.add(key);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      return seen;
    };
    const before = reach(false);
    const after = reach(true);
    const hazardTiles = new Set(active.flatMap((h) => h.blocks.flatMap((b) => tiles(b).map(([x, y]) => `${x},${y}`))));
    for (const key of before) if (!hazardTiles.has(key)) expect(after.has(key), `tile ${key} is cut off`).toBe(true);
    for (const door of layout.doors) for (const [x, y] of tiles(door.rect)) expect(after.has(`${x},${y}`), `door tile ${x},${y}`).toBe(true);
  });

  it('keeps lit hazards (fire pits, gas, flame reach) at least 2 tiles from every door and corridor lane', () => {
    const doorTiles = layout.doors.flatMap((d) => tiles(d.rect));
    for (const h of active.filter((a) => ['firePit', 'gasVent', 'flameJet'].includes(a.kind))) {
      const room = roomOf(layout, h);
      for (const [x, y] of h.blocks.flatMap(tiles)) {
        expect(Math.abs(x - room.cx) >= 3 && Math.abs(y - room.cy) >= 3, h.kind + ' lane').toBe(true);
        for (const [dx, dy] of doorTiles) expect(Math.max(Math.abs(x - dx), Math.abs(y - dy)), h.kind + ' near door').toBeGreaterThanOrEqual(2);
      }
    }
    expect(active.some((a) => a.kind === 'firePit') || theme.id !== 'desert').toBe(true);
  });

  it('mounts jets and arrow emitters on a wall tile with the lanes left free', () => {
    const floor = floorMask(layout);
    for (const h of active.filter((a) => a.kind === 'flameJet')) {
      const dir = h.params.dir!;
      const nozzle = { x: h.rect.x - (dir === 0 ? 1 : 0) + (dir === 180 ? h.rect.w : 0), y: h.rect.y - (dir === 90 ? 1 : 0) + (dir === 270 ? h.rect.h : 0) };
      expect(floor[nozzle.y]![nozzle.x], `jet nozzle ${nozzle.x},${nozzle.y}`).toBe(false);
    }
    for (const h of active.filter((a) => a.kind === 'arrowWall')) {
      const room = roomOf(layout, h);
      const wallX = Math.floor(h.params.emitX! / TILE_SIZE);
      const rows = [Math.floor(h.params.stripY! / TILE_SIZE), Math.ceil((h.params.stripY! + h.params.stripH!) / TILE_SIZE) - 1];
      for (const y of rows) {
        expect(floor[y]![wallX]).toBe(false);
        expect(Math.abs(y - room.cy)).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
