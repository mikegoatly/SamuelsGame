import { describe, expect, it } from 'vitest';
import { CLASH, pickLanding, type Claim } from '../src/logic/landing';

const any = (): boolean => true;
const claim = (x: number, y: number, r: number): Claim => ({ x, y, r });
const clearance = (a: Claim, b: Claim): number => Math.hypot(a.x - b.x, a.y - b.y) / (a.r + b.r);

describe('pickLanding', () => {
  it.each([
    { name: 'no claims: the wanted spot', claims: [] },
    { name: 'a far claim: the wanted spot', claims: [claim(400, 0, 34)] },
  ])('$name', ({ claims }) => {
    expect(pickLanding({ x: 0, y: 0 }, 34, claims, any)).toEqual({ x: 0, y: 0 });
  });

  it.each([
    { name: 'same size on the same spot', other: claim(0, 0, 34), r: 34 },
    { name: 'a smaller ring under a bigger one', other: claim(0, 0, 46), r: 26 },
    { name: 'a bigger ring under a smaller one', other: claim(0, 0, 26), r: 46 },
    { name: 'almost the same spot', other: claim(3, -2, 34), r: 34 },
  ])('moves off a claimed spot far enough not to stack: $name', ({ other, r }) => {
    const spot = pickLanding({ x: 0, y: 0 }, r, [other], any);
    expect(spot).not.toEqual({ x: 0, y: 0 });
    expect(clearance({ ...spot, r }, other)).toBeGreaterThanOrEqual(CLASH);
  });

  it('still lands close enough to threaten the player (within 1.3 radii)', () => {
    const spot = pickLanding({ x: 0, y: 0 }, 34, [claim(0, 0, 34)], any);
    expect(Math.hypot(spot.x, spot.y)).toBeLessThanOrEqual(34 * 1.3);
  });

  it('three pieces in a row all end up apart', () => {
    const claims: Claim[] = [];
    for (let i = 0; i < 3; i++) claims.push({ ...pickLanding({ x: 0, y: 0 }, 34, claims, any), r: 34 });
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(clearance(claims[i]!, claims[j]!), `${i}-${j}`).toBeGreaterThanOrEqual(CLASH);
  });

  it('skips spots that are not free, and picks the least overlapping candidate when none clears', () => {
    const blocked = pickLanding({ x: 0, y: 0 }, 34, [claim(0, 0, 34)], (x) => x <= 0);
    expect(blocked.x).toBeLessThanOrEqual(0);
    const crowd = [claim(0, 0, 34), claim(40, 0, 34), claim(-40, 0, 34), claim(0, 40, 34), claim(0, -40, 34), claim(30, 30, 34), claim(-30, -30, 34)];
    const spot = pickLanding({ x: 0, y: 0 }, 34, crowd, any);
    const best = Math.min(...crowd.map((c) => clearance({ ...spot, r: 34 }, c)));
    const atWanted = Math.min(...crowd.map((c) => clearance({ x: 0, y: 0, r: 34 }, c)));
    expect(best).toBeGreaterThanOrEqual(atWanted);
  });
});
