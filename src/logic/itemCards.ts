import type { SaveData } from './save';
import { CHARM_POWER_DAMAGE, CHARM_SWIFTNESS_SPEED, CHARM_VITALITY_HP, type CharmId } from './stats';

export interface CardData {
  title: string;
  subtitle: string;
  color: string;
  frame: number;
  tint: number | null;
  lines: string[];
}

export type CardMode = 'always' | 'first';

export const shouldShowCard = (mode: CardMode, seen: readonly string[], id: string): boolean => mode === 'always' || !seen.includes(id);

export const markSeen = (save: SaveData, id: string): SaveData => (save.seen.includes(id) ? save : { ...save, seen: [...save.seen, id] });

const percent = (fraction: number, count: number): number => Math.round(fraction * count * 100);

export function charmCardText(charm: CharmId, count: number): { effect: string; total: string } {
  switch (charm) {
    case 'power':
      return {
        effect: `+${percent(CHARM_POWER_DAMAGE, 1)}% weapon damage. Permanent, stacks.`,
        total: `Power charms: ${count} = +${percent(CHARM_POWER_DAMAGE, count)}% damage`,
      };
    case 'swiftness':
      return {
        effect: `+${percent(CHARM_SWIFTNESS_SPEED, 1)}% move speed. Permanent, stacks.`,
        total: `Swiftness charms: ${count} = +${percent(CHARM_SWIFTNESS_SPEED, count)}% move speed`,
      };
    case 'vitality':
      return {
        effect: `+${CHARM_VITALITY_HP} max HP. Permanent, stacks.`,
        total: `Vitality charms: ${count} = +${CHARM_VITALITY_HP * count} max HP`,
      };
  }
}

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
