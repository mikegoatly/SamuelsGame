import { describe, expect, it } from 'vitest';
import { cloakAlpha } from '../src/logic/charge';
import { isLevelUnlocked, visibleLevels } from '../src/logic/levelRules';
import { applyLevelClear, equipWeapon, grantWeapon } from '../src/logic/save';
import { pickThrone } from '../src/logic/spawnPoints';
import { fireballStatus } from '../src/logic/fireball';
import { aSave } from './builders';

describe('cloakAlpha', () => {
  it('is faint while stalking and fully visible once it commits to the strike', () => {
    expect(cloakAlpha('stalk', 0.15)).toBe(0.15);
    for (const phase of ['windup', 'dash', 'recover'] as const) expect(cloakAlpha(phase, 0.15)).toBe(1);
  });
});

describe('pickThrone', () => {
  const thrones = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 200, y: 0 },
  ];

  it('never picks the throne the boss is on, preferring the one furthest from the player', () => {
    expect(pickThrone(thrones, thrones[0]!, { x: 90, y: 0 }, () => 0)).toEqual(thrones[2]);
  });

  it('can pick the nearer alternative with a high roll, but still not the current throne', () => {
    for (const roll of [0, 0.4, 0.99]) expect(pickThrone(thrones, thrones[1]!, { x: 0, y: 0 }, () => roll)).not.toEqual(thrones[1]);
  });

  it('copes with a single throne, no current throne and no thrones', () => {
    expect(pickThrone([thrones[0]!], thrones[0]!, { x: 5, y: 5 }, () => 0)).toEqual(thrones[0]);
    expect(pickThrone(thrones, null, { x: 0, y: 0 }, () => 0)).toEqual(thrones[2]);
    expect(pickThrone([], null, { x: 0, y: 0 }, () => 0)).toBeUndefined();
  });
});

describe('equipWeapon', () => {
  it('equips an owned weapon and ignores one that is not owned', () => {
    const owned = grantWeapon(aSave(), 'brokenWand', false);
    expect(equipWeapon(owned, 'brokenWand').weapons.equipped).toBe('brokenWand');
    expect(equipWeapon(owned, 'goldenSword')).toBe(owned);
  });

  it('clearing the palace grants and equips the golden sword, keeping the older weapons', () => {
    const save = applyLevelClear(grantWeapon(aSave(), 'brokenWand'), { levelId: 'palace', rewardWeaponId: 'goldenSword' });
    expect(save.weapons.owned).toEqual(['apprenticeStaff', 'brokenWand', 'goldenSword']);
    expect(save.weapons.equipped).toBe('goldenSword');
    expect(equipWeapon(save, 'brokenWand').weapons.equipped).toBe('brokenWand');
  });
});

describe('level visibility', () => {
  const palace = { id: 'palace', unlockedBy: 'desert' };
  const teaser = { id: 'ultimate', unlockedBy: 'palace', comingSoon: true };

  it('a coming-soon level is never unlocked, even once its prerequisite is cleared', () => {
    expect(isLevelUnlocked(teaser, ['palace'])).toBe(false);
    expect(isLevelUnlocked(palace, ['desert'])).toBe(true);
  });

  it('the teaser only shows after its prerequisite is cleared', () => {
    const all = [palace, teaser];
    expect(visibleLevels(all, ['desert']).map((l) => l.id)).toEqual(['palace']);
    expect(visibleLevels(all, ['desert', 'palace']).map((l) => l.id)).toEqual(['palace', 'ultimate']);
  });
});

describe('fireball status with a non-wand weapon', () => {
  it('stays unlocked (so the HUD can grey it) while unavailable', () => {
    const status = fireballStatus({ unlocked: true, castsPowers: false, now: 0, readyAt: 0 });
    expect(status).toMatchObject({ unlocked: true, available: false, ready: false });
    expect(fireballStatus({ unlocked: false, castsPowers: true, now: 0, readyAt: 0 }).unlocked).toBe(false);
  });
});

describe('pickThrone near the player', () => {
  const thrones = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 200, y: 0 },
  ];

  it('skips thrones inside the shockwave radius of the player', () => {
    for (const roll of [0, 0.5, 0.99]) expect(pickThrone(thrones, thrones[0]!, { x: 195, y: 0 }, () => roll, 70)).toEqual(thrones[1]);
  });

  it('falls back to any other throne when all are too close, never the last one', () => {
    for (const roll of [0, 0.5, 0.99]) expect(pickThrone(thrones, thrones[1]!, { x: 100, y: 0 }, () => roll, 500)).not.toEqual(thrones[1]);
  });
});
