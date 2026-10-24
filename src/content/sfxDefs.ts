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
  victory: { files: ['victory.ogg'], volume: 0.7 },
} as const satisfies Record<string, SfxDef>;

export type SfxId = keyof typeof SFX_DEFS;

export const sfxKey = (id: SfxId, variant: number): string => `sfx-${id}-${variant}`;
