import Phaser from 'phaser';
import { getEnemy, type EnemyDef } from '../content/enemies';
import { Boss, type BossHooks } from '../entities/Boss';
import { Enemy, type EnemyContext, type EnemyExtras } from '../entities/Enemy';
import { assignHound } from '../entities/behaviours/hounds';
import { linkTwins } from '../entities/behaviours/twin';
import type { EnemyWorld } from '../entities/behaviours/types';
import type { Affix } from '../logic/elites';
import { Graveyard } from '../logic/graveyard';
import { findClearSpot, packCount, scatterAround } from '../logic/pack';
import { bodyClear } from '../logic/lineOfSight';
import { blockedByRects } from '../logic/spawnAvoid';
import { insetRect, rectContains, type Point, type Rect } from '../logic/geometry';
import { pickEmergePoint, pickRectSpawn, pickThrone } from '../logic/spawnPoints';

const FADE_IN_MS = 300;
/** Monsters arriving from a spawn marker cannot act or hurt for this long. */
const SPAWN_GRACE_MS = 500;
const BOSS_FADE_IN_MS = 700;
/** Pieces of a split boss pop in quickly and cannot act for a moment. */
const PIECE_FADE_IN_MS = 200;
const PIECE_GRACE_MS = 600;
const MINION_RADIUS = 36;
const MINION_INSET = 24;
const EMERGE_OFFSET = 18;
const TELEPORT_MIN_DISTANCE = 120;
const CORPSE_LIFETIME_MS = 14_000;
const PACK_RADIUS = 26;
const TWIN_GAP = 16;
const CLEAR_RADIUS = 16;
const BODY_RADIUS = 6;

export interface BossArea {
  rect: Rect;
  /** Teleport destinations for bosses that blink between thrones. */
  thrones: readonly Point[];
  isBlocked: (x: number, y: number) => boolean;
}

/** Creates enemies into the shared physics group with a fade-in during which they cannot hurt the player. */
export class EnemyFactory {
  /** What monsters can ask of the level (living monsters, spawning, the graveyard). */
  readonly world: EnemyWorld;
  private readonly context: EnemyContext;
  private readonly blocked: (x: number, y: number) => boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly group: Phaser.Physics.Arcade.Group,
    context: EnemyContext,
    bolts?: Phaser.Physics.Arcade.Group,
    avoid: readonly Rect[] = [],
  ) {
    this.blocked = blockedByRects(avoid, context.isBlocked ?? (() => false));
    this.world = {
      all: () => this.living(),
      spawn: (id, lvl, x, y, options) => this.spawn(getEnemy(id), lvl, x, y, options),
      graveyard: new Graveyard(CORPSE_LIFETIME_MS),
      clearSpot: (p) => findClearSpot(p, CLEAR_RADIUS, Math.random, (x, y) => bodyClear({ x, y }, BODY_RADIUS, this.blocked)),
      bolts,
    };
    this.context = { ...context, world: this.world };
  }

  /** Walls and closed doors only (hazard footprints do not count), the test wall-mounted monsters snap to. */
  isWall = (x: number, y: number): boolean => this.context.isBlocked?.(x, y) ?? false;

  living(): Enemy[] {
    return (this.group.getChildren() as Enemy[]).filter((e) => e.alive);
  }

  spawn(def: EnemyDef, level: number, x: number, y: number, extras?: EnemyExtras, graceMs = FADE_IN_MS): Enemy {
    return this.fadeIn(new Enemy(this.scene, x, y, def, level, this.context, extras), FADE_IN_MS, graceMs);
  }

  /** Spawns a def as a whole encounter: single monsters as themselves, packs as their members around the point (a houndmaster brings his hounds). */
  spawnGroup(def: EnemyDef, level: number, x: number, y: number, affix?: Affix): Enemy[] {
    const { pack } = def;
    if (!pack) return [this.spawn(def, level, x, y, { affix }, SPAWN_GRACE_MS)];
    const member = getEnemy(pack.member);
    const memberLevel = Math.max(1, level - (pack.levelDrop ?? 0));
    const count = packCount(pack.count, Math.random);
    const spots = member.custom === 'twin'
      ? [{ x: x - TWIN_GAP, y }, { x: x + TWIN_GAP, y }]
      : scatterAround({ x, y }, count, PACK_RADIUS, Math.random, this.blocked);
    const leader = pack.leader ? this.spawn(def, level, x, y, { affix }, SPAWN_GRACE_MS) : undefined;
    const members = spots.map((spot, i) => this.spawn(member, memberLevel, spot.x, spot.y, i === 0 && !leader ? { affix } : undefined, SPAWN_GRACE_MS));
    if (leader) for (const hound of members) assignHound(leader, hound);
    if (member.custom === 'twin' && members.length === 2) linkTwins(members[0]!, members[1]!);
    return leader ? [leader, ...members] : members;
  }

  spawnBoss(def: EnemyDef, level: number, x: number, y: number, area: BossArea): Boss {
    const hooks: BossHooks = {
      piece: (id, lvl, px, py, hp, family, pieceId) => this.fadeIn(new Boss(this.scene, px, py, getEnemy(id), lvl, this.context, hooks, { family, id: pieceId, hp }), PIECE_FADE_IN_MS, PIECE_GRACE_MS),
      summon: (id: string, lvl: number, sx: number, sy: number) => {
        const at = this.minionSpot(area, sx, sy);
        this.spawn(getEnemy(id), lvl, at.x, at.y);
      },
      emergeSpot: (x: number, y: number) => pickEmergePoint(area.rect, { x, y }, EMERGE_OFFSET, Math.random, area.isBlocked, MINION_INSET),
      aliveCount: (enemyId: string) => (this.group.getChildren() as Enemy[]).filter((e) => e.alive && e.def.id === enemyId).length,
      teleportSpot: (last: Point | null, avoid: Point, avoidRadius: number) => {
        const throne = pickThrone(area.thrones, last, avoid, Math.random, avoidRadius);
        return throne ? pickEmergePoint(area.rect, throne, 0, Math.random, area.isBlocked, MINION_INSET) : pickRectSpawn(area.rect, avoid, TELEPORT_MIN_DISTANCE, Math.random, area.isBlocked, MINION_INSET);
      },
    };
    return this.fadeIn(new Boss(this.scene, x, y, def, level, this.context, hooks), BOSS_FADE_IN_MS);
  }

  /** A free spot next to the boss inside the arena; falls back to anywhere free in the arena. */
  private minionSpot(area: BossArea, x: number, y: number): { x: number; y: number } {
    const inner = insetRect(area.rect, MINION_INSET);
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const spot = { x: x + Math.cos(angle) * MINION_RADIUS, y: y + Math.sin(angle) * MINION_RADIUS };
      if (rectContains(inner, spot) && !area.isBlocked(spot.x, spot.y)) return spot;
    }
    return pickRectSpawn(area.rect, { x, y }, MINION_RADIUS, Math.random, area.isBlocked, MINION_INSET);
  }

  private fadeIn<T extends Enemy>(enemy: T, duration: number, graceMs = duration): T {
    this.group.add(enemy);
    enemy.setAlpha(0);
    enemy.armed = false;
    this.scene.tweens.add({ targets: enemy, alpha: 1, duration });
    this.scene.tweens.addCounter({ from: 0, to: 1, duration: Math.max(duration, graceMs), onComplete: () => (enemy.armed = true) });
    return enemy;
  }
}
