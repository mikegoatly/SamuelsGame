export type BossPhase = 1 | 2;
export type BossMode = 'chase' | 'telegraph' | 'dash' | 'burrowed' | 'rising' | 'leap';

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
  /** When set, the boss stops and warns for this long (aimed once, at the start) before the volley, instead of firing at once. */
  windupMs?: number;
}

/** Warns with a growing circle where she will land, leaps there for the last `flightMs` of the warning, and slams on landing. */
export interface HopAttack extends Timer {
  kind: 'hop';
  cooldownMs: number;
  telegraphMs: number;
  flightMs: number;
  radius: number;
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
  /** Lunges in a row before the cooldown starts (default 1). */
  lunges?: number;
  /** Warning time of every follow-up lunge in a combo. */
  chainTelegraphMs?: number;
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
  /** Counter-rotating spirals fired together (default 1); `count` is per arm. */
  arms?: number;
}

/** A ring of slow homing bolts: they bend toward the player at `turnRate` rad/s for `lifeMs`, so they can be outrun. */
export interface SeekAttack extends Timer {
  kind: 'seek';
  everyMs: number;
  count: number;
  turnRate: number;
  lifeMs: number;
  /** Bolt speed as a fraction of the boss's bolt speed. */
  speedFactor: number;
}

export type BossAttack = SlamAttack | HopAttack | BurrowAttack | BurstAttack | SpitAttack | SummonAttack | LungeAttack | TeleportAttack | SpiralAttack | SeekAttack;
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
  | { type: 'hopTelegraph'; radius: number; durationMs: number; flightMs: number }
  | { type: 'hopLaunch'; flightMs: number }
  | { type: 'land'; radius: number }
  | { type: 'telegraphFan'; count: number; arc: number; durationMs: number }
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
  | { type: 'spiral'; count: number; turns: number; arms: number }
  | { type: 'seek'; count: number; turnRate: number; ms: number; speedFactor: number }
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
  /** When a hop leaves the ground (0 when none is pending). */
  launchAt: number;
  /** Follow-up lunges still to come in the current combo. */
  chain: number;
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
  return { phase: 1, mode: 'chase', strikeAt: 0, active: null, current: null, hiddenAt: 0, launchAt: 0, chain: 0, due };
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

const TIMED: readonly AttackKind[] = ['burst', 'spit', 'summon', 'spiral', 'seek'];

function advanceSequence(s: BossState, now: number, out: BossAction[]): void {
  const attack = s.current;
  if (attack?.kind === 'hop' && s.mode === 'telegraph' && s.launchAt > 0 && now >= s.launchAt) {
    s.mode = 'leap';
    s.launchAt = 0;
    out.push({ type: 'hopLaunch', flightMs: attack.flightMs });
  }
  if (now < s.strikeAt || !attack) return;
  if (s.mode === 'leap' && attack.kind === 'hop') {
    finish(s, 'hop', now + attack.cooldownMs);
    out.push({ type: 'land', radius: attack.radius });
  } else if (s.mode === 'telegraph' && attack.kind === 'spit') {
    finish(s, 'spit', now + attack.everyMs);
    out.push({ type: 'spit', count: attack.count, arc: attack.arc });
  } else if (s.mode === 'telegraph' && attack.kind === 'slam') {
    finish(s, 'slam', now + attack.cooldownMs);
    out.push({ type: 'slam' });
  } else if (s.mode === 'telegraph' && attack.kind === 'lunge') {
    s.mode = 'dash';
    s.strikeAt = now + attack.dashMs;
    out.push({ type: 'lunge', dashMs: attack.dashMs, speed: attack.dashSpeed, width: attack.width });
  } else if (s.mode === 'dash' && attack.kind === 'lunge') {
    out.push({ type: 'lungeEnd' });
    if (s.chain > 0) {
      s.chain--;
      s.mode = 'telegraph';
      s.strikeAt = now + (attack.chainTelegraphMs ?? attack.telegraphMs);
      out.push(lungeLine(attack, s.strikeAt - now));
    } else finish(s, 'lunge', now + attack.cooldownMs);
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
    if (attack.kind === 'hop') {
      begin(s, attack, 'telegraph', now + attack.telegraphMs);
      s.launchAt = now + attack.telegraphMs - attack.flightMs;
      out.push({ type: 'hopTelegraph', radius: attack.radius, durationMs: attack.telegraphMs, flightMs: attack.flightMs });
      return;
    }
    if (attack.kind === 'spit' && attack.windupMs) {
      begin(s, attack, 'telegraph', now + attack.windupMs);
      out.push({ type: 'telegraphFan', count: attack.count, arc: attack.arc, durationMs: attack.windupMs });
      return;
    }
    if (attack.kind === 'lunge') {
      begin(s, attack, 'telegraph', now + attack.telegraphMs);
      s.chain = (attack.lunges ?? 1) - 1;
      out.push(lungeLine(attack, attack.telegraphMs));
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

function lungeLine(attack: LungeAttack, durationMs: number): BossAction {
  return { type: 'telegraphLine', length: (attack.dashSpeed * attack.dashMs) / 1000, width: attack.width, durationMs };
}

function begin(s: BossState, attack: BossAttack, mode: BossMode, strikeAt: number): void {
  s.mode = mode;
  s.active = attack.kind;
  s.current = attack;
  s.strikeAt = strikeAt;
}

const SEQUENCED: readonly AttackKind[] = ['slam', 'hop', 'burrow', 'lunge', 'teleport'];

/** A spit with a windup is a sequenced attack (the boss stops and warns); without one it fires on its timer. */
const sequenced = (attack: BossAttack): boolean => SEQUENCED.includes(attack.kind) || (attack.kind === 'spit' && !!attack.windupMs);

function fireTimed(attacks: BossAttack[], s: BossState, now: number, out: BossAction[]): void {
  for (const attack of attacks) {
    if (sequenced(attack) || !TIMED.includes(attack.kind)) continue;
    if ((s.due[attack.kind] ?? Infinity) > now) continue;
    s.due[attack.kind] = now + (attack as { everyMs: number }).everyMs;
    if (attack.kind === 'burst') out.push({ type: 'burst', count: attack.count });
    else if (attack.kind === 'spit') out.push({ type: 'spit', count: attack.count, arc: attack.arc });
    else if (attack.kind === 'spiral') out.push({ type: 'spiral', count: attack.count, turns: attack.turns, arms: attack.arms ?? 1 });
    else if (attack.kind === 'seek') out.push({ type: 'seek', count: attack.count, turnRate: attack.turnRate, ms: attack.lifeMs, speedFactor: attack.speedFactor });
    else if (attack.kind === 'summon') out.push({ type: 'summon', count: attack.count, minion: attack.minion, levelDrop: attack.levelDrop, maxAlive: attack.maxAlive });
  }
}
