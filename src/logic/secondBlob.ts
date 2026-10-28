export const SECOND_BLOB = { hpFraction: 0.3, iframesMs: 1500, scale: 0.75 } as const;

export type Knockout = 'secondBlob' | 'revive' | 'die';

export const secondBlobHp = (maxHp: number): number => Math.max(1, Math.ceil(maxHp * SECOND_BLOB.hpFraction));

/** What a lethal hit does: Gloop's once-per-run Second Blob first, then the Revive Token (asked only when needed), then death. A new instance per run attempt. */
export class KnockoutRules {
  private spent = false;

  constructor(private readonly hasSecondBlob: boolean) {}

  get used(): boolean {
    return this.spent;
  }

  resolve(spendRevive: () => boolean, runEnded = false): Knockout {
    if (runEnded) return 'die';
    if (this.hasSecondBlob && !this.spent) {
      this.spent = true;
      return 'secondBlob';
    }
    return spendRevive() ? 'revive' : 'die';
  }
}
