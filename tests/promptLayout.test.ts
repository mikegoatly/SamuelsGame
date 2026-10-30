import { describe, expect, it } from 'vitest';
import { MIN_BUTTON_SCREEN_PX, promptMetrics } from '../src/logic/promptLayout';

describe('promptMetrics', () => {
  it.each([
    ['a big desktop window (canvas enlarged)', 0.5, 640, 16, 30, 360],
    ['a 1:1 canvas', 1, 640, 32, 44, 624],
    ['a phone in portrait (canvas shrunk to 61%)', 640 / 390, 640, 48, 73, 624],
  ])('%s', (_, scale, width, textSize, buttonHeight, panelWidth) => {
    const m = promptMetrics(scale, width);
    expect(m).toMatchObject({ textSize, buttonHeight, panelWidth });
  });

  it.each([0.3, 0.5, 1, 1.5, 2, 3])('text is a multiple of 16 and the panel fits the screen at scale %s', (scale) => {
    const m = promptMetrics(scale, 640);
    expect(m.textSize % 16).toBe(0);
    expect(m.titleSize % 16).toBe(0);
    expect(m.panelWidth).toBeLessThanOrEqual(640 - 16);
  });

  it.each([1, 1.5, 2, 3])('buttons are at least 44 screen px at scale %s', (scale) => {
    expect(promptMetrics(scale, 640).buttonHeight / scale).toBeGreaterThanOrEqual(MIN_BUTTON_SCREEN_PX);
  });
});
