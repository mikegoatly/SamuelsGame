import { describe, expect, it } from 'vitest';
import { defaultSave, parseSave, SAVE_VERSION, serialize, withSettings } from '../src/logic/save';
import { stepVolume, volumeGain } from '../src/logic/volume';

describe('stepVolume', () => {
  it('moves in steps of 10 and clamps to 0..100', () => {
    expect(stepVolume(50, 1)).toBe(60);
    expect(stepVolume(50, -1)).toBe(40);
    expect(stepVolume(100, 1)).toBe(100);
    expect(stepVolume(0, -1)).toBe(0);
  });

  it('snaps off-grid values', () => {
    expect(stepVolume(53, 1)).toBe(60);
    expect(stepVolume(53, -1)).toBe(50);
  });

  it('wraps when asked (Enter cycles)', () => {
    expect(stepVolume(100, 1, true)).toBe(0);
    expect(stepVolume(0, -1, true)).toBe(100);
  });
});

describe('volumeGain', () => {
  it('maps percent to a 0..1 gain, silent at 0', () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(100)).toBe(1);
    expect(volumeGain(50)).toBeGreaterThan(0.2);
    expect(volumeGain(50)).toBeLessThan(0.6);
  });
});

describe('volume settings in the save', () => {
  it('has defaults, round-trips and clamps junk', () => {
    const d = defaultSave().settings;
    expect(d.musicVolume).toBe(70);
    expect(d.sfxVolume).toBe(100);
    expect(d.reduceShake).toBe(false);
    const changed = withSettings(defaultSave(), { musicVolume: 30, sfxVolume: 0, reduceShake: true });
    expect(parseSave(serialize(changed)).settings).toEqual({ muted: false, musicVolume: 30, sfxVolume: 0, reduceShake: true, itemCards: 'first' });
    expect(parseSave(JSON.stringify({ settings: { musicVolume: 900, sfxVolume: 'loud', reduceShake: 'yes' } })).settings).toEqual({
      muted: false,
      musicVolume: 100,
      sfxVolume: 100,
      reduceShake: false,
      itemCards: 'first',
    });
  });

  it('migrates a v3 save that only had muted', () => {
    const migrated = parseSave(JSON.stringify({ version: 3, coins: 5, settings: { muted: true } }));
    expect(SAVE_VERSION).toBe(6);
    expect(migrated.version).toBe(6);
    expect(migrated.coins).toBe(5);
    expect(migrated.settings).toEqual({ muted: true, musicVolume: 70, sfxVolume: 100, reduceShake: false, itemCards: 'first' });
  });
});
