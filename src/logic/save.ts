import { MAX_LEVEL, type PlayerProgress } from './progression';
import { xpToNextLevel } from './xp';
import { CHARM_TO_GEM, GEM_COLOURS, LEGACY_CARD_IDS, noGems, totalGems, type GemColour, type Gems } from './gems';

import type { CardMode } from './itemCards';
import { WIZARD, type AccountStats } from './unlocks';
import { getAccessory, crownFor, type AccessorySlot } from '../content/accessories';
import { isHeroicUnlocked, type LevelMode } from './heroic';
import { emptySlots, equipInSlot, firstEmptySlot, sanitizeSlots, type Loadout } from './loadout';

/** v12: unlocked heroes own their signature weapon (the Knight's Iron Sword, the Necromancer's Bone Staff); nothing is removed, so a Golden Sword stays owned and equipped. v11: `secrets`. v10: `survival`. v9: `levels.heroic`, `levels.mode`, `accessories`. v8: `heroes` + `stats`. v7: `gems` replace `charms`; `potions`, `revive`, `shop`, `weapons.levels` added. v6: `skills` + `loadout` replace `powers` and `weapons.equipped`. v5: `seen` + `itemCards`; v4: volumes + reduceShake; v2: `settings`. Older saves load through the same tolerant parse. */
export const SAVE_VERSION = 12;
/** First version where every unlocked hero already owns their signature weapon. */
const KIT_WEAPONS_VERSION = 12;
/** Gems a level's first Heroic clear pays: one full 3-to-4 item upgrade of every colour. */
export const HEROIC_CLEAR_GEMS: Gems = { red: 3, green: 3, blue: 3 };
/** First version that stores `gems` instead of `charms`. */
const GEMS_VERSION = 7;
/** First version whose skills and loadout need no conversion from powers. */
const SKILLS_VERSION = 6;
export const MAX_SKILL_LEVEL = 5;
const MAX_GRATE_RUNS = 99;
export const MAX_POTIONS = 3;
export const CHARMS_NOTICE = 'charmsToGems';
export const STARTING_WEAPON = 'apprenticeStaff';

export interface Settings {
  muted: boolean;
  /** 0-100, steps of 10. */
  musicVolume: number;
  sfxVolume: number;
  /** Accessibility: no screen shake, softer flashes. */
  reduceShake: boolean;
  /** When to pause for an item card on pickup. */
  itemCards: CardMode;
}

export const defaultSettings = (): Settings => ({ muted: false, musicVolume: 70, sfxVolume: 100, reduceShake: false, itemCards: 'first' });

export interface OwnedSkill {
  id: string;
  level: number;
}

/** Things the player has to discover; they stay hidden from menus until found. */
export interface Secrets {
  sewerFound: boolean;
  /** Pity counter: random desert runs in a row that had no grate room. */
  desertRunsWithoutGrate: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  progress: PlayerProgress;
  coins: number;
  gems: Gems;
  weapons: { owned: string[]; /** Upgrade level per weapon id; missing means 1. */ levels: Record<string, number> };
  /** Carry-in health potions bought at the Camp. */
  potions: number;
  /** A Revive Token is held: revives once at 50% HP on death in a level. */
  revive: boolean;
  /** Camp shop stock rotates each time this goes up (every level clear). */
  shop: { rotation: number };
  /** One-time notices waiting to be shown (e.g. charms became gems). */
  pendingNotices: string[];
  skills: { owned: OwnedSkill[] };
  /** Basic weapon and the three skill slots chosen on the loadout screen. */
  loadout: Loadout;
  levels: { cleared: string[]; bestTimes?: Record<string, number>; heroic: { cleared: string[]; bestTimes: Record<string, number> }; /** Remembered Normal/Heroic choice per level. */ mode: Record<string, LevelMode> };
  accessories: { owned: string[]; worn: Partial<Record<AccessorySlot, string>> };
  /** Heroic Survival best: longest run in ms, and the wave it reached. */
  survival: { bestMs: number; bestWave?: number };
  /** Hero roster: who is unlocked and who plays next. */
  heroes: { unlocked: string[]; selected: string };
  /** Lifetime totals the hero unlock rules read. */
  stats: AccountStats;
  secrets: Secrets;
  settings: Settings;
  /** Item/event ids whose card the player has already seen. */
  seen: string[];
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    progress: { level: 1, xp: 0 },
    coins: 0,
    gems: noGems(),
    weapons: { owned: [STARTING_WEAPON], levels: {} },
    potions: 0,
    revive: false,
    shop: { rotation: 0 },
    pendingNotices: [],
    skills: { owned: [] },
    loadout: { weapon: STARTING_WEAPON, slots: emptySlots() },
    levels: { cleared: [], heroic: { cleared: [], bestTimes: {} }, mode: {} },
    accessories: { owned: [], worn: {} },
    survival: { bestMs: 0 },
    heroes: { unlocked: [WIZARD], selected: WIZARD },
    stats: { totalKills: 0, goldPeak: 0, bossKillsByHero: {} },
    secrets: { sewerFound: false, desertRunsWithoutGrate: 0 },
    settings: defaultSettings(),
    seen: [],
  };
}

