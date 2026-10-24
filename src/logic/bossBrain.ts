export type BossPhase = 1 | 2;
export type BossMode = 'chase' | 'telegraph' | 'dash' | 'burrowed' | 'rising';

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
  /** Most live minions of this type at once; a summon only fills the gap. */
  maxAlive: number;
}

/** Telegraphed straight dash: a line shows where the boss will charge. */
export interface LungeAttack extends Timer {
  kind: 'lunge';
  cooldownMs: number;
  telegraphMs: number;
  dashMs: number;
  dashSpeed: number;
  /** Width of the warning line and the danger lane, px. */
  width: number;
}

/** Vanishes (untargetable), warns at a destination, then reappears there; shares the hidden-time handling with burrow. */
export interface TeleportAttack extends Timer {
  kind: 'teleport';
  cooldownMs: number;
  vanishMs: number;
  telegraphMs: number;
  radius: number;
}

export interface SpiralAttack extends Timer {
  kind: 'spiral';
  everyMs: number;
  count: number;
  turns: number;
}

export type BossAttack = SlamAttack | BurrowAttack | BurstAttack | SpitAttack | SummonAttack | LungeAttack | TeleportAttack | SpiralAttack;
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
  | { type: 'summon'; count: number; minion: string; levelDrop: number; maxAlive: number }
  | { type: 'telegraphLine'; length: number; width: number; durationMs: number }
  | { type: 'lunge'; dashMs: number; speed: number; width: number }
  | { type: 'lungeEnd' }
  | { type: 'vanish'; travelMs: number }
  | { type: 'appear'; radius: number }
  | { type: 'spiral'; count: number; turns: number }
  | { type: 'phase'; phase: BossPhase };

export interface BossState {
  phase: BossPhase;
  mode: BossMode;
  /** When the current sequenced step (telegraph, travel, rising) completes. */
  strikeAt: number;
  /** Which sequenced attack is mid-way. */
  active: AttackKind | null;
  /** The sequenced attack in progress, kept so a phase change cannot strand it. */
  current: BossAttack | null;
  /** When the boss went underground; timed attacks are pushed back by the time spent there. */
  hiddenAt: number;
  /** Next time each attack kind may fire. */
  due: Partial<Record<AttackKind, number>>;
}

/** How many minions a summon may actually spawn given how many are alive. */
export const summonCount = (count: number, maxAlive: number, alive: number): number => Math.max(0, Math.min(count, maxAlive - alive));

export const bossPhase = (config: BossBrainConfig, hpRatio: number): BossPhase => (hpRatio <= config.phaseTwoAt ? 2 : 1);

export function phaseAttack<K extends AttackKind>(config: BossBrainConfig, phase: BossPhase, kind: K): Extract<BossAttack, { kind: K }> | undefined {
  return config.phases[phase].attacks.find((a): a is Extract<BossAttack, { kind: K }> => a.kind === kind);
}

export function newBossState(config: BossBrainConfig, now: number): BossState {
  const due: BossState['due'] = {};
  for (const attack of config.phases[1].attacks) due[attack.kind] = now + attack.firstMs;
  return { phase: 1, mode: 'chase', strikeAt: 0, active: null, current: null, hiddenAt: 0, due };
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
  advanceSequence(next, now, actions);
  if (next.mode === 'chase') startSequence(attacks, next, now, actions);
  if (!hidden(next.mode)) fireTimed(attacks, next, now, actions);
  return { state: next, actions };
}

const TIMED: readonly AttackKind[] = ['burst', 'spit', 'summon', 'spiral'];

