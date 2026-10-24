import { defaultSave, parseSave, serialize, type SaveData } from '../logic/save';

export const SAVE_KEY = 'samuels-game-save';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Holds the current save in memory and mirrors it to storage; storage failures are swallowed. */
export class SaveSystem {
  private current: SaveData;

  constructor(private readonly storage: () => StorageLike | undefined = browserStorage) {
    this.current = this.read();
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
      this.storage()?.removeItem(SAVE_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  private read(): SaveData {
    try {
      return parseSave(this.storage()?.getItem(SAVE_KEY));
    } catch {
      return defaultSave();
    }
  }

  private write(): void {
    try {
      this.storage()?.setItem(SAVE_KEY, serialize(this.current));
    } catch {
      /* storage unavailable or full */
    }
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
