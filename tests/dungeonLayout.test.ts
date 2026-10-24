import { describe, expect, it } from 'vitest';
import { floorMask, generateLayout, reachableRooms, type DungeonLayout } from '../src/logic/dungeonLayout';
import { rectArea, rectsOverlap } from '../src/logic/geometry';
import { DESERT_PRESET, RUINS_PRESET, type LayoutPreset } from '../src/logic/layoutPresets';
import { mulberry32 } from '../src/logic/rng';

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 1);
const layoutFor = (seed: number, preset: LayoutPreset = RUINS_PRESET): DungeonLayout => generateLayout(mulberry32(seed), preset);

describe('generateLayout', () => {
  it('is deterministic for a seed', () => {
    expect(layoutFor(42)).toEqual(layoutFor(42));
    expect(layoutFor(42)).not.toEqual(layoutFor(43));
  });

  it('has a start room, five combat rooms in order and the boss arena last', () => {
    for (const seed of SEEDS) {
      const { rooms } = layoutFor(seed);
      expect(rooms.map((r) => r.kind)).toEqual(['start', 'combat', 'combat', 'combat', 'combat', 'combat', 'boss']);
      expect(rooms.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    }
  });

  it('never overlaps rooms and keeps a gap between them', () => {
    for (const seed of SEEDS) {
      const { rooms } = layoutFor(seed);
      for (const a of rooms) {
        for (const b of rooms) {
          if (a === b) continue;
          const padded = { x: a.rect.x - 4, y: a.rect.y - 4, w: a.rect.w + 8, h: a.rect.h + 8 };
          expect(rectsOverlap(padded, b.rect), `seed ${seed}: ${a.index} vs ${b.index}`).toBe(false);
        }
      }
    }
  });

  it('makes every room reachable from the start through carved floor', () => {
    for (const seed of SEEDS) {
      const layout = layoutFor(seed);
      expect([...reachableRooms(layout)].sort()).toEqual(layout.rooms.map((r) => r.index));
    }
  });

  it('makes the boss arena the largest room', () => {
    for (const seed of SEEDS) {
      const { rooms } = layoutFor(seed);
      const boss = rooms[rooms.length - 1]!;
      for (const room of rooms.slice(0, -1)) expect(rectArea(boss.rect)).toBeGreaterThan(rectArea(room.rect));
    }
  });

  it('places a door on each side of every corridor, on floor and outside the rooms', () => {
    const layout = layoutFor(5);
    const floor = floorMask(layout);
    expect(layout.corridors).toHaveLength(layout.rooms.length - 1);
    expect(layout.doors).toHaveLength(layout.corridors.length * 2);
    for (const door of layout.doors) {
      for (let y = door.rect.y; y < door.rect.y + door.rect.h; y++) {
        for (let x = door.rect.x; x < door.rect.x + door.rect.w; x++) expect(floor[y]![x]).toBe(true);
      }
      expect(rectsOverlap(door.rect, layout.rooms[door.room]!.rect)).toBe(false);
    }
  });

  it('keeps pillars clear of the corridor lines and never blocks connectivity', () => {
    for (const seed of SEEDS) {
      const layout = layoutFor(seed);
      for (const pillar of layout.pillars) {
        const room = layout.rooms[pillar.room]!;
        expect(Math.abs(pillar.x - room.cx) > 2 && Math.abs(pillar.y - room.cy) > 2).toBe(true);
      }
      expect(reachableRooms(layout, true).size).toBe(layout.rooms.length);
    }
  });
});

describe('desert preset', () => {
  it('has a start room, six combat rooms and the boss arena last', () => {
    for (const seed of SEEDS) {
      const { rooms } = layoutFor(seed, DESERT_PRESET);
      expect(rooms.map((r) => r.kind)).toEqual(['start', 'combat', 'combat', 'combat', 'combat', 'combat', 'combat', 'boss']);
    }
  });

  it('keeps rooms apart, reachable and the boss arena the largest, even with cover', () => {
    for (const seed of SEEDS) {
      const layout = layoutFor(seed, DESERT_PRESET);
      expect(reachableRooms(layout, true).size).toBe(layout.rooms.length);
      const boss = layout.rooms[layout.rooms.length - 1]!;
      for (const a of layout.rooms) {
        if (a !== boss) expect(rectArea(boss.rect)).toBeGreaterThan(rectArea(a.rect));
        for (const b of layout.rooms) {
          if (a === b) continue;
          const padded = { x: a.rect.x - 4, y: a.rect.y - 4, w: a.rect.w + 8, h: a.rect.h + 8 };
          expect(rectsOverlap(padded, b.rect), `seed ${seed}: ${a.index} vs ${b.index}`).toBe(false);
        }
      }
    }
  });

  it('is more open than the ruins: larger combat rooms, less cover per area', () => {
    const combat = (preset: LayoutPreset) => SEEDS.flatMap((seed) => layoutFor(seed, preset).rooms.filter((r) => r.kind === 'combat'));
    const average = (preset: LayoutPreset): number => {
      const rooms = combat(preset);
      return rooms.reduce((sum, r) => sum + rectArea(r.rect), 0) / rooms.length;
    };
    const density = (preset: LayoutPreset): number => {
      const cover = SEEDS.reduce((sum, seed) => {
        const layout = layoutFor(seed, preset);
        return sum + layout.pillars.filter((p) => layout.rooms[p.room]!.kind === 'combat').length;
      }, 0);
      return cover / combat(preset).reduce((sum, r) => sum + rectArea(r.rect), 0);
    };
    expect(average(DESERT_PRESET)).toBeGreaterThan(average(RUINS_PRESET));
    expect(density(DESERT_PRESET)).toBeLessThan(density(RUINS_PRESET));
  });
});
