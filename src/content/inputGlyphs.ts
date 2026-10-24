import type { InputDevice } from '../logic/device';

/** Frames of the Kenney Input Prompts Pixel 16x tilemap (34 columns of 16px tiles, no gaps): frame = row * 34 + column. */
export const PROMPT_COLUMNS = 34;
export const PROMPT_SIZE = 16;

const at = (row: number, column: number): number => row * PROMPT_COLUMNS + column;

export const Prompt = {
  mouseLeft: at(2, 9),
  mouseRight: at(2, 10),
  key1: at(1, 17),
  key2: at(1, 18),
  key3: at(1, 19),
  keyE: at(2, 19),
  keyR: at(2, 20),
  padLT: at(16, 7),
  padRT: at(16, 8),
  padLB: at(16, 9),
  padRB: at(16, 10),
  tap: at(17, 0),
} as const;

const SKILL_GLYPHS: Record<InputDevice, readonly [number, number, number]> = {
  keyboard: [Prompt.mouseRight, Prompt.keyE, Prompt.keyR],
  gamepad: [Prompt.padLT, Prompt.padRB, Prompt.padLB],
  touch: [Prompt.tap, Prompt.tap, Prompt.tap],
};

/** Glyph telling the player how to cast skill `slot` (0..2) on `device`. */
export const skillGlyph = (device: InputDevice, slot: number): number => SKILL_GLYPHS[device][slot] ?? Prompt.tap;
