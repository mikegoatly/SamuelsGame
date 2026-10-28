import type Phaser from 'phaser';
import { getEnemy } from '../content/enemies';
import type { Player } from '../entities/Player';
import type { Point, Rect } from '../logic/geometry';
import { markerSpread, roomReady, spawnDistanceFor } from '../logic/groupSize';
import { wallMountSpot } from '../logic/wallMount';
import { pickRoleSpawn, type SpawnRole } from '../logic/spawnPoints';
import { playerOnMarker } from '../logic/spawnMarker';
import { pickBehindSpawn, type ScheduledSpawn, type WaveScheduler } from '../logic/waveSchedule';
import type { EnemyFactory } from './EnemyFactory';
import { SpawnMarkers } from './SpawnMarkers';
import { feel } from './feel';
import { playSfx } from './sfx';
import { spawnSize } from './spawnSize';
import { TILE_SIZE } from '../content/assetKeys';

const MARKER_CLEARANCE = 26;
const RELOCATED_MARKER_MS = 500;
const MOUNT_SEARCH_TILES = 8;
const MOUNT_ATTEMPTS = 8;
const MOUNT_GAP = 3 * TILE_SIZE;

export interface WaveRunnerOptions {
  scene: Phaser.Scene;
  player: Player;
  factory: EnemyFactory;
  scheduler: WaveScheduler;
  rect: Rect;
  inset: number;
  minDistance: number;
  isBlocked: (x: number, y: number) => boolean;
  onWave: (wave: number) => void;
}

/** Feeds one scheduler from the game clock: announces waves, telegraphs each arrival with a marker, then spawns it. */
export class WaveRunner {
  private readonly markers: SpawnMarkers;
  /** Wall spots already given to a pipe spitter, so two never stack. */
  private readonly mounts: Point[] = [];
  private lastNow?: number;
  private stopped = false;

  constructor(private readonly o: WaveRunnerOptions) {
    this.markers = new SpawnMarkers(o.scene);
  }

  /** Every planned wave is out, every marker has landed. */
  get released(): boolean {
    return roomReady(this.o.scheduler.allReleased, this.markers.pending);
  }

  get nextWaveProgress(): number | undefined {
    return this.stopped ? undefined : this.o.scheduler.nextWaveProgress;
  }

  update(): void {
    const { player, scheduler, factory } = this.o;
    if (this.stopped) return;
    if (player.dead || feel.isLocked) return this.stop();
    const now = player.now;
    const dtMs = this.lastNow === undefined ? 0 : now - this.lastNow;
    this.lastNow = now;
    const alive = factory.living().filter((e) => e.countsForClear).length + this.markers.pendingMonsters;
    for (const event of scheduler.tick({ dtMs, alive })) {
      if (event.kind === 'wave') this.o.onWave(event.wave);
      else this.telegraph(event.spawn, now);
    }
    this.markers.update(now);
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.markers.destroy();
  }

  private telegraph(spawn: ScheduledSpawn, now: number): void {
    const size = spawnSize(spawn.enemyId);
    const spread = markerSpread(size);
    const arrive = (at: Point): void => {
      if (this.stopped) return;
      if (playerOnMarker(at, this.o.player, MARKER_CLEARANCE + spread)) {
        this.markers.add(this.pick(spawn.role, size, spawn.enemyId), this.o.player.now, arrive, size, spread, RELOCATED_MARKER_MS);
        return;
      }
      this.o.factory.spawnGroup(getEnemy(spawn.enemyId), spawn.level, at.x, at.y, spawn.affix);
      if (spawn.affix) playSfx(this.o.scene, 'eliteSpawn');
    };
    this.markers.add(this.pick(spawn.role, size, spawn.enemyId), now, arrive, size, spread);
  }

  /** Wall-mounted monsters (pipe spitters) get their marker on the wall edge they will sit on. */
  private pick(role: SpawnRole | 'behind', size: number, enemyId: string): Point {
    let at = this.pickOpen(role, size);
    if (getEnemy(enemyId).custom !== 'spitter') return at;
    for (let attempt = 0; attempt < MOUNT_ATTEMPTS; attempt++) {
      const mount = wallMountSpot(at, this.o.isBlocked, TILE_SIZE, MOUNT_SEARCH_TILES);
      if (!mount) return at;
      const taken = this.mounts.some((m) => Math.hypot(m.x - mount.x, m.y - mount.y) < MOUNT_GAP);
      if (!taken || attempt === MOUNT_ATTEMPTS - 1) {
        this.mounts.push(mount);
        return { x: mount.x, y: mount.y };
      }
      at = this.pickOpen(role, size);
    }
    return at;
  }

  private pickOpen(role: SpawnRole | 'behind', size: number): Point {
    const { rect, player, isBlocked, inset } = this.o;
    const minDistance = spawnDistanceFor(size, this.o.minDistance);
    return role === 'behind'
      ? pickBehindSpawn(rect, player, player.heading, Math.random, isBlocked, inset, minDistance)
      : pickRoleSpawn(rect, player, role, Math.random, isBlocked, inset, minDistance);
  }
}
