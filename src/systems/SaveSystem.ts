import { levels } from '../content/levels';
import { heroes } from '../content/heroes';
import { getSkill } from '../content/skills';
import { defaultSave, parseSave, serialize, type LegacySkillRewards, type SaveData } from '../logic/save';
import { ACTIVE_SLOT_KEY, isValidSlot, parseActiveSlot, slotKey, SLOT_COUNT, summarizeSlot, type SlotSummary } from '../logic/saveSlots';

/** Slot 1's key: the save that existed before slots. */
export const SAVE_KEY = slotKey(1);

/** Skill rewards of every level, so saves from before skills existed receive them for levels already cleared. */
const LEGACY_REWARDS: LegacySkillRewards = Object.fromEntries(levels.filter((l) => l.rewardSkillIds).map((l) => [l.id, l.rewardSkillIds!]));

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Holds the current save in memory and mirrors it to storage; storage failures are swallowed. */
export class SaveSystem {
  private current: SaveData;
  private slot = 1;

  constructor(private readonly storage: () => StorageLike | undefined = browserStorage) {
    this.slot = this.readActiveSlot();
    this.current = this.read();
  }

  get activeSlot(): number {
    return this.slot;
  }

  /** What a slot holds, read without switching; null when nothing usable is stored there. */
  peek(slot: number): SaveData | null {
    if (slot === this.slot) return this.current;
    if (!isValidSlot(slot)) return null;
    try {
      const raw = this.storage()?.getItem(slotKey(slot));
      return raw ? this.parseStored(raw, true) : null;
    } catch {
      return null;
    }
  }

  slotSummaries(): SlotSummary[] {
    return Array.from({ length: SLOT_COUNT }, (_, i) => summarizeSlot(this.peek(i + 1)));
  }

  /**
   * Saves the current slot, then loads another (a fresh game if it is empty) carrying over this device's settings.
   * Nothing is ever deleted; returns false if the target could not be read.
   */
  switchTo(slot: number): boolean {
    if (!isValidSlot(slot)) return false;
    if (slot === this.slot) return true;
    let raw: string | null | undefined;
    try {
      raw = this.storage()?.getItem(slotKey(slot));
    } catch {
      return false;
    }
    this.write();
    const { settings } = this.current;
    const loaded = raw ? this.parseStored(raw, false) : defaultSave();
    this.slot = slot;
    this.current = { ...loaded, settings };
    try {
      this.storage()?.setItem(ACTIVE_SLOT_KEY, String(slot));
    } catch {
      /* storage unavailable */
    }
    this.write();
    return true;
  }

  get data(): SaveData {
    return this.current;
  }

  update(change: (save: SaveData) => SaveData): SaveData {
    this.current = change(this.current);
    this.write();
    return this.current;
  }

  reset(): void {
    this.current = defaultSave();
    try {
      this.storage()?.removeItem(slotKey(this.slot));
    } catch {
      /* storage unavailable */
    }
  }

  private read(): SaveData {
    try {
      return this.parseStored(this.storage()?.getItem(slotKey(this.slot)), false);
    } catch {
      return defaultSave();
    }
  }

  private readActiveSlot(): number {
    try {
      return parseActiveSlot(this.storage()?.getItem(ACTIVE_SLOT_KEY));
    } catch {
      return 1;
    }
  }

  /** With `strict`, anything that is not a JSON object counts as no save (null). */
  private parseStored(raw: string | null | undefined, strict: true): SaveData | null;
  private parseStored(raw: string | null | undefined, strict: false): SaveData;
  private parseStored(raw: string | null | undefined, strict: boolean): SaveData | null {
    if (strict && !isJsonObject(raw)) return null;
    return parseSave(raw, LEGACY_REWARDS, (id) => getSkill(id) !== undefined, (id) => heroes[id] !== undefined);
  }

  private write(): void {
    try {
      this.storage()?.setItem(slotKey(this.slot), serialize(this.current));
    } catch {
      /* storage unavailable or full */
    }
  }
}

function isJsonObject(raw: string | null | undefined): boolean {
  try {
    const value: unknown = JSON.parse(raw ?? '');
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function browserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export const saveSystem = new SaveSystem();
