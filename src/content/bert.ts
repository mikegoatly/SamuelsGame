import { Tex } from './assetKeys';
import type { EnemyDef } from './enemies';
import type { BertBrainConfig } from '../logic/bertBrain';
import { PLATE } from '../logic/bertPlates';

/** Bert the Crystal Golem (Crystal Mines boss): see logic/bertBrain, bertPlates, bertRoll, bounceRay and entities/Bert. */
export const bertBrain: BertBrainConfig = {
  phaseAt: [0.6, 0.25],
  stunMs: 3000,
  uncurlMs: 900,
  breatherMs: 1000,
  phases: {
    1: {
      speedMultiplier: 1,
      attacks: [
        { kind: 'slam', firstMs: 3000, cooldownMs: 3800, telegraphMs: 1000, radius: 52 },
        { kind: 'toss', firstMs: 6000, cooldownMs: 6000, telegraphMs: 1000, radius: 26, count: 1 },
      ],
    },
    2: {
      speedMultiplier: 1.15,
      attacks: [
        { kind: 'roll', firstMs: 2500, cooldownMs: 3000, windupMs: 1200, bounces: 3, speed: 170, maxMs: 9000 },
        { kind: 'slam', firstMs: 6500, cooldownMs: 7000, telegraphMs: 900, radius: 52 },
      ],
    },
    3: {
      speedMultiplier: 1.25,
      attacks: [
        { kind: 'laser', firstMs: 2500, cooldownMs: 4200, windupMs: 1400, fireMs: 350, bounces: 1, volleys: 2, followUpWindupMs: 1000 },
        { kind: 'roll', firstMs: 9000, cooldownMs: 11_000, windupMs: 1200, bounces: 2, speed: 180, maxMs: 8000 },
      ],
    },
  },
};

/** Numbers the brain does not own: how the fight's props and damage rules behave. */
export const bertTuning = {
  /** A rolling ball shrugs off half a hit; a dazed Bert takes double (the numbers live in logic/bertPlates). */
  rollingArmour: PLATE.rolling,
  dazedBonus: PLATE.dazed,
  pillarCount: 4,
  pillarRadius: 9,
  /** Walls bounce Bert when his edge reaches them: the arena circle is the boss room's inscribed circle, minus this. */
  arenaMargin: 14,
  bodyRadius: 12,
  laserDamage: 14,
  laserWidth: 8,
  /** Crystal spikes regrow in phase 3 up to this many, one per `spikeEveryMs`. */
  spikeMax: 3,
  spikeEveryMs: 4000,
  spikeRadius: 6,
  spikeStunMs: 2200,
} as const;

export const bert: EnemyDef = {
  id: 'bert',
  name: 'Bert the Golem',
  frame: 0,
  texture: Tex.bert,
  textureFrame: 0,
  baseHp: 1700,
  baseDamage: 18,
  speed: 30,
  behaviour: 'boss',
  lootTableId: 'bert',
  scale: 1.5,
  boss: true,
  barTicks: [0.6, 0.25],
  slamDamage: 18,
  boltDamage: 11,
  boltSpeed: 80,
  tip: 'Knock his shiny plates off, then make Bert crash into the pillars!',
};

export const bertBoss: EnemyDef[] = [bert];

/** The line on the results screen after beating a boss with a gentle ending (undefined for every other boss). */
export function bossEpilogue(bossId: string | undefined, heroId: string): string | undefined {
  if (bossId !== 'bert') return undefined;
  return heroId === 'nab' ? 'Bert is happy again: you gave back his heart crystal. Sorry, Bert!' : 'Bert is happy again: Nab gave back his heart crystal.';
}

/** The floating text where a boss falls ("defeated" would be unkind to Bert). */
export const bossDefeatedLine = (bossId: string | undefined, name: string | undefined): string => (bossId === 'bert' ? 'Bert is happy again!' : `${name ?? 'Boss'} defeated!`);
