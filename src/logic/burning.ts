import { DotTracker } from './dot';

/** Burning, the shared fire status: a small tick on a steady beat that refreshes (never stacks) when the fire is renewed. */
export const BURN = {
  tickMs: 500,
  /** How long a monster burns after the last time it was lit. */
  enemyMs: 3000,
  /** How long the hero burns: shorter, so fire stays a scare and not a punishment. */
  playerMs: 2000,
  /** A weapon's burn tick is this share of its hit (six ticks while a monster burns, so a javelin gains about 90% more on a lone target). */
  weaponTickScale: 0.15,
  /** The hero's burn tick, as a share of max health. Gentle: no knockback, i-frames, shake or rumble. */
  playerFraction: 0.01,
  /** A monster's burn tick after leaving a fire pit, as a share of its max health (the pit's own tick, 0.06, only applies while it stands in it). */
  pitEnemyFraction: 0.03,
} as const;

/** What one burn tick does to a monster: a share of the weapon's hit, or a share of the monster's max health (fire pits). */
export type BurnPower = { weapon: number } | { fraction: number };

/** Base damage (before level scaling) of one burn tick from a weapon hit of `weaponDamage`. */
export const weaponBurnTick = (weaponDamage: number): number => weaponDamage * BURN.weaponTickScale;

/** Total burn ticks an uninterrupted burn delivers. */
export const burnTicks = (durationMs: number): number => Math.floor(durationMs / BURN.tickMs);

export interface BurnStep<K, P> {
  ticks: { key: K; power: P }[];
  /** Burns that stopped this step: expired, extinguished by the run ending, or the target is gone. */
  ended: K[];
}

/** Who is on fire and how hard it burns. Built on DotTracker: lighting a burning target again only refreshes the time (and takes the newer power). */
export class Burning<K, P = BurnPower> {
  private readonly dot = new DotTracker<K>();
  private readonly power = new Map<K, P>();
  private readonly result: BurnStep<K, P> = { ticks: [], ended: [] };

  ignite(key: K, now: number, durationMs: number, power: P): void {
    this.dot.apply(key, now, durationMs, BURN.tickMs);
    this.power.set(key, power);
  }

  burning(key: K): boolean {
    return this.dot.active(key);
  }

  get any(): boolean {
    return this.dot.hasEntries();
  }

  /** Who is burning now; do not ignite or extinguish while looping over it. */
  keys(): IterableIterator<K> {
    return this.power.keys();
  }

  extinguish(key: K): boolean {
    const was = this.dot.active(key);
    this.dot.remove(key);
    this.power.delete(key);
    return was;
  }

  /** Ticks due at `now`. Nothing ticks while `locked` (the run is over) or for a target that `alive` rejects, so a dead monster is never paid for twice. The result's arrays are reused: read them before the next step. */
  step(now: number, locked = false, alive?: (key: K) => boolean): BurnStep<K, P> {
    const { ticks, ended } = this.result;
    ticks.length = 0;
    ended.length = 0;
    if (locked) {
      for (const key of this.power.keys()) ended.push(key);
      this.dot.clear();
      this.power.clear();
      return this.result;
    }
    if (alive) {
      for (const key of this.power.keys()) if (!alive(key)) ended.push(key);
      for (const key of ended) this.extinguish(key);
    }
    for (const key of this.dot.due(now)) ticks.push({ key, power: this.power.get(key)! });
    for (const key of this.power.keys()) {
      if (this.dot.active(key)) continue;
      ended.push(key);
      this.power.delete(key);
    }
    return this.result;
  }
}

/** A burn tick owed to the hero that has not landed yet (dash or i-frames swallowed it): it is retried until it lands, and forgotten if the hero dies or the burn ends first. */
export class OwedTick {
  private owed = false;

  get pending(): boolean {
    return this.owed;
  }

  /** New ticks came due. */
  add(due: number): void {
    if (due > 0) this.owed = true;
  }

  /** Tries to land the owed tick;  returns true when it landed. Nothing is paid once . */
  pay(dead: boolean, attempt: () => boolean): void {
    if (!this.owed) return;
    if (dead || attempt()) this.owed = false;
  }

  clear(): void {
    this.owed = false;
  }
}
