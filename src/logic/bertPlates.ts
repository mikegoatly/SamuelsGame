import type { BertMode } from './bertBrain';

/** Bert's four crystal plates: which side a blow lands on, how much it hurts him, and when a plate breaks. */
export type PlateSide = 'front' | 'back' | 'left' | 'right';

export const BERT_PLATES: readonly PlateSide[] = ['front', 'back', 'left', 'right'];

/** Bert is drawn facing the camera: the front plate is his belly (south), the back plate his crest (north), left and right are screen sides. */
export const PLATE = {
  /** Share of Bert's health each plate can soak. */
  hpShare: 0.05,
  /** A blow on a plated side hurts him this much. */
  armoured: 0.25,
  /** Each broken plate adds this much speed. */
  speedPerPlate: 0.12,
  /** Damage-over-time ticks have no side: any plate left halves them. */
  tick: 0.5,
  /** A curled-up ball shrugs most of a blow off. */
  rolling: 0.5,
  /** A dazed Bert takes double. */
  dazed: 2,
} as const;

export interface Plates {
  /** Remaining health per side; 0 is broken. */
  hp: Record<PlateSide, number>;
}

export const newPlates = (bertMaxHp: number): Plates => {
  const hp = Math.max(1, Math.round(bertMaxHp * PLATE.hpShare));
  return { hp: { front: hp, back: hp, left: hp, right: hp } };
};

export const dropPlates = (_plates: Plates): Plates => ({ hp: { front: 0, back: 0, left: 0, right: 0 } });

export const brokenPlates = (plates: Plates): number => BERT_PLATES.filter((side) => plates.hp[side] <= 0).length;

export const speedWithPlates = (broken: number): number => 1 + PLATE.speedPerPlate * broken;

/** The side a blow lands on, from the vector Bert-to-attacker in screen coordinates (y grows downward). Ties go to front/back. */
export function plateSideOf(dx: number, dy: number): PlateSide {
  if (Math.abs(dy) >= Math.abs(dx)) return dy >= 0 ? 'front' : 'back';
  return dx < 0 ? 'left' : 'right';
}

export interface PlateStrike {
  plates: Plates;
  /** What actually reaches Bert's health. */
  bertDamage: number;
  /** True when this blow broke the plate. */
  broke: boolean;
}

/** A blow on `side`: a whole plate soaks it (and Bert only feels a fraction), a bare side takes it all. */
export function strikePlates(plates: Plates, side: PlateSide, amount: number): PlateStrike {
  const remaining = plates.hp[side];
  if (remaining <= 0) return { plates, bertDamage: amount, broke: false };
  const left = Math.max(0, remaining - amount);
  return {
    plates: { hp: { ...plates.hp, [side]: left } },
    bertDamage: Math.max(1, Math.round(amount * PLATE.armoured)),
    broke: left === 0,
  };
}

export interface ArmourResult {
  /** What reaches Bert's health. */
  damage: number;
  plates: Plates;
  /** A plate soaked the blow. */
  plated: boolean;
  /** This blow broke a plate. */
  broke: boolean;
}

/**
 * Every source of damage goes through here. `side` is the plate a blow lands on, or null for a damage-over-time tick (which has no side).
 * A curled-up ball and a dazed Bert ignore the plates; otherwise a whole plate soaks a blow, and any whole plate halves a tick.
 */
export function damageAfterArmour(mode: BertMode, plates: Plates, side: PlateSide | null, amount: number): ArmourResult {
  const plain = (damage: number): ArmourResult => ({ damage: Math.max(1, Math.round(damage)), plates, plated: false, broke: false });
  if (mode === 'rolling' || mode === 'rollWindup') return plain(amount * PLATE.rolling);
  if (mode === 'stunned') return plain(amount * PLATE.dazed);
  if (side === null) return brokenPlates(plates) < BERT_PLATES.length ? plain(amount * PLATE.tick) : plain(amount);
  if (plates.hp[side] <= 0) return plain(amount);
  const strike = strikePlates(plates, side, amount);
  return { damage: strike.bertDamage, plates: strike.plates, plated: true, broke: strike.broke };
}
