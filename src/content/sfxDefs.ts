export interface SfxDef {
  /** Files under assets/audio; one is picked per play, never the same twice in a row. */
  files: readonly string[];
  volume: number;
  rate?: number;
  /** +- fraction of random pitch variation. */
  jitter?: number;
  /** Ignore repeats sooner than this (many enemies dying at once). */
  minGapMs?: number;
}

const variants = (name: string, count: number): string[] => Array.from({ length: count }, (_, i) => `${name}_${i}.ogg`);

export const SFX_DEFS = {
  shoot: { files: variants('shoot', 3), volume: 0.3, jitter: 0.08, minGapMs: 40 },
  fireballCast: { files: variants('fireball', 2), volume: 0.5, jitter: 0.05 },
  explosion: { files: variants('explosion', 2), volume: 0.55, jitter: 0.06 },
  frostNova: { files: variants('frostnova', 2), volume: 0.55, jitter: 0.05 },
  zap: { files: variants('zap', 2), volume: 0.4, rate: 1.2, jitter: 0.08, minGapMs: 45 },
  shieldUp: { files: ['shield_0.ogg'], volume: 0.5 },
  shieldHit: { files: variants('shieldhit', 2), volume: 0.4, jitter: 0.1, minGapMs: 60 },
  shieldBreak: { files: ['shieldbreak_0.ogg'], volume: 0.55 },
  blink: { files: variants('blink', 2), volume: 0.45, rate: 1.3, jitter: 0.05 },
  poison: { files: variants('poison', 2), volume: 0.5, jitter: 0.06 },
  gravity: { files: variants('gravity', 2), volume: 0.5, jitter: 0.04 },
  meteorFall: { files: ['meteorfall_0.ogg'], volume: 0.4 },
  meteorHit: { files: variants('meteorhit', 2), volume: 0.7, jitter: 0.04 },
  wolfSummon: { files: ['wolf_0.ogg'], volume: 0.5, rate: 0.6 },
  wolfBite: { files: ['wolfbite_0.ogg'], volume: 0.3, rate: 1.5, jitter: 0.1, minGapMs: 80 },
  swing: { files: variants('swing', 2), volume: 0.45, jitter: 0.1 },
  swordHit: { files: variants('swordhit', 2), volume: 0.5, jitter: 0.08, minGapMs: 40 },
  enemyHit: { files: variants('enemyhit', 3), volume: 0.4, jitter: 0.1, minGapMs: 35 },
  enemyDie: { files: variants('enemydie', 2), volume: 0.5, jitter: 0.1, minGapMs: 60 },
  enemyShot: { files: variants('enemyshot', 2), volume: 0.18, rate: 0.7, jitter: 0.08, minGapMs: 50 },
  slam: { files: variants('slam', 2), volume: 0.65, jitter: 0.05 },
  hurt: { files: variants('hurt', 2), volume: 0.6, rate: 0.85, jitter: 0.05 },
  coin: { files: variants('coin', 2), volume: 0.4, jitter: 0.08, minGapMs: 50 },
  potion: { files: variants('potion', 2), volume: 0.5, jitter: 0.05 },
  charm: { files: variants('charm', 2), volume: 0.55 },
  levelUp: { files: ['levelup.ogg'], volume: 0.6 },
  doorClose: { files: variants('doorclose', 2), volume: 0.6, jitter: 0.05 },
  doorOpen: { files: variants('dooropen', 2), volume: 0.5, jitter: 0.05 },
  bossRoar: { files: ['bossroar.ogg'], volume: 0.7, minGapMs: 1500 },
  bossPhase: { files: ['bossphase.ogg'], volume: 0.7 },
  uiMove: { files: variants('uimove', 2), volume: 0.35, jitter: 0.05, minGapMs: 30 },
  uiConfirm: { files: ['uiconfirm.ogg'], volume: 0.5 },
  uiBack: { files: variants('uiback', 2), volume: 0.45 },
  fuse: { files: variants('enemyshot', 2), volume: 0.3, rate: 1.9, minGapMs: 120 },
  bombBlast: { files: variants('explosion', 2), volume: 0.5, rate: 0.9, jitter: 0.06, minGapMs: 40 },
  burrow: { files: variants('slam', 2), volume: 0.35, rate: 0.7, jitter: 0.05, minGapMs: 120 },
  wind: { files: variants('gravity', 2), volume: 0.3, rate: 1.4, jitter: 0.06, minGapMs: 300 },
  heal: { files: variants('potion', 2), volume: 0.35, rate: 1.3, minGapMs: 150 },
  mirror: { files: variants('shieldhit', 2), volume: 0.5, rate: 1.5, jitter: 0.05, minGapMs: 60 },
  confetti: { files: variants('charm', 2), volume: 0.4, rate: 1.4, jitter: 0.08, minGapMs: 120 },
  stoneWake: { files: variants('slam', 2), volume: 0.5, rate: 0.6, minGapMs: 120 },
  beam: { files: variants('zap', 2), volume: 0.25, rate: 0.7, jitter: 0.05, minGapMs: 250 },
  howl: { files: ['wolf_0.ogg'], volume: 0.45, rate: 1.1, minGapMs: 800 },
  raise: { files: variants('poison', 2), volume: 0.45, rate: 0.7, minGapMs: 200 },
  eliteSpawn: { files: ['bossphase.ogg'], volume: 0.3, rate: 1.4, minGapMs: 400 },
  spawnMark: { files: ['gravity_0.ogg'], volume: 0.22, rate: 1.7, jitter: 0.06, minGapMs: 180 },
  victory: { files: ['victory.ogg'], volume: 0.7 },
  crack: { files: ['swordhit_0.ogg'], volume: 0.5, rate: 0.5, jitter: 0.08, minGapMs: 120 },
  pitFall: { files: ['slam_0.ogg'], volume: 0.5, rate: 0.55, minGapMs: 150 },
  rubbleWarn: { files: ['meteorfall_0.ogg'], volume: 0.22, rate: 1.5, jitter: 0.1, minGapMs: 250 },
  rubbleHit: { files: variants('meteorhit', 2), volume: 0.4, rate: 1.3, jitter: 0.08, minGapMs: 80 },
  gasHiss: { files: variants('poison', 2), volume: 0.3, rate: 1.6, jitter: 0.08, minGapMs: 500 },
  flameJet: { files: ['fireball_0.ogg'], volume: 0.35, rate: 0.7, jitter: 0.06, minGapMs: 200 },
  windGust: { files: ['gravity_1.ogg'], volume: 0.35, rate: 1.7, minGapMs: 800 },
  sandRise: { files: ['gravity_0.ogg'], volume: 0.3, rate: 0.5, minGapMs: 1500 },
  plateClick: { files: ['uimove_0.ogg'], volume: 0.6, rate: 0.55 },
  arrowShot: { files: variants('shoot', 3), volume: 0.25, rate: 1.6, jitter: 0.06, minGapMs: 60 },
  drip: { files: ['potion_0.ogg'], volume: 0.18, rate: 2.2, jitter: 0.12, minGapMs: 1500 },
  croak: { files: variants('croak', 2), volume: 0.4, jitter: 0.08, minGapMs: 250 },
  snap: { files: variants('snap', 2), volume: 0.5, jitter: 0.06, minGapMs: 120 },
  gurgle: { files: variants('gurgle', 2), volume: 0.45, jitter: 0.05, minGapMs: 1500 },
  splash: { files: variants('splash', 2), volume: 0.4, jitter: 0.08, minGapMs: 100 },
  squelch: { files: variants('squelch', 2), volume: 0.35, jitter: 0.08, minGapMs: 80 },
  bladeSwish: { files: variants('swing', 2), volume: 0.22, rate: 0.6, jitter: 0.08, minGapMs: 500 },
  rumble: { files: variants('rumble', 2), volume: 0.45, jitter: 0.05, minGapMs: 800 },
  chime: { files: variants('chime', 2), volume: 0.35, rate: 1.4, jitter: 0.06, minGapMs: 200 },
  crystalHit: { files: variants('crystalhit', 2), volume: 0.35, jitter: 0.1, minGapMs: 60 },
  shatter: { files: variants('shatter', 2), volume: 0.45, jitter: 0.08, minGapMs: 80 },
  crumble: { files: variants('crumble', 2), volume: 0.5, jitter: 0.06, minGapMs: 150 },
  roll: { files: ['roll_0.ogg'], volume: 0.5, jitter: 0.05, minGapMs: 400 },
  thwip: { files: variants('thwip', 2), volume: 0.4, rate: 1.3, jitter: 0.08, minGapMs: 120 },
} as const satisfies Record<string, SfxDef>;

export type SfxId = keyof typeof SFX_DEFS;

export const sfxKey = (id: SfxId, variant: number): string => `sfx-${id}-${variant}`;
