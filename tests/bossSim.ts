import type { BossBrainConfig } from '../src/logic/bossBrain';
import { newBossState, stepBoss } from '../src/logic/bossBrain';
import { damageToPlayer, playerMaxHp } from '../src/logic/combat';

const IFRAMES_MS = 600;
const RING_TRAVEL_MS = 800;
const SEEK_TRAVEL_MS = 1200;
const SEEK_STAGGER_MS = 150;

export interface BossDamage {
  boltDamage: number;
  slamDamage: number;
  level: number;
}

/** Seconds a player who never moves survives against the brain at a fixed boss health ratio; i-frames drop hits that land too close together. */
export function standingSurvivalSeconds(config: BossBrainConfig, boss: BossDamage, playerLevel: number, hpRatio: number, limitMs = 120_000): number {
  const bolt = damageToPlayer(boss.boltDamage, boss.level, playerLevel);
  const slam = damageToPlayer(boss.slamDamage, boss.level, playerLevel);
  const hits: { at: number; damage: number }[] = [];
  let state = newBossState(config, 0);
  for (let now = 0; now <= limitMs; now += 50) {
    const step = stepBoss(config, state, now, hpRatio);
    state = step.state;
    for (const a of step.actions) {
      if (a.type === 'lunge') hits.push({ at: now, damage: slam });
      else if (a.type === 'burst') hits.push({ at: now + RING_TRAVEL_MS, damage: bolt });
      else if (a.type === 'spiral') for (let i = 0; i < a.arms; i++) hits.push({ at: now + RING_TRAVEL_MS + i * 100, damage: bolt });
      else if (a.type === 'seek') for (let i = 0; i < a.count; i++) hits.push({ at: now + SEEK_TRAVEL_MS + i * SEEK_STAGGER_MS, damage: bolt });
    }
  }
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
