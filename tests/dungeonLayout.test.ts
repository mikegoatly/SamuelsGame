import { describe, expect, it } from 'vitest';
import { floorMask, generateLayout, reachableRooms, type DungeonLayout } from '../src/logic/dungeonLayout';
import { rectArea, rectsOverlap } from '../src/logic/geometry';
import { mulberry32 } from '../src/logic/rng';

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 1);
const layoutFor = (seed: number): DungeonLayout => generateLayout(mulberry32(seed));

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
