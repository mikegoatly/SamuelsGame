export interface PlayerTimerTuning {
  dashMs: number;
  dashCooldownMs: number;
  iframesMs: number;
  knockbackMs: number;
}

/** Player cooldown windows, driven purely by the clock value passed in (the pause-safe GameClock in the game). */
export class PlayerTimers {
  private nextDashAt = 0;
  private dashEndsAt = 0;
  private invulnerableUntil = 0;
  private knockbackUntil = 0;
  private nextFireAt = 0;

  constructor(private readonly tuning: PlayerTimerTuning) {}

  tryDash(now: number): boolean {
    if (now < this.nextDashAt) return false;
    this.dashEndsAt = now + this.tuning.dashMs;
    this.nextDashAt = now + this.tuning.dashCooldownMs;
    return true;
  }

  tryFire(now: number, rateMs: number): boolean {
    if (now < this.nextFireAt) return false;
    this.nextFireAt = now + rateMs;
    return true;
  }

  hurt(now: number): void {
    this.invulnerableUntil = now + this.tuning.iframesMs;
    this.knockbackUntil = now + this.tuning.knockbackMs;
  }

  isDashing(now: number): boolean {
    return now < this.dashEndsAt;
  }

  invulnerable(now: number): boolean {
    return this.isDashing(now) || now < this.invulnerableUntil;
  }

  inKnockback(now: number): boolean {
    return now < this.knockbackUntil;
  }

  /** True while the hurt blink plays (i-frames from damage, not from dashing). */
  blinking(now: number): boolean {
    return now < this.invulnerableUntil;
  }
}
