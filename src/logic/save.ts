import { MAX_LEVEL, type PlayerProgress } from './progression';
import { xpToNextLevel } from './xp';
import { CHARM_TO_GEM, GEM_COLOURS, LEGACY_CARD_IDS, noGems, totalGems, type GemColour, type Gems } from './gems';

import type { CardMode } from './itemCards';
import { emptySlots, equipInSlot, firstEmptySlot, sanitizeSlots, type Loadout } from './loadout';

/** v7: `gems` replace `charms`; `potions`, `revive`, `shop`, `weapons.levels` added. v6: `skills` + `loadout` replace `powers` and `weapons.equipped`. v5: `seen` + `itemCards`; v4: volumes + reduceShake; v2: `settings`. Older saves load through the same tolerant parse. */
export const SAVE_VERSION = 7;
/** First version whose skills and loadout need no conversion from powers. */
const SKILLS_VERSION = 6;
export const MAX_SKILL_LEVEL = 5;
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
  levels: { cleared: string[]; bestTimes?: Record<string, number> };
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
    levels: { cleared: [] },
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
  const modern = typeof raw.version === 'number' && raw.version >= SAVE_VERSION;
  const source = modern ? raw.gems : raw.charms;
  if (!isRecord(source)) return gems;
  if (modern) for (const colour of GEM_COLOURS) gems[colour] = wholeNumber(source[colour], 0);
  else for (const [charm, colour] of Object.entries(CHARM_TO_GEM)) gems[colour] = wholeNumber(source[charm], 0);
  return gems;
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
export function parseSave(json: string | null | undefined, legacyRewards: LegacySkillRewards = {}, isKnownSkill: (id: string) => boolean = () => true): SaveData {
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
    if (isRecord(raw.levels.bestTimes)) {
      const times: Record<string, number> = {};
      for (const [id, value] of Object.entries(raw.levels.bestTimes)) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) times[id] = value;
      }
      save.levels.bestTimes = times;
    }
  }
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
  const converted = !(typeof raw.version === 'number' && raw.version >= SAVE_VERSION) && totalGems(save.gems) > 0 && !save.seen.includes(CHARMS_NOTICE);
  save.pendingNotices = [...new Set([...strings(raw.pendingNotices).filter((id) => !save.seen.includes(id)), ...(converted ? [CHARMS_NOTICE] : [])])];
  return parseSkills(save, raw, legacyRewards, isKnownSkill);
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

export interface LevelClear {
  levelId: string;
  rewardWeaponId?: string;
  rewardSkillIds?: readonly string[];
  timeMs?: number;
  runCoins?: number;
}

export function applyLevelClear(save: SaveData, clear: LevelClear): SaveData {
  let next = addCoins(save, clear.runCoins ?? 0);
  if (clear.rewardWeaponId) next = grantWeapon(next, clear.rewardWeaponId, !next.weapons.owned.includes(clear.rewardWeaponId));
  for (const id of clear.rewardSkillIds ?? []) next = grantSkill(next, id);
  const cleared = next.levels.cleared.includes(clear.levelId) ? next.levels.cleared : [...next.levels.cleared, clear.levelId];
  const levels: SaveData['levels'] = { ...next.levels, cleared };
  const best = next.levels.bestTimes?.[clear.levelId];
  if (clear.timeMs !== undefined && clear.timeMs > 0 && (best === undefined || clear.timeMs < best)) {
    levels.bestTimes = { ...next.levels.bestTimes, [clear.levelId]: clear.timeMs };
  }
  return { ...next, levels, shop: { rotation: next.shop.rotation + 1 } };
}
