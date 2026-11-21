import { describe, expect, it } from 'vitest';
import { isCleanDepth } from '../src/logic/glitchClean';

describe('isCleanDepth', () => {
  it.each([
    [0.5, false],
    [3, false],
    [5, false],
    [6, false],
    [7, false],
    [8, true],
    [9, true],
    [10, true],
    [12, true],
    [13, true],
    [25, false],
    [50, false],
  ])('depth %s -> %s', (depth, expected) => expect(isCleanDepth(depth)).toBe(expected));
});

describe('what the glitch leaves alone', () => {
  it.each([
    ['hero and its wand/hat (10-12)', 10, true],
    ['player slash and melee fx (8-12)', 8, true],
    ['fireball (9)', 9, true],
    ['spirit wolf ally (6, by class)', 6, false],
    ['enemy sprite (5)', 5, false],
    ['enemy hit and death particles (7)', 7, false],
    ['floor patches and monster ghosts (1-4)', 4, false],
    ['float text and HUD-like layers (25+)', 25, false],
  ])('%s by depth -> clean %s', (_, depth, clean) => expect(isCleanDepth(depth)).toBe(clean));
});
