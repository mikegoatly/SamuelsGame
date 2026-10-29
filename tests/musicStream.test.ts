import { describe, expect, it } from 'vitest';
import { chooseSlot, musicUrl, trackGain } from '../src/logic/musicStream';

describe('musicUrl', () => {
  it.each([
    ['./', 'music/menu.mp3', './assets/music/menu.mp3'],
    ['/', 'music/menu.mp3', '/assets/music/menu.mp3'],
    ['/game', 'music/boss.mp3', '/game/assets/music/boss.mp3'],
    ['/game/', 'music/boss.mp3', '/game/assets/music/boss.mp3'],
    ['.', 'music/menu.mp3', './assets/music/menu.mp3'],
    ['', 'music/boss.mp3', 'assets/music/boss.mp3'],
  ])('joins base %j and %j', (base, file, expected) => {
    expect(musicUrl(base, file)).toBe(expected);
  });
});

describe('trackGain', () => {
  it.each([
    [0.6, 1, 0.6],
    [0.6, 0.5, 0.3],
    [0.6, 0, 0],
    [0, 1, 0],
  ])('ceiling %f at level %f is %f', (ceiling, level, expected) => {
    expect(trackGain(ceiling, level)).toBeCloseTo(expected);
  });

  it('clamps out-of-range input to 0..1', () => {
    expect(trackGain(2, 1)).toBe(1);
    expect(trackGain(0.6, -1)).toBe(0);
  });
});

describe('chooseSlot', () => {
  const live = (target: number, level: number) => ({ target, level, slot: 'extra-field-must-not-leak' });
  it.each([
    [[undefined, undefined], 0, false],
    [[live(1, 1), undefined], 1, false],
    [[undefined, live(1, 1)], 0, false],
    [[live(0, 0.7), live(1, 0.3)], 0, true],
    [[live(1, 0.3), live(0, 0.7)], 1, true],
    [[live(0, 0.2), live(0, 0.6)], 0, true],
    [[live(0, 0.6), live(0, 0.2)], 1, true],
    [[live(1, 0.9), live(1, 0.4)], 1, true],
  ])('slots %j -> slot %i (steal %s)', (slots, slot, steal) => {
    expect(chooseSlot(slots)).toEqual({ slot, steal });
  });
});