export const serialize = (save: SaveData): string => JSON.stringify(save);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const wholeNumber = (value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && v.length > 0))] : [];

/** Skill ids each level hands out; lets saves from before skills existed receive the rewards of levels they already cleared. */
export type LegacySkillRewards = Readonly<Record<string, readonly string[]>>;

function parseOwnedSkills(value: unknown): OwnedSkill[] {
  if (!Array.isArray(value)) return [];
  const owned: OwnedSkill[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.length === 0 || owned.some((s) => s.id === entry.id)) continue;
    owned.push({ id: entry.id, level: wholeNumber(entry.level, 1, 1, MAX_SKILL_LEVEL) });
  }
  return owned;
}

/** v7 stores `gems`; older saves held `charms`, which convert one to one. */
function parseGems(raw: Record<string, unknown>): Gems {
  const gems = noGems();
  const modern = typeof raw.version === 'number' && raw.version >= GEMS_VERSION;
  const source = modern ? raw.gems : raw.charms;
  if (!isRecord(source)) return gems;
  if (modern) for (const colour of GEM_COLOURS) gems[colour] = wholeNumber(source[colour], 0);
  else for (const [charm, colour] of Object.entries(CHARM_TO_GEM)) gems[colour] = wholeNumber(source[charm], 0);
  return gems;
}

function parseHeroes(raw: Record<string, unknown>, isKnown: (id: string) => boolean): Pick<SaveData, 'heroes' | 'stats'> {
  const heroes = isRecord(raw.heroes) ? raw.heroes : {};
  const unlocked = [WIZARD, ...strings(heroes.unlocked).filter((id) => id !== WIZARD && isKnown(id))];
  const selected = typeof heroes.selected === 'string' && unlocked.includes(heroes.selected) ? heroes.selected : WIZARD;
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const bossKillsByHero: Record<string, string[]> = {};
  if (isRecord(stats.bossKillsByHero)) {
    for (const [hero, bosses] of Object.entries(stats.bossKillsByHero)) {
      const list = strings(bosses);
      if (list.length > 0 && (hero === WIZARD || isKnown(hero))) bossKillsByHero[hero] = list;
    }
  }
  return {
    heroes: { unlocked, selected },
    stats: { totalKills: wholeNumber(stats.totalKills, 0), goldPeak: Math.max(wholeNumber(stats.goldPeak, 0), wholeNumber(raw.coins, 0)), bossKillsByHero },
  };
}

function parseTimes(value: unknown): Record<string, number> {
  const times: Record<string, number> = {};
  if (!isRecord(value)) return times;
  for (const [id, time] of Object.entries(value)) if (typeof time === 'number' && Number.isFinite(time) && time > 0) times[id] = time;
  return times;
}

function parseHeroicLevels(levels: Record<string, unknown>): Pick<SaveData['levels'], 'heroic' | 'mode'> {
  const heroic = isRecord(levels.heroic) ? levels.heroic : {};
  const mode: Record<string, LevelMode> = {};
  if (isRecord(levels.mode)) for (const [id, value] of Object.entries(levels.mode)) if (value === 'heroic' || value === 'normal') mode[id] = value;
  return { heroic: { cleared: strings(heroic.cleared), bestTimes: parseTimes(heroic.bestTimes) }, mode };
}

function parseAccessories(value: unknown): SaveData['accessories'] {
  const raw = isRecord(value) ? value : {};
  const owned = strings(raw.owned).filter((id) => getAccessory(id) !== undefined);
  const worn: SaveData['accessories']['worn'] = {};
  if (isRecord(raw.worn)) {
    for (const [slot, id] of Object.entries(raw.worn)) {
      const item = typeof id === 'string' ? getAccessory(id) : undefined;
      if (item && item.slot === slot && owned.includes(item.id)) worn[item.slot] = item.id;
    }
  }
  return { owned, worn };
}

function parseSurvival(value: unknown): SaveData['survival'] {
  const raw = isRecord(value) ? value : {};
  const bestMs = wholeNumber(raw.bestMs, 0);
  const bestWave = wholeNumber(raw.bestWave, 0);
  return bestMs > 0 && bestWave > 0 ? { bestMs, bestWave } : { bestMs };
}

