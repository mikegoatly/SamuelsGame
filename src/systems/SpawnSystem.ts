import Phaser from 'phaser';
import { TILE_SIZE } from '../content/assetKeys';
import { getEnemy } from '../content/enemies';
import type { LevelConfig } from '../content/levels';
import type { Player } from '../entities/Player';
import { pickSpawnPoint } from '../logic/spawnPoints';
import { waveEnemyLevels } from '../logic/waves';
import { pickWeighted } from '../logic/weighted';
import { ROOM_COLS, ROOM_ROWS } from '../scenes/RoomBuilder';
import type { EnemyFactory } from './EnemyFactory';
import type { GameEvents } from './GameEvents';
import type { LevelDirector } from './LevelDirector';

const MIN_SPAWN_DISTANCE = 120;
const NEXT_WAVE_DELAY_MS = 2000;

/** Endless arena waves. */
export class SpawnSystem implements LevelDirector {
  wave = 0;
  private remaining = 0;
  private stopped = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly factory: EnemyFactory,
    private readonly events: GameEvents,
    private readonly level: LevelConfig,
  ) {
    events.on('enemy-died', () => this.onEnemyDied());
  }

  start(): void {
    this.startWave(1);
  }

  stop(): void {
    this.stopped = true;
  }

  progressLabel(): string {
    return `wave ${this.wave}`;
  }

  private startWave(wave: number): void {
    if (this.stopped) return;
    this.wave = wave;
    const levels = waveEnemyLevels(wave, this.level.monsterLevelRange);
    this.remaining = levels.length;
    this.events.emit('wave-started', wave);
    for (const level of levels) this.spawn(level);
  }

  private spawn(level: number): void {
    const def = getEnemy(pickWeighted(this.level.enemyPool, Math.random)?.enemyId ?? '');
    const grid = { cols: ROOM_COLS, rows: ROOM_ROWS, tileSize: TILE_SIZE };
    const { x, y } = pickSpawnPoint(grid, this.player, MIN_SPAWN_DISTANCE, Math.random);
    this.factory.spawn(def, level, x, y);
  }

  private onEnemyDied(): void {
    this.remaining--;
    if (this.remaining > 0) return;
    this.scene.time.delayedCall(NEXT_WAVE_DELAY_MS, () => this.startWave(this.wave + 1));
  }
}
