import type { SaveData } from './save';
import { GEM_LABEL, type GemColour } from './gems';

export interface CardData {
  title: string;
  subtitle: string;
  color: string;
  frame: number;
  tint: number | null;
  lines: string[];
  /** Texture key to show instead of a Tiny Dungeon frame (skill icons). */
  icon?: string;
  /** Set on the skill swap prompt: the skill waiting for a slot. */
  skillId?: string;
}

export type CardMode = 'always' | 'first';

export const shouldShowCard = (mode: CardMode, seen: readonly string[], id: string): boolean => mode === 'always' || !seen.includes(id);

export const markSeen = (save: SaveData, id: string): SaveData => (save.seen.includes(id) ? save : { ...save, seen: [...save.seen, id] });

export const gemCardText = (colour: GemColour, count: number): { effect: string; total: string } => ({
  effect: 'Spend at the Camp to upgrade skills and weapons.',
  total: `${GEM_LABEL[colour]} gems: ${count}`,
});

export const shouldQueueCard = (mode: CardMode, seen: readonly string[], queued: readonly string[], id: string): boolean =>
  mode === 'always' || (!seen.includes(id) && !queued.includes(id));

export class CardQueue<T extends { id: string }> {
  private items: T[] = [];

  get ids(): string[] {
    return this.items.map((item) => item.id);
  }

  push(item: T): void {
    this.items.push(item);
  }

  shift(): T | undefined {
    return this.items.shift();
  }

  clear(): void {
    this.items = [];
  }
}
