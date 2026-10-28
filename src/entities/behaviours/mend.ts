import { healAmount, pickHealTarget, pickWardTarget, type SupportTarget } from '../../logic/support';
import { floatText } from '../../systems/floatText';
import { playSfx } from '../../systems/sfx';
import { lightningBolt } from '../../systems/skills/skillFx';
import type { Enemy } from '../Enemy';
import type { EnemyWorld } from './types';

export interface MendTuning {
  reach: number;
  /** Ward strength as a share of the ally's max health. */
  wardShare: number;
  wardMs: number;
  healColour: number;
  wardColour: number;
}

/** One support cast: heals the most hurt ally in reach, otherwise shields the nearest unshielded one. True when something was cast. */
export function mendAlly(host: Enemy, world: EnemyWorld, t: MendTuning): boolean {
  const allies = world.all().filter((e) => e !== host && e.targetable && !e.def.boss);
  const targets: SupportTarget[] = allies.map((e) => ({ x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, warded: e.mods.ward !== null }));
  const heal = pickHealTarget(targets, host, t.reach);
  const ward = heal < 0 ? pickWardTarget(targets, host, t.reach) : -1;
  const chosen = heal >= 0 ? allies[heal] : allies[ward];
  if (!chosen) return false;
  lightningBolt(host.scene, [host, chosen], heal >= 0 ? t.healColour : t.wardColour, 260);
  if (heal >= 0) chosen.heal(healAmount(chosen.maxHp));
  else {
    chosen.mods.grantWard(Math.max(1, Math.round(chosen.maxHp * t.wardShare)), t.wardMs);
    floatText(host.scene, chosen.x, chosen.y - chosen.displayHeight / 2 - 6, 'Shielded', '#7aa8ff', 8, 12, 600);
  }
  playSfx(host.scene, 'heal');
  return true;
}

/** The closest living monster that is not itself a healer, so a support monster knows whom to stay beside. */
export function nearestAlly(host: Enemy, world: EnemyWorld): Enemy | undefined {
  let best: Enemy | undefined;
  let nearest = Infinity;
  for (const e of world.all()) {
    if (e === host || !e.targetable || e.def.boss || e.def.custom === 'shroom') continue;
    const d = Math.hypot(e.x - host.x, e.y - host.y);
    if (d < nearest) {
      best = e;
      nearest = d;
    }
  }
  return best;
}
