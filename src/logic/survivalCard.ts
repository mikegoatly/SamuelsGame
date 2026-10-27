import { formatTime } from './format';

export interface SurvivalRequirement {
  id: string;
  name: string;
}

export interface SurvivalCardLines {
  /** Three lines under the level name. */
  lines: [string, string, string];
  unlocked: boolean;
}

/** What the Survival level card says: how far from unlocking, or the best time so far. */
export function survivalCardLines(required: readonly SurvivalRequirement[], heroicCleared: readonly string[], bestMs: number): SurvivalCardLines {
  const missing = required.filter((r) => !heroicCleared.includes(r.id));
  if (missing.length > 0) {
    const done = required.length - missing.length;
    return { unlocked: false, lines: [`Clear on Heroic: ${done}/${required.length}`, `Still to do: ${missing.map((r) => r.name).join(', ')}`, 'Locked'] };
  }
  return { unlocked: true, lines: ['How long can you survive?', 'Monsters match your level', bestMs > 0 ? `Best ${formatTime(bestMs)}` : 'No time yet'] };
}
