import Phaser from 'phaser';
import { getEnemy } from '../content/enemies';
import type { LevelConfig } from '../content/levels';
import { curveOf, infoOf } from '../content/levels/curve';
import type { Player } from '../entities/Player';
import { insetRect, rectCenter, rectContains } from '../logic/geometry';
import { findRoomAt } from '../logic/roomFlow';
import type { LevelObjects, RoomSpec } from '../logic/tiledObjects';
import { stragglerOf } from '../logic/straggler';
import { planWave, wavesInRoom } from '../logic/waveMix';
import { timingOf, WaveScheduler } from '../logic/waveSchedule';
import { ClearWatch } from './ClearWatch';
import type { DoorLayer } from './DoorLayer';
import type { EnemyFactory } from './EnemyFactory';
import type { GameEvents } from './GameEvents';
import type { LevelDirector } from './LevelDirector';
import { floatText } from './floatText';
import { feel } from './feel';
import { playSfx } from './sfx';
import { spawnSize } from './spawnSize';
import { WaveRunner } from './WaveRunner';

const TRIGGER_INSET = 16;
const SPAWN_INSET = 24;
const MIN_SPAWN_DISTANCE = 90;
const BOSS_SPAWN_DELAY_MS = 900;

export interface RoomFlowOptions {
  scene: Phaser.Scene;
  player: Player;
  factory: EnemyFactory;
  events: GameEvents;
  level: LevelConfig;
  world: LevelObjects;
  doors: DoorLayer;
  isBlocked: (x: number, y: number) => boolean;
}

/** Relic-Hunters style flow: stepping into a room seals its doors and spawns waves; clearing it opens them again. */
export class RoomFlowSystem implements LevelDirector {
  private readonly cleared = new Set<number>();
  private current?: RoomSpec;
  private runner?: WaveRunner;
  private readonly watch: ClearWatch;
  private bossStarted = false;
  private stopped = false;

  constructor(private readonly o: RoomFlowOptions) {
    this.watch = new ClearWatch(o.scene, () => o.factory.living(), o.events, () => this.onWaveCleared(), () => this.onStatuesStir(), () => this.runner?.released ?? false);
    o.events.on('boss-died', () => this.onBossDied());
  }

  get totalRooms(): number {
    return this.o.world.rooms.length;
  }

  start(): void {
    this.o.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  get nextWaveProgress(): number | undefined {
    return this.runner?.nextWaveProgress;
  }

  stop(): void {
    this.stopped = true;
    this.runner?.stop();
    this.watch.stop();
    this.o.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  progressLabel(): string {
    if (this.bossStarted) return 'the boss';
    return `room ${this.current?.order ?? Math.min(this.totalRooms, this.cleared.size + 1)}`;
  }

  private update(): void {
    const { player, world } = this.o;
    if (player.dead) this.runner?.stop();
    if (this.stopped || player.dead || this.bossStarted) return;
    if (this.current) return this.runner?.update();
    const room = findRoomAt(world.rooms, player, TRIGGER_INSET, this.cleared);
    if (room) this.startRoom(room);
    else if (world.bossArena && this.cleared.size === this.totalRooms && rectContains(insetRect(world.bossArena.rect, TRIGGER_INSET), player)) {
      this.startBoss();
    }
  }

  private startRoom(room: RoomSpec): void {
    this.current = room;
    this.sealDoors(room.order);
    this.o.events.emit('room-started', room.order, this.totalRooms);
    this.runner = new WaveRunner({
      scene: this.o.scene,
      player: this.o.player,
      factory: this.o.factory,
      scheduler: this.schedulerFor(room),
      rect: room.rect,
      inset: SPAWN_INSET,
      minDistance: MIN_SPAWN_DISTANCE,
      isBlocked: this.o.isBlocked,
      onWave: (wave) => this.onWave(wave),
    });
    this.watch.arm();
  }

  private schedulerFor(room: RoomSpec): WaveScheduler {
    const { level } = this.o;
    const curve = curveOf(level);
    const levels = [room.minLevel, room.maxLevel] as const;
    return new WaveScheduler({
      order: room.order,
      totalWaves: wavesInRoom(curve, room.order),
      timing: timingOf(curve),
      plan: (wave) => planWave(level.enemyPool, curve, { order: room.order, wave, levels }, infoOf, Math.random),
      straggler: () => stragglerOf(level.enemyPool, curve, room.order, levels, infoOf, Math.random),
      rng: Math.random,
      sizeOf: (spawn) => spawnSize(spawn.enemyId),
    });
  }

  private onWave(wave: number): void {
    this.o.events.emit('wave-started', wave);
    if (wave >= 2) floatText(this.o.scene, this.o.player.x, this.o.player.y - 20, `Wave ${wave}!`, '#ffd27a', 16, 20, 1100);
  }

  private onStatuesStir(): void {
    floatText(this.o.scene, this.o.player.x, this.o.player.y - 20, 'The statues stir...', '#c8cce0', 12, 16, 1200);
  }

  private onWaveCleared(): void {
    const room = this.current;
    if (!room || this.bossStarted || this.stopped) return;
    this.runner?.stop();
    this.runner = undefined;
    this.cleared.add(room.order);
    this.current = undefined;
    this.o.doors.open(room.order);
    this.o.events.emit('room-cleared', room.order, this.totalRooms);
    floatText(this.o.scene, this.o.player.x, this.o.player.y - 20, 'Room cleared!', '#7dffb0', 16, 20, 1500);
    playSfx(this.o.scene, 'doorOpen');
  }

  private startBoss(): void {
    const arena = this.o.world.bossArena;
    const bossDef = this.o.level.bossId ? getEnemy(this.o.level.bossId) : undefined;
    if (!arena || !bossDef) return;
    this.bossStarted = true;
    this.sealDoors(arena.order);
    this.o.events.emit('boss-started');
    const centre = rectCenter(arena.rect);
    const spawnX = arena.rect.x + arena.rect.w * 0.3;
    this.o.scene.time.delayedCall(BOSS_SPAWN_DELAY_MS, () => {
      if (!this.stopped) this.o.factory.spawnBoss(bossDef, this.o.level.bossLevel ?? 5, spawnX, centre.y, { rect: arena.rect, thrones: this.o.world.thrones, isBlocked: this.o.isBlocked });
    });
  }

  private onBossDied(): void {
    const arena = this.o.world.bossArena;
    if (arena) this.o.doors.open(arena.order);
  }

  private sealDoors(order: number): void {
    this.o.doors.close(order);
    feel.shake(140, 0.005);
    playSfx(this.o.scene, 'doorClose');
  }
}
