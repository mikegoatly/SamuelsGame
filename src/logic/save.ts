import { MAX_LEVEL, type PlayerProgress } from './progression';
import { xpToNextLevel } from './xp';
import { noCharms, type CharmId, type Charms } from './stats';

import type { CardMode } from './itemCards';

/** v5: `seen` item ids + `itemCards` setting. v2: added `settings`; v3: added `powers`; v4: volumes + reduceShake. Older saves load through the same tolerant parse. */
export const SAVE_VERSION = 5;
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

export interface SaveData {
  version: typeof SAVE_VERSION;
  progress: PlayerProgress;
  coins: number;
  charms: Charms;
  weapons: { owned: string[]; equipped: string };
  levels: { cleared: string[]; bestTimes?: Record<string, number> };
  settings: Settings;
  powers: { unlocked: string[] };
  /** Item/event ids whose card the player has already seen. */
  seen: string[];
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    progress: { level: 1, xp: 0 },
    coins: 0,
    charms: noCharms(),
    weapons: { owned: [STARTING_WEAPON], equipped: STARTING_WEAPON },
    levels: { cleared: [] },
    settings: defaultSettings(),
    powers: { unlocked: [] },
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

/** Tolerant: junk, partial or old data falls back to defaults field by field; never throws. */
export function parseSave(json: string | null | undefined): SaveData {
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
  if (isRecord(raw.charms)) {
    for (const id of Object.keys(save.charms) as CharmId[]) save.charms[id] = wholeNumber(raw.charms[id], 0);
  }
  if (isRecord(raw.weapons)) {
    const owned = strings(raw.weapons.owned);
    if (!owned.includes(STARTING_WEAPON)) owned.unshift(STARTING_WEAPON);
    const equipped = raw.weapons.equipped;
    save.weapons = { owned, equipped: typeof equipped === 'string' && owned.includes(equipped) ? equipped : STARTING_WEAPON };
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
  if (isRecord(raw.powers)) save.powers = { unlocked: strings(raw.powers.unlocked) };
  save.seen = strings(raw.seen);
  return save;
}

export const withSettings = (save: SaveData, change: Partial<Settings>): SaveData => ({ ...save, settings: { ...save.settings, ...change } });

export const withMuted = (save: SaveData, muted: boolean): SaveData => ({ ...save, settings: { ...save.settings, muted } });

export const withProgress = (save: SaveData, progress: PlayerProgress): SaveData => ({ ...save, progress });

export const addCoins = (save: SaveData, amount: number): SaveData => ({
  ...save,
  coins: save.coins + Math.max(0, Math.floor(amount)),
});

export const addCharm = (save: SaveData, id: CharmId): SaveData => ({
  ...save,
  charms: { ...save.charms, [id]: save.charms[id] + 1 },
});

export function grantWeapon(save: SaveData, weaponId: string, equip = true): SaveData {
  const owned = save.weapons.owned.includes(weaponId) ? save.weapons.owned : [...save.weapons.owned, weaponId];
  return { ...save, weapons: { owned, equipped: equip ? weaponId : save.weapons.equipped } };
}

export const equipWeapon = (save: SaveData, weaponId: string): SaveData =>
  save.weapons.owned.includes(weaponId) ? { ...save, weapons: { ...save.weapons, equipped: weaponId } } : save;

export function unlockPower(save: SaveData, powerId: string): SaveData {
  if (save.powers.unlocked.includes(powerId)) return save;
  return { ...save, powers: { unlocked: [...save.powers.unlocked, powerId] } };
}

export interface LevelClear {
  levelId: string;
  rewardWeaponId?: string;
  rewardPowerId?: string;
  timeMs?: number;
  runCoins?: number;
}

export function applyLevelClear(save: SaveData, clear: LevelClear): SaveData {
  let next = addCoins(save, clear.runCoins ?? 0);
  if (clear.rewardWeaponId) next = grantWeapon(next, clear.rewardWeaponId, !next.weapons.owned.includes(clear.rewardWeaponId));
  if (clear.rewardPowerId) next = unlockPower(next, clear.rewardPowerId);
  const cleared = next.levels.cleared.includes(clear.levelId) ? next.levels.cleared : [...next.levels.cleared, clear.levelId];
  const levels: SaveData['levels'] = { ...next.levels, cleared };
  const best = next.levels.bestTimes?.[clear.levelId];
  if (clear.timeMs !== undefined && clear.timeMs > 0 && (best === undefined || clear.timeMs < best)) {
    levels.bestTimes = { ...next.levels.bestTimes, [clear.levelId]: clear.timeMs };
  }
  return { ...next, levels };
}