function parseSecrets(value: unknown): Secrets {
  const raw = isRecord(value) ? value : {};
  return { sewerFound: raw.sewerFound === true, desertRunsWithoutGrate: wholeNumber(raw.desertRunsWithoutGrate, 0, 0, MAX_GRATE_RUNS) };
}

function parseWeaponLevels(value: unknown, owned: readonly string[]): Record<string, number> {
  const levels: Record<string, number> = {};
  if (!isRecord(value)) return levels;
  for (const id of owned) {
    const level = wholeNumber(value[id], 1, 1, MAX_SKILL_LEVEL);
    if (level > 1) levels[id] = level;
  }
  return levels;
}

/** Tolerant: junk, partial or old data falls back to defaults field by field; never throws. */
export function parseSave(json: string | null | undefined, legacyRewards: LegacySkillRewards = {}, isKnownSkill: (id: string) => boolean = () => true, isKnownHero: (id: string) => boolean = () => true, signatureWeaponOf: (heroId: string) => string | undefined = () => undefined): SaveData {
  const save = defaultSave();
  let raw: unknown;
  try {
    raw = JSON.parse(json ?? '');
  } catch {
    return save;
  }
  if (!isRecord(raw)) return save;

  if (isRecord(raw.progress)) {
    const level = wholeNumber(raw.progress.level, 1, 1, MAX_LEVEL);
    save.progress = { level, xp: level >= MAX_LEVEL ? 0 : Math.min(wholeNumber(raw.progress.xp, 0), xpToNextLevel(level) - 1) };
  }
  save.coins = wholeNumber(raw.coins, 0);
  save.gems = parseGems(raw);
  save.potions = wholeNumber(raw.potions, 0, 0, MAX_POTIONS);
  save.revive = raw.revive === true;
  if (isRecord(raw.shop)) save.shop = { rotation: wholeNumber(raw.shop.rotation, 0) };
  if (isRecord(raw.weapons)) {
    const owned = strings(raw.weapons.owned);
    if (!owned.includes(STARTING_WEAPON)) owned.unshift(STARTING_WEAPON);
    save.weapons = { owned, levels: parseWeaponLevels(raw.weapons.levels, owned) };
  }
  if (isRecord(raw.levels)) {
    save.levels.cleared = strings(raw.levels.cleared);
    if (isRecord(raw.levels.bestTimes)) save.levels.bestTimes = parseTimes(raw.levels.bestTimes);
    Object.assign(save.levels, parseHeroicLevels(raw.levels));
  }
  save.accessories = parseAccessories(raw.accessories);
  save.survival = parseSurvival(raw.survival);
  Object.assign(save, parseHeroes(raw, isKnownHero));
  save.secrets = parseSecrets(raw.secrets);
  if (isRecord(raw.settings)) {
    const fallback = defaultSettings();
    save.settings = {
      muted: raw.settings.muted === true,
      musicVolume: wholeNumber(raw.settings.musicVolume, fallback.musicVolume, 0, 100),
      sfxVolume: wholeNumber(raw.settings.sfxVolume, fallback.sfxVolume, 0, 100),
      reduceShake: raw.settings.reduceShake === true,
      itemCards: raw.settings.itemCards === 'always' ? 'always' : 'first',
    };
  }
  save.seen = strings(raw.seen).map((id) => LEGACY_CARD_IDS[id] ?? id);
  const converted = !(typeof raw.version === 'number' && raw.version >= GEMS_VERSION) && totalGems(save.gems) > 0 && !save.seen.includes(CHARMS_NOTICE);
  save.pendingNotices = [...new Set([...strings(raw.pendingNotices).filter((id) => !save.seen.includes(id)), ...(converted ? [CHARMS_NOTICE] : [])])];
  const parsed = parseSkills(save, raw, legacyRewards, isKnownSkill);
  return typeof raw.version === 'number' && raw.version >= KIT_WEAPONS_VERSION ? parsed : grantSignatureWeapons(parsed, signatureWeaponOf);
}

/** Migration: owns the signature weapon of every unlocked hero without equipping it or touching what is already owned. */
function grantSignatureWeapons(save: SaveData, signatureWeaponOf: (heroId: string) => string | undefined): SaveData {
  let next = save;
  for (const id of save.heroes.unlocked) {
    const weaponId = signatureWeaponOf(id);
    if (weaponId) next = grantWeapon(next, weaponId, false);
  }
  return next;
}

