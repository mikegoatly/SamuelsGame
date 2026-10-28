import type { BossBrainConfig } from '../src/logic/bossBrain';
import { newBossState, stepBoss } from '../src/logic/bossBrain';
import { damageToPlayer, playerMaxHp } from '../src/logic/combat';

const IFRAMES_MS = 600;
const RING_TRAVEL_MS = 800;
const SEEK_TRAVEL_MS = 1200;
const SEEK_STAGGER_MS = 150;
/** A glob fired at a standing player takes about this long to arrive (they are slow). */
const GLOB_TRAVEL_MS = 1500;

export interface BossDamage {
  boltDamage: number;
  slamDamage: number;
  level: number;
}

type Hit = { at: number; damage: number };

/** Every hit a player who never moves would take from one boss brain at a fixed health ratio. */
function standingHits(config: BossBrainConfig, boss: BossDamage, playerLevel: number, hpRatio: number, limitMs: number): Hit[] {
  const bolt = damageToPlayer(boss.boltDamage, boss.level, playerLevel);
  const slam = damageToPlayer(boss.slamDamage, boss.level, playerLevel);
  const hits: Hit[] = [];
  let state = newBossState(config, 0);
  for (let now = 0; now <= limitMs; now += 50) {
    const step = stepBoss(config, state, now, hpRatio);
    state = step.state;
    for (const a of step.actions) {
      if (a.type === 'lunge' || a.type === 'land') hits.push({ at: now, damage: slam });
      else if (a.type === 'burst') hits.push({ at: now + RING_TRAVEL_MS, damage: bolt });
      else if (a.type === 'spit' && a.arc > 0) hits.push({ at: now + GLOB_TRAVEL_MS, damage: bolt });
      else if (a.type === 'spiral') for (let i = 0; i < a.arms; i++) hits.push({ at: now + RING_TRAVEL_MS + i * 100, damage: bolt });
      else if (a.type === 'seek') for (let i = 0; i < a.count; i++) hits.push({ at: now + SEEK_TRAVEL_MS + i * SEEK_STAGGER_MS, damage: bolt });
    }
  }
  return hits;
}

/** When a player at full health who takes `hits` (i-frames drop hits that land too close together) dies, in seconds. */
function survival(hits: Hit[], playerLevel: number): number {
  hits.sort((x, y) => x.at - y.at);
  let hp = playerMaxHp(playerLevel);
  let safeUntil = 0;
  for (const hit of hits) {
    if (hit.at < safeUntil) continue;
    hp -= hit.damage;
    safeUntil = hit.at + IFRAMES_MS;
    if (hp <= 0) return hit.at / 1000;
  }
  return Infinity;
}

/** Seconds a player who never moves survives against the brain at a fixed boss health ratio. */
export function standingSurvivalSeconds(config: BossBrainConfig, boss: BossDamage, playerLevel: number, hpRatio: number, limitMs = 120_000): number {
  return survival(standingHits(config, boss, playerLevel, hpRatio, limitMs), playerLevel);
}

export interface FamilyMember {
  config: BossBrainConfig;
  boss: BossDamage;
  /** How many of them are attacking at once. */
  count: number;
}

/** The same for a whole group of attackers fighting together (Mother Sludge's pieces); each copy runs its own timers from time 0. */
export function standingGroupSurvivalSeconds(members: FamilyMember[], playerLevel: number, limitMs = 120_000): number {
  const hits = members.flatMap((m) => Array.from({ length: m.count }, (_, i) => standingHits(m.config, m.boss, playerLevel, 1, limitMs).map((h) => ({ ...h, at: h.at + i * 400 }))).flat());
  return survival(hits, playerLevel);
}
