import Phaser from 'phaser';
import { getEnemy } from '../content/enemies';
import type { LevelConfig } from '../content/levels';
import type { Player } from '../entities/Player';
import { insetRect, rectCenter, rectContains } from '../logic/geometry';
import { findRoomAt, roomWaves } from '../logic/roomFlow';
import { pickRectSpawn } from '../logic/spawnPoints';
import type { LevelObjects, RoomSpec } from '../logic/tiledObjects';
import { pickWeighted } from '../logic/weighted';
import type { DoorLayer } from './DoorLayer';
import type { EnemyFactory } from './EnemyFactory';
import type { GameEvents } from './GameEvents';
import type { LevelDirector } from './LevelDirector';
import { floatText } from './floatText';
import { feel } from './feel';
import { playSfx } from './sfx';

const TRIGGER_INSET = 16;
const SPAWN_INSET = 24;
const MIN_SPAWN_DISTANCE = 90;
const NEXT_WAVE_DELAY_MS = 1500;
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
  private wave = 0;
  private remaining = 0;
  private bossStarted = false;
  private stopped = false;

  constructor(private readonly o: RoomFlowOptions) {
    o.events.on('enemy-died', () => this.onEnemyDied());
    o.events.on('boss-died', () => this.onBossDied());
  }

  get totalRooms(): number {
    return this.o.world.rooms.length;
  }

  start(): void {
    this.o.scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  stop(): void {
    this.stopped = true;
    this.o.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
  }

  progressLabel(): string {
    if (this.bossStarted) return 'the boss';
    return `room ${this.current?.order ?? Math.min(this.totalRooms, this.cleared.size + 1)}`;
  }

  private update(): void {
    const { player, world } = this.o;
    if (this.stopped || player.dead || this.current || this.bossStarted) return;
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
    this.startWave(1);
  }

  private startWave(wave: number): void {
    const room = this.current;
    if (!room || this.stopped) return;
    this.wave = wave;
    const levels = roomWaves(room)[wave - 1] ?? [];
    this.remaining = levels.length;
    for (const level of levels) {
      const def = getEnemy(pickWeighted(this.o.level.enemyPool, Math.random)?.enemyId ?? '');
      const { x, y } = pickRectSpawn(room.rect, this.o.player, MIN_SPAWN_DISTANCE, Math.random, this.o.isBlocked, SPAWN_INSET);
      this.o.factory.spawn(def, level, x, y);
    }
  }

  private onEnemyDied(): void {
    const room = this.current;
    if (!room || this.bossStarted) return;
    if (--this.remaining > 0) return;
    if (this.wave < room.waves) {
      this.o.scene.time.delayedCall(NEXT_WAVE_DELAY_MS, () => this.startWave(this.wave + 1));
      return;
    }
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
