export const CORRUPT_HOLD_MS = 200;
const GLYPHS = '#%&@?*+=/<>~';

/** The same text with a few letters swapped for noise (same length, spaces kept, so it never jumps around). */
export function corruptText(text: string, rng: () => number, letters = 2): string {
  const slots = [...text].flatMap((ch, i) => (/[A-Za-z0-9]/.test(ch) ? [i] : []));
  const chars = [...text];
  const count = Math.min(letters, slots.length, Math.max(1, Math.floor(slots.length / 3)));
  for (let n = 0; n < count; n++) {
    const at = slots.splice(Math.floor(rng() * slots.length), 1)[0]!;
    chars[at] = GLYPHS[Math.floor(rng() * GLYPHS.length)]!;
  }
  return chars.join('');
}

/** Rare, brief corruption: starts about once per `meanGapMs`, lasts ~0.2s. Pure timing on GameClock ms. */
export class TextGag {
  private next: number | undefined;
  private until = -1;

  constructor(
    private readonly rng: () => number,
    private readonly meanGapMs = 9000,
  ) {}

  on(now: number): boolean {
    this.next ??= now + this.meanGapMs * (0.5 + this.rng());
    if (now >= this.next) {
      this.until = now + CORRUPT_HOLD_MS;
      this.next = this.until + this.meanGapMs * (0.5 + this.rng());
    }
    return now < this.until;
  }
}
