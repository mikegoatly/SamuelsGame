import type { Point } from './geometry';
import { bodyClear, corridorClear } from './lineOfSight';

export interface PathOptions {
  blocked: (x: number, y: number) => boolean;
  tileSize: number;
  /** Half-size of the body; tiles it cannot fit on are treated as walls. */
  radius: number;
  /** Search window around the start/goal box, px. */
  margin?: number;
  maxNodes?: number;
  /** Optional counters, bumped by every A* run. */
  stats?: { searches: number; expanded: number };
}

const DEFAULT_MARGIN = 160;
const DEFAULT_MAX_NODES = 1600;
const DIAGONAL = Math.SQRT2;
const NEIGHBOURS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

interface Node {
  col: number;
  row: number;
  g: number;
  f: number;
  parent: Node | null;
}

/** Smoothed waypoints from `from` to `to` (excluding `from`) that a body of `radius` can follow; null only when there is nowhere to go. */
export function findPath(from: Point, to: Point, o: PathOptions): Point[] | null {
  if (corridorClear(from, to, o.radius, o.blocked)) return [{ ...to }];
  const raw = search(from, to, o);
  return raw && smooth(from, raw, o);
}

function search(from: Point, to: Point, o: PathOptions): Point[] | null {
  const { tileSize: size } = o;
  const margin = o.margin ?? DEFAULT_MARGIN;
  const colOf = (x: number): number => Math.floor(x / size);
  const rowOf = (y: number): number => Math.floor(y / size);
  const centre = (col: number, row: number): Point => ({ x: (col + 0.5) * size, y: (row + 0.5) * size });
  const start = { col: colOf(from.x), row: rowOf(from.y) };
  const goal = { col: colOf(to.x), row: rowOf(to.y) };
  const minCol = colOf(Math.min(from.x, to.x) - margin);
  const maxCol = colOf(Math.max(from.x, to.x) + margin);
  const minRow = rowOf(Math.min(from.y, to.y) - margin);
  const maxRow = rowOf(Math.max(from.y, to.y) + margin);
  const key = (col: number, row: number): number => (row - minRow) * (maxCol - minCol + 1) + (col - minCol);
  const passable = new Map<number, boolean>();
  const isPassable = (col: number, row: number): boolean => {
    if (col < minCol || col > maxCol || row < minRow || row > maxRow) return false;
    if ((col === goal.col && row === goal.row) || (col === start.col && row === start.row)) return true;
    const k = key(col, row);
    let ok = passable.get(k);
    if (ok === undefined) {
      ok = bodyClear(centre(col, row), o.radius, o.blocked);
      passable.set(k, ok);
    }
    return ok;
  };
  const heuristic = (col: number, row: number): number => {
    const dx = Math.abs(col - goal.col);
    const dy = Math.abs(row - goal.row);
    return Math.max(dx, dy) + (DIAGONAL - 1) * Math.min(dx, dy);
  };

  if (o.stats) o.stats.searches++;
  const open = new MinHeap();
  const best = new Map<number, Node>();
  const first: Node = { ...start, g: 0, f: heuristic(start.col, start.row), parent: null };
  open.push(first);
  best.set(key(start.col, start.row), first);
  const closed = new Set<number>();
  let closest = first;
  let expanded = 0;
  const maxNodes = o.maxNodes ?? DEFAULT_MAX_NODES;

  for (let node = open.pop(); node && expanded < maxNodes; node = open.pop()) {
    const nodeKey = key(node.col, node.row);
    if (closed.has(nodeKey)) continue;
    closed.add(nodeKey);
    expanded++;
    if (o.stats) o.stats.expanded++;
    if (node.col === goal.col && node.row === goal.row) return trace(node, centre, to);
    if (heuristic(node.col, node.row) < heuristic(closest.col, closest.row)) closest = node;
    for (const [dc, dr] of NEIGHBOURS) {
      const col = node.col + dc;
      const row = node.row + dr;
      if (!isPassable(col, row)) continue;
      if (dc !== 0 && dr !== 0 && !(isPassable(node.col + dc, node.row) && isPassable(node.col, node.row + dr))) continue;
      const g = node.g + (dc !== 0 && dr !== 0 ? DIAGONAL : 1);
      const k = key(col, row);
      const known = best.get(k);
      if (known && known.g <= g) continue;
      const next: Node = { col, row, g, f: g + heuristic(col, row), parent: node };
      best.set(k, next);
      open.push(next);
    }
  }
  return closest === first ? null : trace(closest, centre, null);
}

function trace(end: Node, centre: (col: number, row: number) => Point, goal: Point | null): Point[] {
  const points: Point[] = [];
  for (let node: Node | null = end; node; node = node.parent) points.push(centre(node.col, node.row));
  points.reverse();
  points.shift();
  if (goal) points.push({ ...goal });
  return points;
}

/** String pulling: from each anchor, jump to the furthest waypoint a body can walk to in a straight line. */
function smooth(from: Point, points: Point[], o: PathOptions): Point[] {
  const out: Point[] = [];
  let anchor = from;
  let index = 0;
  while (index < points.length) {
    let far = index;
    for (let i = points.length - 1; i > index; i--) {
      if (corridorClear(anchor, points[i]!, o.radius, o.blocked)) {
        far = i;
        break;
      }
    }
    anchor = points[far]!;
    out.push(anchor);
    index = far + 1;
  }
  return out;
}

class MinHeap {
  private readonly items: Node[] = [];

  push(node: Node): void {
    const a = this.items;
    a.push(node);
    for (let i = a.length - 1; i > 0; ) {
      const parent = (i - 1) >> 1;
      if (a[parent]!.f <= a[i]!.f) break;
      [a[parent], a[i]] = [a[i]!, a[parent]!];
      i = parent;
    }
  }

  pop(): Node | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (last && a.length > 0) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l]!.f < a[m]!.f) m = l;
        if (r < a.length && a[r]!.f < a[m]!.f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}
