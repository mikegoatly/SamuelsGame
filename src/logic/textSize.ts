/** Kenney Pixel is drawn on a 16px grid: only whole multiples of this size render crisply. */
export const FONT_NATIVE_SIZE = 16;

export function snapFontSize(requested: number, native = FONT_NATIVE_SIZE): number {
  return Math.max(1, Math.round(requested / native)) * native;
}

export const textStroke = (size: number, native = FONT_NATIVE_SIZE): number => 2 * (size / native);
