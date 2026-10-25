import { newRunRecord, type DamageSource, type RunRecord } from './unlocks';

/** Collects what happens during one run; `finish` hands over the record the unlock rules judge. */
export class RunLog {
  goldPeak = 0;
  private readonly record: RunRecord;

  constructor(heroId: string, levelId: string) {
    this.record = newRunRecord(heroId, levelId);
  }

  get kills(): number {
    return this.record.kills;
  }

  damage(source: DamageSource, amount: number): void {
    this.record.damageTaken[source] += Math.max(0, amount);
  }

  kill(): void {
    this.record.kills++;
  }

  potion(): void {
    this.record.potionsUsed++;
  }

  attempt(): void {
    this.record.skillAttempts++;
  }

  dash(): void {
    this.record.dashes++;
  }

  bossKilled(bossId: string): void {
    this.record.bossKilled = bossId;
  }

  gold(total: number): void {
    this.goldPeak = Math.max(this.goldPeak, total);
  }

  finish(cleared: boolean, timeMs: number): RunRecord {
    return { ...this.record, damageTaken: { ...this.record.damageTaken }, cleared, timeMs };
  }
}
