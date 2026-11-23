import { describe, expect, it } from 'vitest';
import { heroes, heroKit } from '../src/content/heroes';
import { defaultSave, parseSave, SAVE_VERSION, serialize } from '../src/logic/save';
import { pendingHeroReveals } from '../src/logic/heroSave';
import { discoverGlitch, foundSecrets, GLITCH_HERO, GLITCH_NOTICE, queueGlitchNotice } from '../src/logic/secrets';
import { aSave } from './builders';

const parse = (raw: object) => parseSave(JSON.stringify(raw), {}, () => true, () => true, (id) => heroes[id]?.signatureWeaponId);
const noKit = (): undefined => undefined;
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
    const save = discoverGlitch(aSave({ secrets: secrets({ glitchFound: true }) }), noKit);
    expect(parseSave(serialize(save))).toEqual(save);
  });

  it.each([['yes'], [1], [null], [undefined]])('junk glitchFound %j reads as not found', (junk) => {
    expect(parse({ version: 14, secrets: { glitchFound: junk, minesFound: true } }).secrets).toMatchObject({ glitchFound: false, minesFound: true });
  });
});

describe('discoverGlitch', () => {
  it('marks Glitch found, unlocks the Glitcher and queues his reveal', () => {
    const before = aSave({ secrets: secrets({ sewerFound: true, nabPity: 2 }) });
    const after = discoverGlitch(before, noKit);
    expect(after.secrets).toEqual(secrets({ sewerFound: true, nabPity: 2, glitchFound: true }));
    expect(after.heroes.unlocked).toContain(GLITCH_HERO);
    expect(after.heroes.selected).toBe(before.heroes.selected);
    expect(pendingHeroReveals(after)).toEqual([GLITCH_HERO]);
  });

  it('gives him his Pixel Pulse without equipping it', () => {
    const save = discoverGlitch(aSave(), heroKit);
    expect(save.weapons.owned).toContain(heroes[GLITCH_HERO]!.signatureWeaponId);
    expect(save.loadout.weapon).toBe(aSave().loadout.weapon);
  });

  it('is idempotent', () => {
    const once = discoverGlitch(aSave(), noKit);
    expect(discoverGlitch(once, noKit)).toEqual(once);
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

describe('saves that found Glitch before the Glitcher existed', () => {
  const old = { version: 14, coins: 7, secrets: { glitchFound: true, minesFound: true }, heroes: { unlocked: ['wizard', 'nab'], selected: 'nab' }, levels: { cleared: ['ruins'] } };

  it('get him on load, with his reveal card pending and his weapon owned, keeping everything else', () => {
    const loaded = parse(old);
    expect(loaded.heroes).toEqual({ unlocked: ['wizard', 'nab', GLITCH_HERO], selected: 'nab' });
    expect(pendingHeroReveals(loaded)).toEqual([GLITCH_HERO]);
    expect(loaded.weapons.owned).toContain(heroes[GLITCH_HERO]!.signatureWeaponId);
    expect(loaded.coins).toBe(7);
    expect(loaded.levels.cleared).toEqual(['ruins']);
  });

  it('is repeatable: loading the repaired save again changes nothing', () => {
    const once = parse(old);
    expect(parse(JSON.parse(serialize(once)))).toEqual(once);
  });

  it('does not queue the reveal again once it was seen', () => {
    const loaded = parse({ ...old, seen: ['hero:glitcher'] });
    expect(loaded.heroes.unlocked).toContain(GLITCH_HERO);
    expect(pendingHeroReveals(loaded)).toEqual([]);
  });

  it('leaves saves that never found Glitch alone, and skips him quietly when the hero is unknown', () => {
    expect(parse({ ...old, secrets: { minesFound: true } }).heroes.unlocked).not.toContain(GLITCH_HERO);
    const unknown = parseSave(JSON.stringify(old), {}, () => true, (id) => id !== GLITCH_HERO);
    expect(unknown.heroes.unlocked).not.toContain(GLITCH_HERO);
    expect(unknown.secrets.glitchFound).toBe(true);
  });
});
