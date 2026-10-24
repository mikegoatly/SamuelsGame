
export interface TileLike {
  collides: boolean;
}

export type TileLookup = (x: number, y: number) => TileLike | null;

/** True when (x, y) is outside the map or on a tile that collides; floor tiles on a ground layer are not solid. */
export function solidAt(bounds: { width: number; height: number }, layers: readonly TileLookup[], x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= bounds.width || y >= bounds.height) return true;
  return layers.some((lookup) => lookup(x, y)?.collides === true);
}

