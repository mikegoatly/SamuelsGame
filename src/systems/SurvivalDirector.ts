import Phaser from 'phaser';
import { TILE_SIZE } from '../content/assetKeys';
import { infoOf } from '../content/levels/curve';
import type { Player } from '../entities/Player';
import { formatTime } from '../logic/format';
import { planSurvivalWave, SURVIVAL_PERF_CAP, survivalStage, type SurvivalSource, type SurvivalStage } from '../logic/survival';
import { stageAnnouncement } from '../logic/survivalAnnounce';
import { WaveScheduler } from '../logic/waveSchedule';
import { ROOM_COLS, ROOM_ROWS } from '../scenes/RoomBuilder';
import type { EnemyFactory } from './EnemyFactory';
import { feel } from './feel';
import { floatText } from './floatText';
import type { LevelDirector } from './LevelDirector';
import { spawnSize } from './spawnSize';
import { WaveRunner } from './WaveRunner';

const MIN_SPAWN_DISTANCE = 120;
const SPAWN_INSET = 8;
const STAGE_CHECK_MS = 1000;

/** Heroic Survival: endless waves whose monsters, variety and pace follow the run's elapsed time on the game clock. */
export class SurvivalDirector implements LevelDirector {
  /** Waves started so far. */
  wave = 0;
  private readonly runner: WaveRunner;
  private readonly source: SurvivalSource;
  private stage: SurvivalStage;
  private startNow?: number;
  private offsetMs = 0;
  private elapsed = 0;
  private checkedAt = -STAGE_CHECK_MS;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    factory: EnemyFactory,
    pools: SurvivalSource['pools'],
    private readonly heroLevel: number,
    isBlocked: (x: number, y: number) => boolean = () => false,
  ) {
    this.source = { pools, perfCap: SURVIVAL_PERF_CAP };
    this.stage = survivalStage(0, heroLevel, this.source);
    const self = this;
    const scheduler = new WaveScheduler({
      order: 1,
      totalWaves: Infinity,
      get timing() {
        return self.stage.timing;
      },
      plan: () => planSurvivalWave(this.stage, infoOf, Math.random, spawnSize),
      straggler: () => planSurvivalWave(this.stage, infoOf, Math.random, spawnSize)[0]!,
      rng: Math.random,
      sizeOf: (spawn) => spawnSize(spawn.enemyId),
      arena: true,
    });
    const rect = { x: 2 * TILE_SIZE, y: 2 * TILE_SIZE, w: (ROOM_COLS - 4) * TILE_SIZE, h: (ROOM_ROWS - 4) * TILE_SIZE };
    this.runner = new WaveRunner({ scene, player, factory, scheduler, rect, inset: SPAWN_INSET, minDistance: MIN_SPAWN_DISTANCE, isBlocked, onWave: (wave) => (this.wave = wave) });
  }

  /** Survived so far on the game clock; frozen once the run ends. */
  get elapsedMs(): number {
    return this.elapsed;
  }

  get stageIndex(): number {
    return this.stage.index;
  }

  get nextWaveProgress(): number | undefined {
    return this.runner.nextWaveProgress;
  }

  start(): void {
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    if (import.meta.env.DEV) {
      (window as unknown as { __survival: unknown }).__survival = {
        setElapsed: (ms: number) => {
          this.offsetMs += ms - this.elapsed;
          this.elapsed = ms;
          this.checkedAt = -STAGE_CHECK_MS;
        },
        stage: () => this.stage,
        elapsed: () => this.elapsed,
      };
    }
  }

  stop(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.runner.stop();
  }

  progressLabel(): string {
    return formatTime(this.elapsed);
  }

  private update(): void {
    if (this.player.dead || feel.isLocked) return;
    this.startNow ??= this.player.now;
    this.elapsed = this.player.now - this.startNow + this.offsetMs;
    if (this.elapsed - this.checkedAt >= STAGE_CHECK_MS || this.elapsed < this.checkedAt) {
      this.checkedAt = this.elapsed;
      this.advanceStage();
    }
    this.runner.update();
  }

  private advanceStage(): void {
    const next = survivalStage(this.elapsed, this.heroLevel, this.source);
    if (next.index === this.stage.index) return;
    const shout = stageAnnouncement(this.stage, next);
    this.stage = next;
    if (shout) floatText(this.scene, this.player.x, this.player.y - 34, shout, '#ffd27a', 16, 20, 1400);
  }
}
