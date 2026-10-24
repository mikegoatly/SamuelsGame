export type BossPhase = 1 | 2;
export type BossMode = 'chase' | 'telegraph' | 'burrowed' | 'rising';

interface Timer {
  /** Delay before the first use, counted from the fight start (or from entering a phase that introduces the attack). */
  firstMs: number;
}

export interface SlamAttack extends Timer {
  kind: 'slam';
  cooldownMs: number;
  telegraphMs: number;
  radius: number;
}

export interface BurrowAttack extends Timer {
  kind: 'burrow';
  cooldownMs: number;
  /** Time spent hidden and moving under the sand. */
  travelMs: number;
  telegraphMs: number;
  radius: number;
}

export interface BurstAttack extends Timer {
  kind: 'burst';
  everyMs: number;
  count: number;
}

export interface SpitAttack extends Timer {
  kind: 'spit';
  everyMs: number;
  count: number;
  /** Total fan angle of the aimed volley, radians. */
  arc: number;
}

export interface SummonAttack extends Timer {
  kind: 'summon';
  everyMs: number;
  count: number;
  minion: string;
  levelDrop: number;
}

export type BossAttack = SlamAttack | BurrowAttack | BurstAttack | SpitAttack | SummonAttack;
type AttackKind = BossAttack['kind'];

export interface BossPhaseConfig {
  speedMultiplier: number;
  attacks: BossAttack[];
}

/** Data-driven boss: the attack list per phase is all that distinguishes one boss from another. */
export interface BossBrainConfig {
  phaseTwoAt: number;
  phases: Record<BossPhase, BossPhaseConfig>;
}

export type BossAction =
  | { type: 'telegraph'; radius: number; durationMs: number }
  | { type: 'slam' }
  | { type: 'burrow'; travelMs: number }
  | { type: 'emerge'; radius: number }
  | { type: 'burst'; count: number }
  | { type: 'spit'; count: number; arc: number }
  | { type: 'summon'; count: number; minion: string; levelDrop: number }
  | { type: 'phase'; phase: BossPhase };

export interface BossState {
  phase: BossPhase;
  mode: BossMode;
  /** When the current sequenced step (telegraph, travel, rising) completes. */
  strikeAt: number;
  /** Which sequenced attack is mid-way. */
  active: AttackKind | null;
  /** When the boss went underground; timed attacks are pushed back by the time spent there. */
  hiddenAt: number;
  /** Next time each attack kind may fire. */
  due: Partial<Record<AttackKind, number>>;
}

export const bossPhase = (config: BossBrainConfig, hpRatio: number): BossPhase => (hpRatio <= config.phaseTwoAt ? 2 : 1);

export function phaseAttack<K extends AttackKind>(config: BossBrainConfig, phase: BossPhase, kind: K): Extract<BossAttack, { kind: K }> | undefined {
  return config.phases[phase].attacks.find((a): a is Extract<BossAttack, { kind: K }> => a.kind === kind);
}

export function newBossState(config: BossBrainConfig, now: number): BossState {
  const due: BossState['due'] = {};
  for (const attack of config.phases[1].attacks) due[attack.kind] = now + attack.firstMs;
  return { phase: 1, mode: 'chase', strikeAt: 0, active: null, hiddenAt: 0, due };
}

const hidden = (mode: BossMode): boolean => mode === 'burrowed' || mode === 'rising';

/** Advances the boss state machine; the caller performs the returned actions (draw telegraph, damage, spawn bolts...). */
export function stepBoss(config: BossBrainConfig, state: BossState, now: number, hpRatio: number): { state: BossState; actions: BossAction[] } {
  const actions: BossAction[] = [];
  const next: BossState = { ...state, due: { ...state.due } };
  if (state.phase === 1 && bossPhase(config, hpRatio) === 2) {
    next.phase = 2;
    for (const attack of config.phases[2].attacks) next.due[attack.kind] ??= now + attack.firstMs;
    actions.push({ type: 'phase', phase: 2 });
  }
  const attacks = config.phases[next.phase].attacks;
  advanceSequence(attacks, next, now, actions);
  if (next.mode === 'chase') startSequence(attacks, next, now, actions);
  if (!hidden(next.mode)) fireTimed(attacks, next, now, actions);
  return { state: next, actions };
}

function find<K extends AttackKind>(attacks: BossAttack[], kind: K | null): Extract<BossAttack, { kind: K }> | undefined {
  return attacks.find((a): a is Extract<BossAttack, { kind: K }> => a.kind === kind);
}

function advanceSequence(attacks: BossAttack[], s: BossState, now: number, out: BossAction[]): void {
  if (now < s.strikeAt) return;
  if (s.mode === 'telegraph') {
    const slam = find(attacks, 'slam');
    s.mode = 'chase';
    s.active = null;
    if (slam) s.due.slam = now + slam.cooldownMs;
    out.push({ type: 'slam' });
  } else if (s.mode === 'burrowed') {
    const burrow = find(attacks, 'burrow');
    if (!burrow) return;
    s.mode = 'rising';
    s.strikeAt = now + burrow.telegraphMs;
    out.push({ type: 'telegraph', radius: burrow.radius, durationMs: burrow.telegraphMs });
  } else if (s.mode === 'rising') {
    const burrow = find(attacks, 'burrow');
    s.mode = 'chase';
    s.active = null;
    const hiddenFor = now - s.hiddenAt;
    for (const kind of ['burst', 'spit', 'summon'] as const) if (s.due[kind] !== undefined) s.due[kind] += hiddenFor;
    if (burrow) {
      s.due.burrow = now + burrow.cooldownMs;
      out.push({ type: 'emerge', radius: burrow.radius });
    }
  }
}

function startSequence(attacks: BossAttack[], s: BossState, now: number, out: BossAction[]): void {
  for (const attack of attacks) {
    if ((s.due[attack.kind] ?? Infinity) > now) continue;
    if (attack.kind === 'slam') {
      s.mode = 'telegraph';
      s.active = 'slam';
      s.strikeAt = now + attack.telegraphMs;
      out.push({ type: 'telegraph', radius: attack.radius, durationMs: attack.telegraphMs });
      return;
    }
    if (attack.kind === 'burrow') {
      s.mode = 'burrowed';
      s.active = 'burrow';
      s.strikeAt = now + attack.travelMs;
      s.hiddenAt = now;
      out.push({ type: 'burrow', travelMs: attack.travelMs });
      return;
    }
  }
}

function fireTimed(attacks: BossAttack[], s: BossState, now: number, out: BossAction[]): void {
  for (const attack of attacks) {
    if (attack.kind === 'slam' || attack.kind === 'burrow') continue;
    if ((s.due[attack.kind] ?? Infinity) > now) continue;
    s.due[attack.kind] = now + attack.everyMs;
    if (attack.kind === 'burst') out.push({ type: 'burst', count: attack.count });
    else if (attack.kind === 'spit') out.push({ type: 'spit', count: attack.count, arc: attack.arc });
    else out.push({ type: 'summon', count: attack.count, minion: attack.minion, levelDrop: attack.levelDrop });
  }
}
