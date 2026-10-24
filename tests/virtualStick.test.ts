import { describe, expect, it } from 'vitest';
import { classifyTouch, isInCircle, readStick, touchMetrics } from '../src/logic/virtualStick';
import { expectStick } from './builders';

const origin = { x: 100, y: 100 };

describe('readStick', () => {
  it.each([
    ['at origin', 100, 100, 0, 0, 0, 0],
    ['inside deadzone', 105, 100, 5, 0, 0, 0],
    ['half deflection', 125, 100, 25, 0, 0.4, 0],
    ['full right', 150, 100, 50, 0, 1, 0],
    ['clamped right', 400, 100, 50, 0, 1, 0],
    ['clamped up', 100, -300, 0, -50, 0, -1],
    ['clamped diagonal', 200, 200, 50 * Math.SQRT1_2, 50 * Math.SQRT1_2, Math.SQRT1_2, Math.SQRT1_2],
  ])('%s', (_name, px, py, knobX, knobY, valueX, valueY) => {
    const reading = readStick(origin, { x: px, y: py }, 50);
    expectStick(reading.knob, knobX, knobY);
    expectStick(reading.value, valueX, valueY);
  });

  it('never exceeds magnitude 1', () => {
    const { value } = readStick(origin, { x: -999, y: 777 }, 50);
    expect(Math.hypot(value.x, value.y)).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('isInCircle', () => {
  const circle = { x: 10, y: 10, r: 5 };
  it.each([
    [10, 10, 0, true],
    [15, 10, 0, true],
    [15.1, 10, 0, false],
    [17, 10, 2, true],
    [18, 10, 2, false],
  ])('(%d, %d) slop %d => %s', (x, y, slop, expected) => {
    expect(isInCircle({ x, y }, circle, slop)).toBe(expected);
  });
});

describe('classifyTouch', () => {
  const width = 640;
  const metrics = touchMetrics(width, 360);
  const dash = metrics.buttons.find((b) => b.id === 'dash')!;
  const skill = (id: string) => metrics.buttons.find((b) => b.id === id)!;

  it.each([
    ['left half', 50, 300, 'move'],
    ['just left of centre', 319, 200, 'move'],
    ['right half', 400, 300, 'aim'],
    ['centre line', 320, 200, 'aim'],
    ['dash button', dash.x, dash.y, 'dash'],
    ['skill 1 button', skill('skill1').x, skill('skill1').y, 'skill1'],
    ['skill 2 button', skill('skill2').x, skill('skill2').y, 'skill2'],
    ['skill 3 button', skill('skill3').x, skill('skill3').y, 'skill3'],
    ['potion button', skill('potion').x, skill('potion').y, 'potion'],
    ['fullscreen button', metrics.fullscreen.x, metrics.fullscreen.y, null],
    ['pause button', metrics.pause.x, metrics.pause.y, null],
  ])('%s', (_name, x, y, expected) => {
    expect(classifyTouch({ x, y }, width, metrics)).toBe(expected);
  });
});

describe('touchMetrics', () => {
  it('uses a 50px stick at the base resolution', () => {
    expect(touchMetrics(640, 360).stickRadius).toBe(50);
  });

  it('has dash, three skill buttons in slot order, then the potion button', () => {
    expect(touchMetrics(640, 360).buttons.map((b) => b.id)).toEqual(['dash', 'skill1', 'skill2', 'skill3', 'potion']);
  });

  it.each([
    [640, 360],
    [740, 360],
    [568, 320],
    [640, 480],
    [800, 360],
    [900, 420],
  ])('keeps buttons on the right, on screen and apart at %dx%d', (w, h) => {
    const { buttons, fullscreen, pause } = touchMetrics(w, h);
    for (const button of buttons) {
      expect(button.x + button.r).toBeLessThanOrEqual(w);
      expect(button.y + button.r).toBeLessThanOrEqual(h);
      expect(button.y - button.r).toBeGreaterThanOrEqual(0);
      expect(button.x).toBeGreaterThan(w / 2);
      for (const hud of [fullscreen, pause]) expect(Math.hypot(button.x - hud.x, button.y - hud.y)).toBeGreaterThan(button.r + hud.r);
    }
    for (const first of buttons) {
      for (const second of buttons.filter((o) => o !== first)) expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThan(first.r + second.r);
    }
  });

  it('leaves room on the right half for the aim stick to start', () => {
    const { buttons } = touchMetrics(740, 360);
    const free = buttons.every((b) => b.x - b.r > 740 / 2 + 40);
    expect(free).toBe(true);
  });
});
