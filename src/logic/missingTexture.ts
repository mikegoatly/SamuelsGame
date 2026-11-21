import { madKingBrain, motherSludgeBrain, sandRatBrain, stoneGuardianBrain } from '../content/bosses';
import type { BossAttack, BossBrainConfig, BossMode } from './bossBrain';

export type MtPhase = 1 | 2 | 3;
export type CopyId = 'stoneGuardian' | 'sandRat' | 'madKing' | 'motherSludge';

export const COPY_IDS: readonly CopyId[] = ['stoneGuardian', 'sandRat', 'madKing', 'motherSludge'];
const SOURCES: Record<CopyId, BossBrainConfig> = { stoneGuardian: stoneGuardianBrain, sandRat: sandRatBrain, madKing: madKingBrain, motherSludge: motherSludgeBrain };

/** How long it wears one boss's moves, per phase, and how long the change takes. */
export const COPY_MS: Record<MtPhase, number> = { 1: 8000, 2: 6000, 3: 6000 };
export const SWITCH_MS = 1000;
export const FAKE = { count: 2, popHits: 3, damageScale: 0.5, reformMs: 12000 } as const;

const FAKE_KINDS: readonly BossAttack['kind'][] = ['burst', 'spit', 'spiral', 'seek'];
const FIRST_AT = 0.5;
const THIRD_AT = 0.2;

export const mtPhase = (hpRatio: number): MtPhase => (hpRatio >= FIRST_AT ? 1 : hpRatio >= THIRD_AT ? 2 : 3);

/** The copied boss's own phase whose attacks it uses: its first set while it has fakes or is healthy, its second set only in the last phase. */
const sourcePhase = (phase: MtPhase): 1 | 2 => (phase === 3 ? 2 : 1);

/** One copied boss's moves for a phase: its first-phase set in phases 1 and 2, its second-phase set in phase 3, summons always stripped. Both phases of the returned config are the same list, so the boss brain never changes phase by itself. */
export function copyBrain(copy: CopyId, phase: MtPhase): BossBrainConfig {
  const source = SOURCES[copy].phases[sourcePhase(phase)];
  const set = { speedMultiplier: source.speedMultiplier, attacks: source.attacks.filter((a) => a.kind !== 'summon') };
  return { phaseTwoAt: 0, phases: { 1: set, 2: set } };
}

/** What a fake may do: the projectile attacks of the copy only. */
export function fakeBrain(copy: CopyId, phase: MtPhase): BossBrainConfig {
  const brain = copyBrain(copy, phase);
  const set = { ...brain.phases[1], attacks: brain.phases[1].attacks.filter((a) => FAKE_KINDS.includes(a.kind)) };
  return { phaseTwoAt: 0, phases: { 1: set, 2: set } };
}

export type CycleEvent = { type: 'switch-start'; to: CopyId } | { type: 'switch-end'; copy: CopyId };

/** Which boss it is copying, and when it changes: only while it is walking (never mid-attack), never to the same boss twice in a row. */
export class CopyCycle {
  copy: CopyId;
  switching = false;
  private since: number | null = null;
  private until = 0;
  private next: CopyId;

  constructor(private readonly rng: () => number) {
    this.copy = COPY_IDS[Math.floor(rng() * COPY_IDS.length)]!;
    this.next = this.copy;
  }

  /** Changes whenever the moves it should use change. */
  attackKey(phase: MtPhase): string {
    return `${this.copy}:${sourcePhase(phase)}`;
  }

  /** The first copy's window starts at the first update (the boss is armed by then), not when it was built. */
  update(now: number, mode: BossMode, phase: MtPhase): CycleEvent[] {
    this.since ??= now;
    if (this.switching) {
      if (now < this.until) return [];
      this.switching = false;
      this.copy = this.next;
      this.since = now;
      return [{ type: 'switch-end', copy: this.copy }];
    }
    if (mode !== 'chase' || now - this.since! < COPY_MS[phase]) return [];
    const others = COPY_IDS.filter((id) => id !== this.copy);
    this.next = others[Math.min(others.length - 1, Math.floor(this.rng() * others.length))]!;
    this.switching = true;
    this.until = now + SWITCH_MS;
    return [{ type: 'switch-start', to: this.next }];
  }
}

/** The two fakes' shared fate: three hits on the real boss pop both; they re-form after a while, but only in phase 2. */
export class FakeTracker {
  private hits = 0;
  private poppedAt: number | null = null;
  private gone = false;

  present(phase: MtPhase): boolean {
    return phase === 2 && !this.gone && this.poppedAt === null;
  }

  /** The real boss was hit: true when this hit pops the fakes. Only counts while the fakes are really out (`fakesOut`). */
  hit(now: number, phase: MtPhase, fakesOut: boolean): boolean {
    if (!fakesOut || !this.present(phase)) return false;
    this.hits++;
    if (this.hits < FAKE.popHits) return false;
    this.hits = 0;
    this.poppedAt = now;
    return true;
  }

  /** Call every frame: true on the frame the fakes re-form. Phase 3 removes them for good. */
  update(now: number, phase: MtPhase): boolean {
    if (phase === 3) this.gone = true;
    if (this.gone || this.poppedAt === null || phase !== 2 || now - this.poppedAt < FAKE.reformMs) return false;
    this.poppedAt = null;
    return true;
  }
}

/** The fakes keep circling during a copy switch, but only fire when the boss itself would act. */
export const fakesMayFire = ({ switching, locked, targetDead }: { switching: boolean; locked: boolean; targetDead: boolean }): boolean => !switching && !locked && !targetDead;
