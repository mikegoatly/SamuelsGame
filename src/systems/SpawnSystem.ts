import Phaser from 'phaser';
import { TILE_SIZE } from '../content/assetKeys';
import type { LevelConfig } from '../content/levels';
import { curveOf, infoOf } from '../content/levels/curve';
import type { Player } from '../entities/Player';
import { stragglerOf } from '../logic/straggler';
import { planWave } from '../logic/waveMix';
import { timingOf, WaveScheduler } from '../logic/waveSchedule';
import { ROOM_COLS, ROOM_ROWS } from '../scenes/RoomBuilder';
import type { EnemyFactory } from './EnemyFactory';
import { floatText } from './floatText';
import type { GameEvents } from './GameEvents';
import type { LevelDirector } from './LevelDirector';
import { spawnSize } from './spawnSize';
import { WaveRunner } from './WaveRunner';

const MIN_SPAWN_DISTANCE = 120;
const SPAWN_INSET = 8;

/** Endless arena: reinforcements keep arriving on the wave timer, with a cap that rises per wave. */
export class SpawnSystem implements LevelDirector {
  wave = 0;
  private readonly runner: WaveRunner;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    factory: EnemyFactory,
    private readonly events: GameEvents,
    level: LevelConfig,
    isBlocked: (x: number, y: number) => boolean = () => false,
  ) {
    const curve = curveOf(level);
    const levels = level.monsterLevelRange;
    const scheduler = new WaveScheduler({
      order: 1,
      totalWaves: Infinity,
      timing: timingOf(curve),
      plan: (wave) => planWave(level.enemyPool, curve, { order: wave, wave, levels }, infoOf, Math.random),
      straggler: () => stragglerOf(level.enemyPool, curve, 1, levels, infoOf, Math.random),
      rng: Math.random,
      sizeOf: (spawn) => spawnSize(spawn.enemyId),
      arena: true,
    });
    const rect = { x: 2 * TILE_SIZE, y: 2 * TILE_SIZE, w: (ROOM_COLS - 4) * TILE_SIZE, h: (ROOM_ROWS - 4) * TILE_SIZE };
    this.runner = new WaveRunner({ scene, player, factory, scheduler, rect, inset: SPAWN_INSET, minDistance: MIN_SPAWN_DISTANCE, isBlocked, onWave: (wave) => this.onWave(wave) });
  }

  get nextWaveProgress(): number | undefined {
    return this.runner.nextWaveProgress;
  }

  start(): void {
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  stop(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.runner.stop();
  }

  progressLabel(): string {
    return `wave ${Math.max(1, this.wave)}`;
  }

  private update(): void {
    this.runner.update();
  }

  private onWave(wave: number): void {
    this.wave = wave;
    this.events.emit('wave-started', wave);
    if (wave >= 2) floatText(this.scene, this.player.x, this.player.y - 20, `Wave ${wave}!`, '#ffd27a', 16, 20, 1100);
  }
}