/** Reads `skills` and `loadout`; saves older than v6 convert unlocked powers and the equipped weapon, and collect the rewards of cleared levels. */
function parseSkills(save: SaveData, raw: Record<string, unknown>, legacyRewards: LegacySkillRewards, isKnown: (id: string) => boolean): SaveData {
  const owned = save.weapons.owned;
  const chosenWeapon = (id: unknown): string => (typeof id === 'string' && owned.includes(id) ? id : STARTING_WEAPON);
  if (!(typeof raw.version === 'number' && raw.version >= SKILLS_VERSION)) {
    const equipped = isRecord(raw.weapons) ? raw.weapons.equipped : undefined;
    let next: SaveData = { ...save, loadout: { weapon: chosenWeapon(equipped), slots: emptySlots() } };
    const powers = isRecord(raw.powers) ? strings(raw.powers.unlocked) : [];
    for (const id of [...powers, ...save.levels.cleared.flatMap((level) => legacyRewards[level] ?? [])]) if (isKnown(id)) next = grantSkill(next, id);
    return next;
  }
  save.skills = { owned: (isRecord(raw.skills) ? parseOwnedSkills(raw.skills.owned) : []).filter((skill) => isKnown(skill.id)) };
  const loadout = isRecord(raw.loadout) ? raw.loadout : {};
  save.loadout = { weapon: chosenWeapon(loadout.weapon), slots: sanitizeSlots(loadout.slots, save.skills.owned.map((s) => s.id)) };
  return save;
}

export const withSettings = (save: SaveData, change: Partial<Settings>): SaveData => ({ ...save, settings: { ...save.settings, ...change } });

export const withMuted = (save: SaveData, muted: boolean): SaveData => ({ ...save, settings: { ...save.settings, muted } });

export const withProgress = (save: SaveData, progress: PlayerProgress): SaveData => ({ ...save, progress });

export const addCoins = (save: SaveData, amount: number): SaveData => ({
  ...save,
  coins: save.coins + Math.max(0, Math.floor(amount)),
});

export const addGem = (save: SaveData, colour: GemColour, amount = 1): SaveData => ({
  ...save,
  gems: { ...save.gems, [colour]: save.gems[colour] + Math.max(0, Math.floor(amount)) },
});

export const dismissNotice = (save: SaveData, id: string): SaveData => ({
  ...save,
  pendingNotices: save.pendingNotices.filter((n) => n !== id),
  seen: save.seen.includes(id) ? save.seen : [...save.seen, id],
});

export const weaponLevel = (save: SaveData, weaponId: string): number => save.weapons.levels[weaponId] ?? 1;

export function grantWeapon(save: SaveData, weaponId: string, equip = true): SaveData {
  const owned = save.weapons.owned.includes(weaponId) ? save.weapons.owned : [...save.weapons.owned, weaponId];
  return { ...save, weapons: { ...save.weapons, owned }, loadout: equip ? { ...save.loadout, weapon: weaponId } : save.loadout };
}

export const equipWeapon = (save: SaveData, weaponId: string): SaveData =>
  save.weapons.owned.includes(weaponId) ? { ...save, loadout: { ...save.loadout, weapon: weaponId } } : save;

export const skillLevel = (save: SaveData, skillId: string): number => save.skills.owned.find((s) => s.id === skillId)?.level ?? 0;

/** Owns a skill at level 1 (no-op if already owned), equipping it into the first empty slot unless `equip` is false or all slots are full. */
export function grantSkill(save: SaveData, skillId: string, equip = true): SaveData {
  if (skillLevel(save, skillId) > 0) return save;
  const skills = { owned: [...save.skills.owned, { id: skillId, level: 1 }] };
  const slot = equip ? firstEmptySlot(save.loadout.slots) : -1;
  const slots = slot >= 0 ? equipInSlot(save.loadout.slots, slot, skillId) : save.loadout.slots;
  return { ...save, skills, loadout: { ...save.loadout, slots } };
}

export const setLoadout = (save: SaveData, loadout: Loadout): SaveData => ({
  ...save,
  loadout: {
    weapon: save.weapons.owned.includes(loadout.weapon) ? loadout.weapon : save.loadout.weapon,
    slots: sanitizeSlots(loadout.slots, save.skills.owned.map((s) => s.id)),
  },
});

/** Puts an owned skill in a slot (swapping if it is equipped elsewhere); unowned ids are ignored. */
export const equipSkillInSlot = (save: SaveData, slot: number, skillId: string): SaveData =>
  skillLevel(save, skillId) > 0 ? { ...save, loadout: { ...save.loadout, slots: equipInSlot(save.loadout.slots, slot, skillId) } } : save;

