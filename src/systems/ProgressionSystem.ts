import { addXp, type PlayerProgress } from '../logic/progression';
import { xpReward, xpToNextLevel } from '../logic/xp';
import type { GameEvents } from './GameEvents';

export class ProgressionSystem {
  private current: PlayerProgress;
  private gained = 0;

  constructor(
    private readonly events: GameEvents,
    initial: PlayerProgress = { level: 1, xp: 0 },
  ) {
    this.current = initial;
  }

  get progress(): PlayerProgress {
    return this.current;
  }

  /** Total XP earned since this system was created (one run). */
  get gainedXp(): number {
    return this.gained;
  }

  get level(): number {
    return this.current.level;
  }

  get xpForNextLevel(): number {
    return xpToNextLevel(this.current.level);
  }

  awardKill(monsterLevel: number): void {
    this.gain(xpReward(monsterLevel, this.current.level));
  }

  gain(amount: number): void {
    this.gained += Math.max(0, amount);
    const { progress, levelsGained } = addXp(this.current, amount);
    this.current = progress;
    this.events.emit('xp-changed', progress);
    if (levelsGained > 0) this.events.emit('level-up', progress.level);
  }
}
