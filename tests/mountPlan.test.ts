import { describe, expect, it } from 'vitest';
import { chooseMount, MountBook } from '../src/logic/mountPlan';

const spot = (x: number, y: number) => ({ x, y, facing: { x: 0, y: 1 } });

describe('chooseMount', () => {
  it('takes the first candidate that is clear of every taken spot', () => {
    const picked = chooseMount([spot(0, 0), spot(100, 0), spot(200, 0)], [{ x: 4, y: 0 }], 48);
    expect(picked).toMatchObject({ x: 100 });
  });

  it('with everything crowded, takes the candidate farthest from the taken spots', () => {
    const picked = chooseMount([spot(10, 0), spot(40, 0), spot(20, 0)], [{ x: 0, y: 0 }], 48);
    expect(picked).toMatchObject({ x: 40 });
  });

  it('is undefined without candidates and takes the first when nothing is taken', () => {
    expect(chooseMount([], [], 48)).toBeUndefined();
    expect(chooseMount([spot(5, 5), spot(90, 5)], [], 48)).toMatchObject({ x: 5 });
  });
});

describe('MountBook', () => {
  it('counts pending claims and live holders as taken, and forgets spots whose holder died', () => {
    const book = new MountBook();
    const a = {};
    const b = {};
    book.claim(a, { x: 1, y: 1 });
    book.claim(b, { x: 2, y: 2 });
    expect(book.taken()).toHaveLength(2);
    book.hold(a, () => true);
    book.hold(b, () => false);
    expect(book.taken()).toEqual([{ x: 1, y: 1 }]);
  });

  it('re-claiming a key replaces its old spot, and release drops it', () => {
    const book = new MountBook();
    const a = {};
    book.claim(a, { x: 1, y: 1 });
    book.claim(a, { x: 9, y: 9 });
    expect(book.taken()).toEqual([{ x: 9, y: 9 }]);
    book.release(a);
    expect(book.taken()).toEqual([]);
  });
});
