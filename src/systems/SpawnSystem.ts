import Phaser from 'phaser';
import { TILE_SIZE } from '../content/assetKeys';
import { getEnemy } from '../content/enemies';
import type { LevelConfig } from '../content/levels';
import { curveOf, infoOf } from '../content/levels/curve';
import type { Player } from '../entities/Player';
import { pickRoleSpawn } from '../logic/spawnPoints';
import { planWave } from '../logic/waveMix';
import { ROOM_COLS, ROOM_ROWS } from '../scenes/RoomBuilder';
import { ClearWatch } from './ClearWatch';
import type { EnemyFactory } from './EnemyFactory';
import type { GameEvents } from './GameEvents';
import type { LevelDirector } from './LevelDirector';

const MIN_SPAWN_DISTANCE = 120;
const NEXT_WAVE_DELAY_MS = 2000;
const SPAWN_INSET = 8;

/** Endless arena waves. */
export class SpawnSystem implements LevelDirector {
  wave = 0;
  private stopped = false;
  private readonly watch: ClearWatch;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly factory: EnemyFactory,
    private readonly events: GameEvents,
    private readonly level: LevelConfig,
    private readonly isBlocked: (x: number, y: number) => boolean = () => false,
  ) {
    this.watch = new ClearWatch(scene, () => factory.living(), events, () => this.onWaveCleared());
  }

  start(): void {
    this.startWave(1);
  }

  stop(): void {
    this.stopped = true;
    this.watch.stop();
  }

  progressLabel(): string {
    return `wave ${this.wave}`;
  }

  private startWave(wave: number): void {
    if (this.stopped) return;
    this.wave = wave;
    this.events.emit('wave-started', wave);
    const spawns = planWave(this.level.enemyPool, curveOf(this.level), { order: wave, wave, levels: this.level.monsterLevelRange }, infoOf, Math.random);
    const floor = { x: 2 * TILE_SIZE, y: 2 * TILE_SIZE, w: (ROOM_COLS - 4) * TILE_SIZE, h: (ROOM_ROWS - 4) * TILE_SIZE };
    for (const spawn of spawns) {
      const { x, y } = pickRoleSpawn(floor, this.player, spawn.role, Math.random, this.isBlocked, SPAWN_INSET, MIN_SPAWN_DISTANCE);
      this.factory.spawnGroup(getEnemy(spawn.enemyId), spawn.level, x, y, spawn.affix);
    }
    this.watch.arm();
  }

  private onWaveCleared(): void {
    this.scene.time.delayedCall(NEXT_WAVE_DELAY_MS, () => this.startWave(this.wave + 1));
  }
}
