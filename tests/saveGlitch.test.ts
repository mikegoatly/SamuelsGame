import { describe, expect, it } from 'vitest';
import { defaultSave, parseSave, SAVE_VERSION, serialize } from '../src/logic/save';
import { discoverGlitch, foundSecrets, GLITCH_NOTICE, queueGlitchNotice } from '../src/logic/secrets';
import { aSave } from './builders';

const parse = (raw: object) => parseSave(JSON.stringify(raw), {}, () => true);
const secrets = (over: object = {}) => ({ sewerFound: false, desertRunsWithoutGrate: 0, minesFound: false, nabPity: 0, glitchFound: false, ...over });

describe('migration to version 14 (Glitch)', () => {
  it('is version 14 with Glitch not found', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(14);
    expect(defaultSave().secrets.glitchFound).toBe(false);
  });

  it.each([1, 11, 12, 13])('a v%i save keeps its data and gains glitchFound: false', (version) => {
    const migrated = parse({ version, coins: 9, levels: { cleared: ['ruins'], heroic: { cleared: ['ruins', 'desert', 'palace'], bestTimes: {} } }, secrets: { sewerFound: true, minesFound: true, nabPity: 3 } });
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.coins).toBe(9);
    expect(migrated.levels.heroic.cleared).toEqual(['ruins', 'desert', 'palace']);
    expect(migrated.secrets).toEqual(secrets({ sewerFound: true, minesFound: true, nabPity: 3 }));
  });

  it('round-trips a found Glitch', () => {
    const save = aSave({ secrets: secrets({ glitchFound: true }) });
    expect(parseSave(serialize(save))).toEqual(save);
  });

  it.each([['yes'], [1], [null], [undefined]])('junk glitchFound %j reads as not found', (junk) => {
    expect(parse({ version: 14, secrets: { glitchFound: junk, minesFound: true } }).secrets).toMatchObject({ glitchFound: false, minesFound: true });
  });
});

describe('discoverGlitch', () => {
  it('marks Glitch found without touching anything else (no hero until G3)', () => {
    const before = aSave({ secrets: secrets({ sewerFound: true, nabPity: 2 }) });
    const after = discoverGlitch(before);
    expect(after.secrets).toEqual(secrets({ sewerFound: true, nabPity: 2, glitchFound: true }));
    expect(after.heroes).toEqual(before.heroes);
  });

  it('is idempotent', () => {
    const once = discoverGlitch(aSave());
    expect(discoverGlitch(once)).toEqual(once);
  });
});

describe('queueGlitchNotice', () => {
  it('queues the Glitch discovered card once, never after it was seen', () => {
    const queued = queueGlitchNotice(aSave());
    expect(queued.pendingNotices).toEqual([GLITCH_NOTICE]);
    expect(queueGlitchNotice(queued)).toBe(queued);
    const seen = aSave({ seen: [GLITCH_NOTICE] });
    expect(queueGlitchNotice(seen)).toBe(seen);
  });
});

describe('foundSecrets', () => {
  it.each([
    [secrets({ glitchFound: true }), ['glitch']],
    [secrets({ sewerFound: true, minesFound: true, glitchFound: true }), ['sewer', 'mines', 'glitch']],
  ])('%j -> %j', (state, expected) => {
    expect(foundSecrets(state)).toEqual(expected);
  });
});
