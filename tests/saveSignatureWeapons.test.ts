import { describe, expect, it } from 'vitest';
import { heroes } from '../src/content/heroes';
import { defaultSave, equipWeapon, parseSave, SAVE_VERSION, serialize, type SaveData } from '../src/logic/save';
import { aSave } from './builders';

const signature = (id: string): string | undefined => heroes[id]?.signatureWeaponId;
const parse = (raw: object): SaveData => parseSave(JSON.stringify(raw), {}, () => true, () => true, signature);

describe('migration to version 12 (heroes own their signature weapon)', () => {
  it('is version 12', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(12);
  });

  it('a knight who owns and equips the Golden Sword keeps it, levels included, and also gains the Iron Sword', () => {
    const migrated = parse({
      version: 11,
      weapons: { owned: ['apprenticeStaff', 'goldenSword'], levels: { goldenSword: 3 } },
      loadout: { weapon: 'goldenSword', slots: [null, null, null] },
      heroes: { unlocked: ['wizard', 'knight'], selected: 'knight' },
    });
    expect(migrated.weapons.owned).toEqual(['apprenticeStaff', 'goldenSword', 'ironSword']);
    expect(migrated.weapons.levels.goldenSword).toBe(3);
    expect(migrated.loadout.weapon).toBe('goldenSword');
    expect(migrated.version).toBe(SAVE_VERSION);
  });

  it('a necromancer gains the Bone Staff without losing the Apprentice Staff or changing the loadout', () => {
    const migrated = parse({ version: 11, weapons: { owned: ['apprenticeStaff'] }, loadout: { weapon: 'apprenticeStaff' }, heroes: { unlocked: ['wizard', 'necromancer'], selected: 'necromancer' } });
    expect(migrated.weapons.owned).toEqual(['apprenticeStaff', 'boneStaff']);
    expect(migrated.loadout.weapon).toBe('apprenticeStaff');
  });

  it('a save with the Golden Sword and no knight still owns it and can equip it', () => {
    const migrated = parse({ version: 11, weapons: { owned: ['apprenticeStaff', 'goldenSword'] }, loadout: { weapon: 'goldenSword' } });
    expect(migrated.weapons.owned).toContain('goldenSword');
    expect(migrated.weapons.owned).not.toContain('ironSword');
    expect(migrated.loadout.weapon).toBe('goldenSword');
    expect(equipWeapon(migrated, 'goldenSword').loadout.weapon).toBe('goldenSword');
  });

  it('is idempotent: a migrated save round-trips unchanged', () => {
    const current = parse({ version: 11, weapons: { owned: ['apprenticeStaff', 'goldenSword'] }, heroes: { unlocked: ['wizard', 'knight'], selected: 'knight' } });
    expect(parse(JSON.parse(serialize(current)))).toEqual(current);
  });

  it('a v12 save is trusted as is: a weapon not owned is not granted again', () => {
    const migrated = parse({ ...JSON.parse(serialize(aSave())), heroes: { unlocked: ['wizard', 'knight'], selected: 'knight' } });
    expect(migrated.weapons.owned).toEqual(['apprenticeStaff']);
  });

  it('junk data and a missing lookup change nothing', () => {
    expect(parseSave('nope', {}, () => true, () => true, signature)).toEqual(defaultSave());
    expect(parseSave(JSON.stringify({ version: 11, heroes: { unlocked: ['wizard', 'knight'] } })).weapons.owned).toEqual(['apprenticeStaff']);
  });
});
