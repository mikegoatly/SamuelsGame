import { describe, expect, it } from 'vitest';
import { isSaneView } from '../src/logic/cameraGuard';

describe('isSaneView', () => {
  it.each([
    [{ scrollX: 0, scrollY: 0, zoom: 3 }, true],
    [{ scrollX: -20, scrollY: 400, zoom: 1 }, true],
    [{ scrollX: NaN, scrollY: 0, zoom: 3 }, false],
    [{ scrollX: 0, scrollY: Infinity, zoom: 3 }, false],
    [{ scrollX: 0, scrollY: 0, zoom: NaN }, false],
    [{ scrollX: 0, scrollY: 0, zoom: 0 }, false],
  ])('%j -> %s', (view, ok) => expect(isSaneView(view)).toBe(ok));
});
