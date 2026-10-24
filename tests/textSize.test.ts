import { describe, expect, it } from 'vitest';
import { FONT_NATIVE_SIZE, snapFontSize, textStroke } from '../src/logic/textSize';

describe('snapFontSize', () => {
  it('uses the font native size as the minimum', () => {
    expect(snapFontSize(8)).toBe(FONT_NATIVE_SIZE);
    expect(snapFontSize(12)).toBe(FONT_NATIVE_SIZE);
  });

  it('rounds to whole multiples of the native size', () => {
    expect(snapFontSize(16)).toBe(16);
    expect(snapFontSize(20)).toBe(16);
    expect(snapFontSize(26)).toBe(32);
    expect(snapFontSize(52)).toBe(48);
  });

  it('supports a smaller native size for zoomed cameras', () => {
    expect(snapFontSize(10, 8)).toBe(8);
    expect(snapFontSize(14, 8)).toBe(16);
    expect(snapFontSize(3, 8)).toBe(8);
  });
});

describe('textStroke', () => {
  it('scales in whole pixels with the font step', () => {
    expect(textStroke(16)).toBe(2);
    expect(textStroke(32)).toBe(4);
    expect(textStroke(8, 8)).toBe(2);
  });
});
