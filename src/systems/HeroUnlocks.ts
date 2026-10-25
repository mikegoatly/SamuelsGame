import Phaser from 'phaser';
import { heroKit } from '../content/heroes';
import type { Player } from '../entities/Player';
import { EdgeWatch } from '../logic/edge';
import { bankRun, unlockHeroes } from '../logic/heroSave';
import { RunLog } from '../logic/runLog';
import { newlyUnlocked, type AccountStats, type RunRecord } from '../logic/unlocks';
import type { GameEvents } from './GameEvents';
import type { SaveSystem } from './SaveSystem';

/** Watches a run: feeds the RunLog from game events, unlocks account-based heroes the moment their condition is met, and judges the run when it ends. */
export class HeroUnlocks {
  readonly log: RunLog;
  private finished = false;
  private readonly dash = new EdgeWatch();

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    events: GameEvents,
    private readonly save: SaveSystem,
    heroId: string,
    levelId: string,
    bossId: string | undefined,
    private readonly announce: (heroIds: string[]) => void,
  ) {
    this.log = new RunLog(heroId, levelId);
    events.on('enemy-died', () => {
      this.log.kill();
      this.checkLive();
    });
    events.on('coins-changed', (total) => {
      this.log.gold(total);
      this.checkLive();
    });
    events.on('player-damaged', (source, amount) => this.log.damage(source, amount));
    events.on('skill-attempt', () => this.log.attempt());
    events.on('potion-used', () => this.log.potion());
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.watchDash, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.watchDash, this));
    events.on('boss-died', () => bossId && this.log.bossKilled(bossId));
  }

  private watchDash(): void {
    if (this.dash.step(this.player.isDashing) === 'rose') this.log.dash();
  }

  /** Lifetime totals including this run so far. */
  private account(): AccountStats {
    const { stats } = this.save.data;
    return { ...stats, totalKills: stats.totalKills + this.log.kills, goldPeak: Math.max(stats.goldPeak, this.log.goldPeak) };
  }

  private checkLive(): void {
    if (this.finished) return;
    this.unlock(newlyUnlocked(this.save.data.heroes.unlocked, this.account()));
  }

  /** Banks the run into the lifetime totals and unlocks whatever it earned; returns the newly unlocked hero ids. Only the first call counts. */
  finish(cleared: boolean, timeMs: number): string[] {
    if (this.finished) return [];
    this.finished = true;
    const record: RunRecord = this.log.finish(cleared, timeMs);
    this.save.update((save) => bankRun(save, record, this.log.goldPeak));
    return this.unlock(newlyUnlocked(this.save.data.heroes.unlocked, this.save.data.stats, record));
  }

  private unlock(ids: string[]): string[] {
    if (ids.length === 0) return ids;
    this.save.update((save) => unlockHeroes(save, ids, heroKit));
    this.announce(ids);
    return ids;
  }
}
