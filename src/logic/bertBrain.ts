export type BertPhase = 1 | 2 | 3;
export type BertMode = 'walk' | 'slam' | 'toss' | 'rollWindup' | 'rolling' | 'uncurl' | 'stunned' | 'laserWindup' | 'laserFire';

interface Timer {
  /** Delay before the first use, counted from the fight start (or from entering the phase that introduces the attack). */
  firstMs: number;
  cooldownMs: number;
}

/** Ground pound: a ring grows over `telegraphMs`, then it lands. */
export interface BertSlam extends Timer {
  kind: 'slam';
  telegraphMs: number;
  radius: number;
}

/** Crystal toss: landing circles show where the crystals will fall. */
export interface BertToss extends Timer {
  kind: 'toss';
  telegraphMs: number;
  radius: number;
  count: number;
}

/** Curls into a ball, shows an arrow for `windupMs`, then charges and bounces off the walls `bounces` times. */
export interface BertRoll extends Timer {
  kind: 'roll';
  windupMs: number;
  bounces: number;
  speed: number;
  /** A roll that has not ended by itself ends after this long. */
  maxMs: number;
}

/** A laser that bounces off the arena walls; its path is drawn thin for `windupMs` before it fires for `fireMs`. */
export interface BertLaser extends Timer {
  kind: 'laser';
  windupMs: number;
  fireMs: number;
  bounces: number;
  /** Shots in a row, each re-aimed and re-warned (the follow-ups warn for `followUpWindupMs`). */
  volleys: number;
  followUpWindupMs: number;
}

export type BertAttack = BertSlam | BertToss | BertRoll | BertLaser;
type Kind = BertAttack['kind'];

export interface BertPhaseConfig {
  speedMultiplier: number;
  attacks: BertAttack[];
}

export interface BertBrainConfig {
  /** Health shares below which phase 2 and phase 3 begin. */
  phaseAt: readonly [number, number];
  phases: Record<BertPhase, BertPhaseConfig>;
  /** How long a crash into a pillar or spike stuns him. */
  stunMs: number;
  /** How long he takes to unroll after his bounces are spent. */
  uncurlMs: number;
  /** After any long action he waits at least this long before the next attack. */
  breatherMs: number;
}

export type BertAction =
  | { type: 'phase'; phase: BertPhase }
  | { type: 'cancel' }
  | { type: 'slamTelegraph'; radius: number; ms: number }
  | { type: 'slam'; radius: number }
  | { type: 'tossTelegraph'; radius: number; ms: number; count: number }
  | { type: 'toss'; radius: number; count: number }
  | { type: 'rollTelegraph'; ms: number }
  | { type: 'rollStart'; speed: number; bounces: number }
  | { type: 'rollEnd' }
  | { type: 'stun'; ms: number }
  | { type: 'stunEnd' }
  | { type: 'laserTelegraph'; ms: number; bounces: number }
  | { type: 'laserFire'; ms: number; bounces: number }
  | { type: 'laserEnd' };

export interface BertState {
  phase: BertPhase;
  mode: BertMode;
  /** When the current timed step (warning, stun, uncurl, beam) ends. */
  until: number;
  current: BertAttack | null;
  volleysLeft: number;
  due: Partial<Record<Kind, number>>;
}

export function bertPhase(config: BertBrainConfig, hpRatio: number): BertPhase {
  if (hpRatio <= config.phaseAt[1]) return 3;
  return hpRatio <= config.phaseAt[0] ? 2 : 1;
}

export function newBertState(config: BertBrainConfig, now: number): BertState {
  const due: BertState['due'] = {};
  for (const attack of config.phases[1].attacks) due[attack.kind] = now + attack.firstMs;
  return { phase: 1, mode: 'walk', until: 0, current: null, volleysLeft: 0, due };
}

const WARNING_MODES: readonly BertMode[] = ['slam', 'toss', 'rollWindup', 'laserWindup'];

/** Advances the state machine; the caller performs the returned actions. */
export function stepBert(config: BertBrainConfig, state: BertState, now: number, hpRatio: number): { state: BertState; actions: BertAction[] } {
  const actions: BertAction[] = [];
  const s: BertState = { ...state, due: { ...state.due } };
  const phase = bertPhase(config, hpRatio);
  if (phase > s.phase) {
    s.phase = phase;
    for (const attack of config.phases[phase].attacks) s.due[attack.kind] ??= now + attack.firstMs;
    actions.push({ type: 'phase', phase });
    if (WARNING_MODES.includes(s.mode)) {
      s.mode = 'walk';
      s.current = null;
      actions.push({ type: 'cancel' });
    }
  }
  advance(config, s, now, actions);
  if (s.mode === 'walk') start(config.phases[s.phase].attacks, s, now, actions);
  return { state: s, actions };
}

/** Nothing else is due until the breather is over. */
function breathe(s: BertState, now: number, ms: number): void {
  for (const kind of Object.keys(s.due) as Kind[]) s.due[kind] = Math.max(s.due[kind]!, now + ms);
}

