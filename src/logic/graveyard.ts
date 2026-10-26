import type { Point } from './geometry';

export interface Corpse extends Point {
  key: number;
  enemyId: string;
  level: number;
  at: number;
}

/** Where monsters fell, so a necromancer can raise each one once. */
export class Graveyard {
  private readonly corpses = new Map<number, Corpse>();
  private readonly spent = new Set<number>();

  constructor(private readonly lifetimeMs: number) {}

  record(corpse: Corpse): void {
    if (!this.spent.has(corpse.key)) this.corpses.set(corpse.key, corpse);
  }

  raise(key: number): void {
    this.corpses.delete(key);
    this.spent.add(key);
  }

  /** The closest corpse within `range` that has not rotted away. */
  nearest(from: Point, range: number, now: number): Corpse | null {
    let best: Corpse | null = null;
    let bestDistance = range;
    for (const corpse of this.corpses.values()) {
      if (now - corpse.at > this.lifetimeMs) continue;
      const distance = Math.hypot(corpse.x - from.x, corpse.y - from.y);
      if (distance <= bestDistance) {
        best = corpse;
        bestDistance = distance;
      }
    }
    return best;
  }

  clear(): void {
    this.corpses.clear();
  }
}