export const levelMode = (save: SaveData, levelId: string): LevelMode =>
  save.levels.mode[levelId] === 'heroic' && isHeroicUnlocked(levelId, save.levels.cleared) ? 'heroic' : 'normal';

export const setLevelMode = (save: SaveData, levelId: string, mode: LevelMode): SaveData =>
  mode === 'heroic' && !isHeroicUnlocked(levelId, save.levels.cleared) ? save : { ...save, levels: { ...save.levels, mode: { ...save.levels.mode, [levelId]: mode } } };

/** Wears an owned accessory in its own slot, or takes the slot's item off with undefined; anything else is ignored. */
export function wearAccessory(save: SaveData, slot: AccessorySlot, id: string | undefined): SaveData {
  const worn = { ...save.accessories.worn };
  if (id === undefined) delete worn[slot];
  else if (save.accessories.owned.includes(id) && getAccessory(id)?.slot === slot) worn[slot] = id;
  else return save;
  return { ...save, accessories: { ...save.accessories, worn } };
}

/** What a Heroic clear of this level would award right now; undefined once it has been cleared on Heroic. */
export function heroicFirstClearReward(save: SaveData, levelId: string): { gems: Gems; crownId?: string } | undefined {
  if (save.levels.heroic.cleared.includes(levelId)) return undefined;
  const crown = crownFor(levelId);
  return { gems: { ...HEROIC_CLEAR_GEMS }, ...(crown ? { crownId: crown.id } : {}) };
}

function applyHeroicClear(save: SaveData, levelId: string, timeMs: number | undefined): SaveData {
  const reward = heroicFirstClearReward(save, levelId);
  let next = save;
  if (reward) {
    for (const colour of GEM_COLOURS) next = addGem(next, colour, reward.gems[colour]);
    if (reward.crownId) {
      const owned = next.accessories.owned.includes(reward.crownId) ? next.accessories.owned : [...next.accessories.owned, reward.crownId];
      next = { ...next, accessories: { owned, worn: next.accessories.worn } };
      if (next.accessories.worn.head === undefined) next = wearAccessory(next, 'head', reward.crownId);
    }
  }
  const best = next.levels.heroic.bestTimes[levelId];
  const faster = timeMs !== undefined && timeMs > 0 && (best === undefined || timeMs < best);
  return {
    ...next,
    levels: { ...next.levels, heroic: { cleared: next.levels.heroic.cleared.includes(levelId) ? next.levels.heroic.cleared : [...next.levels.heroic.cleared, levelId], bestTimes: faster ? { ...next.levels.heroic.bestTimes, [levelId]: timeMs } : next.levels.heroic.bestTimes } },
  };
}

export interface LevelClear {
  levelId: string;
  rewardWeaponId?: string;
  /** Equip the reward weapon when it is new (default true). */
  equipReward?: boolean;
  rewardSkillIds?: readonly string[];
  timeMs?: number;
  runCoins?: number;
  /** Cleared on the Heroic version: records Heroic progress instead of the normal best time. */
  heroic?: boolean;
}

export function applyLevelClear(save: SaveData, clear: LevelClear): SaveData {
  let next = addCoins(save, clear.runCoins ?? 0);
  if (clear.rewardWeaponId) next = grantWeapon(next, clear.rewardWeaponId, (clear.equipReward ?? true) && !next.weapons.owned.includes(clear.rewardWeaponId));
  for (const id of clear.rewardSkillIds ?? []) next = grantSkill(next, id);
  const cleared = next.levels.cleared.includes(clear.levelId) ? next.levels.cleared : [...next.levels.cleared, clear.levelId];
  const levels: SaveData['levels'] = { ...next.levels, cleared };
  const best = next.levels.bestTimes?.[clear.levelId];
  if (!clear.heroic && clear.timeMs !== undefined && clear.timeMs > 0 && (best === undefined || clear.timeMs < best)) {
    levels.bestTimes = { ...next.levels.bestTimes, [clear.levelId]: clear.timeMs };
  }
  const settled = { ...next, levels, shop: { rotation: next.shop.rotation + 1 } };
  return clear.heroic ? applyHeroicClear(settled, clear.levelId, clear.timeMs) : settled;
}

/** Records a finished Heroic Survival run; only a longer run replaces the best. Never touches level clears. */
export function recordSurvival(save: SaveData, ms: number, wave?: number): { save: SaveData; newBest: boolean } {
  const time = Math.floor(ms);
  if (!(time > save.survival.bestMs)) return { save, newBest: false };
  const bestWave = wave !== undefined && wave > 0 ? { bestWave: Math.floor(wave) } : {};
  return { save: { ...save, survival: { bestMs: time, ...bestWave } }, newBest: true };
}