function finish(s: BertState, kind: Kind, now: number, cooldownMs: number, config: BertBrainConfig): void {
  s.mode = 'walk';
  s.current = null;
  s.due[kind] = now + cooldownMs;
  breathe(s, now, config.breatherMs);
}

function advance(config: BertBrainConfig, s: BertState, now: number, out: BertAction[]): void {
  const attack = s.current;
  if (s.mode === 'stunned' && now >= s.until) {
    out.push({ type: 'stunEnd' });
    s.mode = 'walk';
    s.current = null;
    breathe(s, now, config.breatherMs);
    return;
  }
  if (s.mode === 'uncurl' && now >= s.until) {
    s.mode = 'walk';
    breathe(s, now, config.breatherMs);
    return;
  }
  if (!attack || now < s.until) return;
  if (s.mode === 'slam' && attack.kind === 'slam') {
    out.push({ type: 'slam', radius: attack.radius });
    finish(s, 'slam', now, attack.cooldownMs, config);
  } else if (s.mode === 'toss' && attack.kind === 'toss') {
    out.push({ type: 'toss', radius: attack.radius, count: attack.count });
    finish(s, 'toss', now, attack.cooldownMs, config);
  } else if (s.mode === 'rollWindup' && attack.kind === 'roll') {
    s.mode = 'rolling';
    s.until = now + attack.maxMs;
    out.push({ type: 'rollStart', speed: attack.speed, bounces: attack.bounces });
  } else if (s.mode === 'rolling' && attack.kind === 'roll') {
    rollOver(config, s, now, out);
  } else if (s.mode === 'laserWindup' && attack.kind === 'laser') {
    s.mode = 'laserFire';
    s.until = now + attack.fireMs;
    s.volleysLeft--;
    out.push({ type: 'laserFire', ms: attack.fireMs, bounces: attack.bounces });
  } else if (s.mode === 'laserFire' && attack.kind === 'laser') {
    out.push({ type: 'laserEnd' });
    if (s.volleysLeft > 0) {
      s.mode = 'laserWindup';
      s.until = now + attack.followUpWindupMs;
      out.push({ type: 'laserTelegraph', ms: attack.followUpWindupMs, bounces: attack.bounces });
    } else finish(s, 'laser', now, attack.cooldownMs, config);
  }
}

function rollOver(config: BertBrainConfig, s: BertState, now: number, out: BertAction[]): void {
  const attack = s.current;
  out.push({ type: 'rollEnd' });
  s.mode = 'uncurl';
  s.until = now + config.uncurlMs;
  if (attack?.kind === 'roll') s.due.roll = now + config.uncurlMs + attack.cooldownMs;
  s.current = null;
}

function start(attacks: BertAttack[], s: BertState, now: number, out: BertAction[]): void {
  for (const attack of attacks) {
    if ((s.due[attack.kind] ?? Infinity) > now) continue;
    s.current = attack;
    if (attack.kind === 'slam') {
      s.mode = 'slam';
      s.until = now + attack.telegraphMs;
      out.push({ type: 'slamTelegraph', radius: attack.radius, ms: attack.telegraphMs });
    } else if (attack.kind === 'toss') {
      s.mode = 'toss';
      s.until = now + attack.telegraphMs;
      out.push({ type: 'tossTelegraph', radius: attack.radius, ms: attack.telegraphMs, count: attack.count });
    } else if (attack.kind === 'roll') {
      s.mode = 'rollWindup';
      s.until = now + attack.windupMs;
      out.push({ type: 'rollTelegraph', ms: attack.windupMs });
    } else {
      s.mode = 'laserWindup';
      s.until = now + attack.windupMs;
      s.volleysLeft = attack.volleys;
      out.push({ type: 'laserTelegraph', ms: attack.windupMs, bounces: attack.bounces });
    }
    return;
  }
}

/** The runtime reports the roll is over (bounces spent): he unrolls. */
export function bertRollEnded(state: BertState, now: number, uncurlMs: number): { state: BertState; actions: BertAction[] } {
  if (state.mode !== 'rolling') return { state, actions: [] };
  const s: BertState = { ...state, due: { ...state.due } };
  const actions: BertAction[] = [{ type: 'rollEnd' }];
  s.mode = 'uncurl';
  s.until = now + uncurlMs;
  const attack = state.current;
  if (attack?.kind === 'roll') s.due.roll = now + uncurlMs + attack.cooldownMs;
  s.current = null;
  return { state: s, actions };
}

/** The roll hit a pillar or spike: he is dazed for `ms`, the big damage window. */
export function bertCrash(state: BertState, now: number, ms: number): { state: BertState; actions: BertAction[] } {
  if (state.mode !== 'rolling') return { state, actions: [] };
  const s: BertState = { ...state, due: { ...state.due } };
  s.mode = 'stunned';
  s.until = now + ms;
  if (state.current?.kind === 'roll') s.due.roll = now + ms + state.current.cooldownMs;
  s.current = null;
  return { state: s, actions: [{ type: 'stun', ms }] };
}

/** Is Bert in a state where he walks and can be hit normally? */
export const bertWalking = (state: BertState): boolean => state.mode === 'walk' || state.mode === 'slam' || state.mode === 'toss';
