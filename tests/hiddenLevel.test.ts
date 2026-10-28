import { describe, expect, it } from 'vitest';
import { sewer } from '../src/content/levels/sewer';
import { levels } from '../src/content/levels';
import { offersHeroic } from '../src/logic/heroicSwitch';
import { isLevelPlayable, isLevelUnlocked, visibleLevels } from '../src/logic/levelRules';

describe('the hidden sewer card', () => {
  const desert = { id: 'desert', unlockedBy: 'ruins' };
  const sewer = { id: 'sewer', unlockedBy: 'desert', comingSoon: true, hiddenUntilFound: true };
  const palace = { id: 'palace', unlockedBy: 'desert' };
  const ids = (found: boolean, cleared: string[]): string[] => visibleLevels([desert, sewer, palace], cleared, found).map((l) => l.id);

  it.each([
    [false, [], ['desert', 'palace']],
    [false, ['ruins', 'desert'], ['desert', 'palace']],
    [true, [], ['desert', 'sewer', 'palace']],
    [true, ['ruins', 'desert'], ['desert', 'sewer', 'palace']],
  ])('found %s with %j cleared lists %j (no card, no hint before it is found)', (found, cleared, expected) => {
    expect(ids(found, cleared)).toEqual(expected);
  });

  it('defaults to not found', () => {
    expect(visibleLevels([desert, sewer], ['desert']).map((l) => l.id)).toEqual(['desert']);
  });

  it('can be played only when it is not coming soon, in one place', () => {
    expect(isLevelPlayable(sewer)).toBe(false);
    expect(isLevelPlayable({ ...sewer, comingSoon: false })).toBe(true);
    expect(isLevelUnlocked(sewer, ['desert'])).toBe(false);
    expect(isLevelUnlocked({ ...sewer, comingSoon: false }, ['desert'])).toBe(true);
  });
});

describe('the released sewer', () => {
  it('is listed right after the desert, hidden until found, playable and rewards the Javelin', () => {
    const ids = levels.map((l) => l.id);
    expect(ids.indexOf('sewer')).toBe(ids.indexOf('desert') + 1);
    expect(sewer).toMatchObject({ name: 'Sunken Sewer', recommendedLevel: 9, monsterLevelRange: [8, 11], hiddenUntilFound: true, rewardWeaponId: 'javelin' });
    expect(sewer.comingSoon).toBeUndefined();
    expect(isLevelPlayable(sewer)).toBe(true);
  });

  it('shows no card until found, is open once found (cleared or not), and offers Heroic only after its own clear', () => {
    expect(visibleLevels(levels, ['ruins', 'desert', 'palace']).map((l) => l.id)).not.toContain('sewer');
    expect(visibleLevels(levels, [], true).map((l) => l.id)).toContain('sewer');
    expect(isLevelUnlocked(sewer, [])).toBe(true);
    expect(offersHeroic({ ...sewer }, ['desert'])).toBe(false);
    expect(offersHeroic({ ...sewer }, ['desert', 'sewer'])).toBe(true);
  });
});
