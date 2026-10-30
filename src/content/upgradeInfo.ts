import type { GemColour } from '../logic/gems';
import type { SkillTier } from '../logic/shop';

export interface UpgradeInfo {
  /** Gem colour every level of this item costs. */
  gem: GemColour;
  /** Tier 1..3: scales upgrade gold and the shop price. */
  tier: SkillTier;
  /** What level 5 unlocks. */
  twist: string;
}

/** Offence is red (Power), utility and mobility green (Swiftness), defence and support blue (Vitality). */
export const skillUpgradeInfo: Readonly<Record<string, UpgradeInfo>> = {
  fireball: { gem: 'red', tier: 1, twist: 'Splits into 3 mini-fireballs' },
  frostNova: { gem: 'blue', tier: 1, twist: 'Freezes enemies solid' },
  chainLightning: { gem: 'red', tier: 2, twist: 'Each jump leaves a static field' },
  arcaneShield: { gem: 'blue', tier: 2, twist: 'Bursts outward when it ends' },
  blinkStrike: { gem: 'green', tier: 2, twist: 'Leaves a damaging afterimage' },
  boomerangBlade: { gem: 'red', tier: 1, twist: 'Two blades fly in a V' },
  poisonCloud: { gem: 'green', tier: 2, twist: 'The cloud follows you' },
  spiritWolf: { gem: 'blue', tier: 3, twist: 'Summons two wolves' },
  meteor: { gem: 'red', tier: 3, twist: 'Leaves burning ground' },
  gravityWell: { gem: 'green', tier: 3, twist: 'Collapses with an explosion' },
  bertsPebble: { gem: 'blue', tier: 2, twist: 'A second pebble joins in' },
};

export const weaponUpgradeInfo: Readonly<Record<string, UpgradeInfo>> = {
  apprenticeStaff: { gem: 'red', tier: 1, twist: 'Bolts pierce 1 enemy' },
  brokenWand: { gem: 'red', tier: 2, twist: 'Bolts split in two on hit' },
  ironSword: { gem: 'red', tier: 2, twist: 'Stabs become a wide swipe' },
  goldenSword: { gem: 'red', tier: 3, twist: 'Swings send out a slash wave' },
  twinDaggers: { gem: 'green', tier: 2, twist: 'Every 4th swing throws a dagger' },
  hammer: { gem: 'red', tier: 2, twist: 'Slams send a shockwave ring' },
  bow: { gem: 'green', tier: 2, twist: 'Full draws loose 3 arrows' },
  fists: { gem: 'blue', tier: 2, twist: 'The 3rd punch sends a force wave' },
  sludgeSlinger: { gem: 'green', tier: 3, twist: 'Puddles also poison' },
  boneStaff: { gem: 'blue', tier: 2, twist: 'Crescent kills may rise as skeletons' },
  javelin: { gem: 'red', tier: 3, twist: 'The stuck javelin bursts' },
  crystalScepter: { gem: 'blue', tier: 2, twist: 'Shatter shards can encase too' },
};

export const TIER_MULTIPLIER: Record<SkillTier, number> = { 1: 1, 2: 1.25, 3: 1.5 };

export const upgradeInfoFor = (kind: 'skill' | 'weapon', id: string): UpgradeInfo | undefined =>
  (kind === 'skill' ? skillUpgradeInfo : weaponUpgradeInfo)[id];
