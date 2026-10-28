import {
  bossPillars,
  CELL_H,
  CELL_W,
  colonnade,
  combatPillars,
  connect,
  mirroredPillars,
  placeRoom,
  type DungeonLayout,
  type LayoutDoor,
  type LayoutRoom,
  type Pillar,
} from '../dungeonLayout';
import type { CellPlan, LayoutPreset, RandomPlan, SidePlan } from '../layoutPresets';
import { randInt } from '../rng';
import { planRoute, type Cell, type Route } from './route';
import { shapeTiles } from './shapes';

const sameCell = (a: Cell, b: Cell): boolean => a.col === b.col && a.row === b.row;
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Free cells next to a combat room (never the start room or the boss pair), with the combat room index each hangs off. */
function sideCandidates(route: Route, plan: RandomPlan): { cell: Cell; from: number }[] {
  const used = [...route.cells, route.boss, { col: route.boss.col + 1, row: route.boss.row }];
  const out: { cell: Cell; from: number }[] = [];
  route.cells.forEach((cell, from) => {
    if (from === 0) return;
    for (const [dc, dr] of NEIGHBOURS) {
      const next = { col: cell.col + dc, row: cell.row + dr };
      const inside = next.col >= 0 && next.col < plan.gridCols && next.row >= 0 && next.row < plan.gridRows;
      if (inside && !used.some((u) => sameCell(u, next))) out.push({ cell: next, from });
    }
  });
  return out;
}

function placeSideRoom(rng: () => number, index: number, cell: Cell): LayoutRoom {
  const cx = cell.col * CELL_W + CELL_W / 2;
  const cy = cell.row * CELL_H + CELL_H / 2;
  const w = 7 + 2 * randInt(rng, 0, 1);
  const h = 5 + 2 * randInt(rng, 0, 1);
  return { index, kind: 'side', rect: { x: cx - (w - 1) / 2, y: cy - (h - 1) / 2, w, h }, cx, cy };
}

/** Rolls a shape for the room and fills it with that shape's walls plus cover drawn from the preset's budget. */
function furnish(rng: () => number, preset: LayoutPreset, random: RandomPlan, room: LayoutRoom): { blocks: Pillar[]; cover: Pillar[] } {
  const shape = random.shapes[randInt(rng, 0, random.shapes.length - 1)] ?? 'plain';
  const tiles = shapeTiles(shape, rng, room, preset.symmetric === true);
  if (tiles.cover) return { blocks: [], cover: tiles.cover };
  const avoid = new Set(tiles.blocks.map((b) => `${b.x},${b.y}`));
  const cover = preset.symmetric ? mirroredPillars(rng, room, preset.cover, avoid) : combatPillars(rng, room, preset.cover, avoid);
  return { blocks: tiles.blocks, cover };
}

/** The preset's rooms (same sizes, count, order and cover budget) laid along a random route through a bigger grid, with shaped combat rooms and an optional side room (`side` can force it and make it a sewer grate). */
export function generateRandomLayout(rng: () => number, preset: LayoutPreset, random: RandomPlan, side?: SidePlan): DungeonLayout {
  const route = planRoute(rng, random.gridCols, random.gridRows, preset.plan.length - 2);
  const plans: CellPlan[] = preset.plan.map((p, i) => {
    const cell = route.cells[i] ?? route.boss;
    return { ...p, col: cell.col, row: cell.row, span: p.kind === 'boss' ? 2 : 1 };
  });
  const rooms = plans.map((plan, index) => placeRoom(rng, plan, index, preset.symmetric));
  const links = rooms.slice(1).map((room, i) => connect(rooms[i]!, room));
  const corridors = links.map((l) => l.corridor);
  const doors: LayoutDoor[] = links.flatMap((l) => l.doors);

  let sideRoom: LayoutRoom | null = null;
  const candidates = sideCandidates(route, random);
  if (candidates.length > 0 && (rng() < random.sideChance || side?.force)) {
    const { cell, from } = candidates[randInt(rng, 0, candidates.length - 1)]!;
    sideRoom = placeSideRoom(rng, rooms.length, cell);
    const link = connect(rooms[from]!, sideRoom);
    corridors.push(link.corridor);
    doors.push(...link.doors.map((d) => ({ ...d, room: from })));
  }

  const blocks: Pillar[] = [];
  const pillars: Pillar[] = [];
  for (const room of rooms) {
    if (room.kind === 'combat') {
      const made = furnish(rng, preset, random, room);
      blocks.push(...made.blocks);
      pillars.push(...made.cover);
    } else if (room.kind === 'boss') {
      pillars.push(...(preset.symmetric ? colonnade(room) : bossPillars(room)));
    }
  }
  return { cols: random.gridCols * CELL_W, rows: random.gridRows * CELL_H, rooms, corridors, doors, pillars, blocks, sideRoom, ...(sideRoom && side?.grate ? { grate: true } : {}) };
}
