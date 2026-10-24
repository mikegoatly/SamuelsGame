export type Direction = 'up' | 'down' | 'left' | 'right';

/** Next focused index in a grid of `count` items laid out row-major with `columns` columns. */
export function moveFocus(index: number, count: number, direction: Direction, columns = 1): number {
  if (count <= 0) return 0;
  const lastRow = Math.floor((count - 1) / columns);
  const row = Math.floor(index / columns);
  switch (direction) {
    case 'left':
      return index % columns === 0 ? index : index - 1;
    case 'right':
      return index % columns === columns - 1 || index + 1 >= count ? index : index + 1;
    case 'up':
      return row === 0 ? index : index - columns;
    case 'down':
      if (row >= lastRow) return index;
      return Math.min(index + columns, count - 1);
  }
}

export function stickDirection(x: number, y: number, threshold = 0.6): Direction | null {
  if (Math.max(Math.abs(x), Math.abs(y)) < threshold) return null;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 'right' : 'left';
  return y > 0 ? 'down' : 'up';
}
