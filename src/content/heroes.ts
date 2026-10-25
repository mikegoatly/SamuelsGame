import type { HeroKit } from '../logic/heroSave';
import type { PassiveId } from '../logic/passives';
import type { HeroStatMods } from '../logic/stats';
import { WIZARD } from '../logic/unlocks';
import { Frame } from './assetKeys';

export interface HeroDef {
  id: string;
  name: string;
  /** Short label for the hero card. */
  className: string;
  /** Tiny Dungeon frame. */
  frame: number;
  tint: number | null;
  /** Accent colour of the hero card. */
  color: string;
  bio: string;
  stats: HeroStatMods;
  passive: { id: PassiveId; name: string; text: string };
  signatureWeaponId: string;
  startingSkillId?: string;
  /** Shown on the locked card; hints at the unlock without spelling it out. */
  hint?: string;
}

/** Low, medium and high ratings as multipliers for HP, speed and attack rate. */
export const RATING = { low: 0.85, mid: 1, high: 1.2 } as const;

const mods = (hp: number, speed: number, attack: number, damage = 1, skillCooldown = 1): HeroStatMods => ({ maxHp: hp, moveSpeed: speed, attackRate: attack, damage, skillCooldown });

export const wizard: HeroDef = {
  id: WIZARD,
  className: 'Wizard',
  name: 'Samuel the Wizard',
  frame: Frame.hero,
  tint: null,
  color: '#b48cff',
  bio: 'A curious apprentice with a knack for spells.',
  stats: mods(RATING.mid, RATING.mid, RATING.mid, 1, 0.9),
  passive: { id: 'quickCasting', name: 'Quick Casting', text: 'Skills cool down 10% faster.' },
  signatureWeaponId: 'apprenticeStaff',
};

export const knight: HeroDef = {
  id: 'knight',
  className: 'Knight',
  name: 'Sir Brandt',
  frame: 96,
  tint: null,
  color: '#a8b8d8',
  bio: 'A sworn knight who walks straight into trouble.',
  stats: mods(RATING.high, RATING.low, RATING.low, 1.1),
  passive: { id: 'frontGuard', name: 'Shield Wall', text: 'Takes 20% less damage from the front.' },
  signatureWeaponId: 'goldenSword',
  hint: 'A true warrior needs no tricks, from the first door to the last.',
};

export const rogue: HeroDef = {
  id: 'rogue',
  className: 'Rogue',
  name: 'Vex the Rogue',
  frame: 85,
  tint: 0xa8b0d8,
  color: '#7a8cd0',
  bio: 'Quick hands, quicker feet.',
  stats: mods(RATING.low, RATING.high, RATING.high, 0.9),
  passive: { id: 'daggerTrap', name: 'Dagger Trap', text: 'Where a dash ends, a dagger trap cuts enemies for 3 seconds (2 at a time).' },
  signatureWeaponId: 'twinDaggers',
  hint: 'The desert rewards the swift.',
};

export const dwarf: HeroDef = {
  id: 'dwarf',
  className: 'Dwarf',
  name: 'Borin the Dwarf',
  frame: 86,
  tint: 0xffc890,
  color: '#e0a860',
  bio: 'Thick-skinned, thick-bearded, and fond of shiny things.',
  stats: mods(RATING.high, RATING.low, RATING.mid, 1.1),
  passive: { id: 'prospector', name: 'Prospector', text: '+25% gold, and potions heal 50% more.' },
  signatureWeaponId: 'hammer',
  hint: 'Gold calls to the mountain folk.',
};

export const ranger: HeroDef = {
  id: 'ranger',
  className: 'Ranger',
  name: 'Wren the Ranger',
  frame: 88,
  tint: 0xb4e8a8,
  color: '#7dd890',
  bio: 'Never lets an enemy get close enough to see her face.',
  stats: mods(RATING.mid, RATING.mid, RATING.high),
  passive: { id: 'longShot', name: 'Long Shot', text: 'Basic hits from far away crit for 50% more damage.' },
  signatureWeaponId: 'bow',
  hint: 'Keep your distance, in the sand and the palace.',
};

export const monk: HeroDef = {
  id: 'monk',
  className: 'Monk',
  name: 'Kai the Monk',
  frame: 98,
  tint: 0xffd0a0,
  color: '#ffb060',
  bio: 'Calm mind, quick fists.',
  stats: mods(RATING.mid, RATING.high, RATING.mid),
  passive: { id: 'stunStreak', name: 'Stunning Palm', text: 'Every 5th basic hit stuns for 0.8 seconds (not bosses).' },
  signatureWeaponId: 'fists',
  hint: 'Discipline over comfort. Stand your ground.',
};

export const necromancer: HeroDef = {
  id: 'necromancer',
  className: 'Necromancer',
  name: 'Morwen the Necromancer',
  frame: 99,
  tint: 0x9a78d0,
  color: '#a070e0',
  bio: 'Listens to what the dead have to say.',
  stats: mods(RATING.low, RATING.mid, RATING.mid),
  passive: { id: 'risenDead', name: 'Risen Dead', text: 'Enemies you slay sometimes rise as a skeleton ally for 8 seconds (3 at a time).' },
  signatureWeaponId: 'apprenticeStaff',
  startingSkillId: 'spiritWolf',
  hint: 'So many souls...',
};

export const secret: HeroDef = {
  id: 'secret',
  className: 'Wanderer',
  name: 'The Wanderer',
  frame: 100,
  tint: 0xffe880,
  color: '#ffe066',
  bio: 'Nobody knows where the Wanderer came from, only that luck follows.',
  stats: mods(1.1, 1.1, 1.1, 1.1, 0.95),
  passive: { id: 'fortune', name: "Fortune's Favour", text: 'Rare drops (potions, gems, scrolls) come 50% more often.' },
  signatureWeaponId: 'brokenWand',
  hint: 'Many hands, one destiny.',
};

export const heroList: readonly HeroDef[] = [wizard, knight, rogue, dwarf, ranger, monk, necromancer, secret];

export const heroes: Record<string, HeroDef> = Object.fromEntries(heroList.map((hero) => [hero.id, hero]));

export const getHero = (id: string): HeroDef => heroes[id] ?? wizard;

export const heroKit = (id: string): HeroKit | undefined => {
  const hero = heroes[id];
  return hero && { weaponId: hero.signatureWeaponId, skillId: hero.startingSkillId };
};

/** 1 to 3 pips for a multiplier: below the baseline, around it, above it. */
export const ratingPips = (multiplier: number): number => (multiplier < 0.95 ? 1 : multiplier > 1.05 ? 3 : 2);