function advanceSequence(s: BossState, now: number, out: BossAction[]): void {
  const attack = s.current;
  if (now < s.strikeAt || !attack) return;
  if (s.mode === 'telegraph' && attack.kind === 'slam') {
    finish(s, 'slam', now + attack.cooldownMs);
    out.push({ type: 'slam' });
  } else if (s.mode === 'telegraph' && attack.kind === 'lunge') {
    s.mode = 'dash';
    s.strikeAt = now + attack.dashMs;
    out.push({ type: 'lunge', dashMs: attack.dashMs, speed: attack.dashSpeed, width: attack.width });
  } else if (s.mode === 'dash' && attack.kind === 'lunge') {
    finish(s, 'lunge', now + attack.cooldownMs);
    out.push({ type: 'lungeEnd' });
  } else if (s.mode === 'burrowed' && (attack.kind === 'burrow' || attack.kind === 'teleport')) {
    s.mode = 'rising';
    s.strikeAt = now + attack.telegraphMs;
    out.push({ type: 'telegraph', radius: attack.radius, durationMs: attack.telegraphMs });
  } else if (s.mode === 'rising' && (attack.kind === 'burrow' || attack.kind === 'teleport')) {
    const hiddenFor = now - s.hiddenAt;
    for (const kind of Object.keys(s.due) as AttackKind[]) if (kind !== attack.kind) s.due[kind]! += hiddenFor;
    finish(s, attack.kind, now + attack.cooldownMs);
    out.push(attack.kind === 'burrow' ? { type: 'emerge', radius: attack.radius } : { type: 'appear', radius: attack.radius });
  } else {
    finish(s, attack.kind, now + 1000);
  }
}

function finish(s: BossState, kind: AttackKind, nextDue: number): void {
  s.mode = 'chase';
  s.active = null;
  s.current = null;
  s.due[kind] = nextDue;
}

function startSequence(attacks: BossAttack[], s: BossState, now: number, out: BossAction[]): void {
  for (const attack of attacks) {
    if ((s.due[attack.kind] ?? Infinity) > now) continue;
    if (attack.kind === 'slam') {
      begin(s, attack, 'telegraph', now + attack.telegraphMs);
      out.push({ type: 'telegraph', radius: attack.radius, durationMs: attack.telegraphMs });
      return;
    }
    if (attack.kind === 'lunge') {
      begin(s, attack, 'telegraph', now + attack.telegraphMs);
      out.push({ type: 'telegraphLine', length: (attack.dashSpeed * attack.dashMs) / 1000, width: attack.width, durationMs: attack.telegraphMs });
      return;
    }
    if (attack.kind === 'burrow' || attack.kind === 'teleport') {
      const travelMs = attack.kind === 'burrow' ? attack.travelMs : attack.vanishMs;
      begin(s, attack, 'burrowed', now + travelMs);
      s.hiddenAt = now;
      out.push(attack.kind === 'burrow' ? { type: 'burrow', travelMs } : { type: 'vanish', travelMs });
      return;
    }
  }
}

function begin(s: BossState, attack: BossAttack, mode: BossMode, strikeAt: number): void {
  s.mode = mode;
  s.active = attack.kind;
  s.current = attack;
  s.strikeAt = strikeAt;
}

const SEQUENCED: readonly AttackKind[] = ['slam', 'burrow', 'lunge', 'teleport'];

function fireTimed(attacks: BossAttack[], s: BossState, now: number, out: BossAction[]): void {
  for (const attack of attacks) {
    if (SEQUENCED.includes(attack.kind) || !TIMED.includes(attack.kind)) continue;
    if ((s.due[attack.kind] ?? Infinity) > now) continue;
    s.due[attack.kind] = now + (attack as { everyMs: number }).everyMs;
    if (attack.kind === 'burst') out.push({ type: 'burst', count: attack.count });
    else if (attack.kind === 'spit') out.push({ type: 'spit', count: attack.count, arc: attack.arc });
    else if (attack.kind === 'spiral') out.push({ type: 'spiral', count: attack.count, turns: attack.turns });
    else if (attack.kind === 'summon') out.push({ type: 'summon', count: attack.count, minion: attack.minion, levelDrop: attack.levelDrop, maxAlive: attack.maxAlive });
  }
}
