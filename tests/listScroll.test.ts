import { describe, expect, it } from 'vitest';
import { clampIntoWindow, dragOffset, isDrag } from '../src/logic/listScroll';

describe('listScroll', () => {
  it.each([
    [0, 0, false],
    [0, 7, false],
    [0, -7, false],
    [0, 8, true],
    [3, -12, true],
  ])('isDrag(dx %d, dy %d) = %s', (dx, dy, expected) => {
    expect(isDrag(dx, dy)).toBe(expected);
  });

  it.each([
    // start, dy, pitch, maxOffset, expected
    [0, 0, 28, 5, 0],
    [0, -28, 28, 5, 1],
    [0, -75, 28, 5, 3],
    [2, 28, 28, 5, 1],
    [0, 100, 28, 5, 0],
    [4, -200, 28, 5, 5],
    [0, -50, 28, 0, 0],
  ])('dragOffset(start %d, dy %d, pitch %d, max %d) = %d', (start, dy, pitch, max, expected) => {
    expect(dragOffset(start, dy, pitch, max)).toBe(expected);
  });

  it.each([
    // index, offset, visible, expected
    [0, 0, 4, 0],
    [3, 0, 4, 3],
    [0, 2, 4, 2],
    [9, 2, 4, 5],
    [4, 2, 4, 4],
  ])('clampIntoWindow(%d, offset %d, visible %d) = %d', (index, offset, visible, expected) => {
    expect(clampIntoWindow(index, offset, visible)).toBe(expected);
  });
});
