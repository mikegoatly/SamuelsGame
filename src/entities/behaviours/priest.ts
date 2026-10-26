import { rangedStance } from '../../logic/enemyAi';
import { healAmount, pickHealTarget, pickWardTarget, type SupportTarget } from '../../logic/support';
import { floatText } from '../../systems/floatText';
import { playSfx } from '../../systems/sfx';
import { lightningBolt } from '../../systems/skills/skillFx';
import { directionTo, distanceTo, shootBolt, stand } from './steer';
import type { BehaviourFactory } from './types';

const REACH = 95;
const CAST_EVERY_MS = 2300;
const WARD_SHARE = 0.35;
const WARD_MS = 7000;
const NEAR = 110;
const FAR = 160;
const HEAL_COLOUR = 0x7dffb0;
const WARD_COLOUR = 0x7aa8ff;

/** Hangs back and mends its pack: heals the most hurt ally in reach, otherwise shields the nearest unshielded one. Kill it first. */
export const priest: BehaviourFactory = (host, world) => {
  let readyAt = host.clock.now + 1500;
  let nextBolt = host.clock.now + 2500;

  const cast = (time: number): void => {
    const allies = world.all().filter((e) => e !== host && e.targetable && !e.def.boss);
    const targets: SupportTarget[] = allies.map((e) => ({ x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, warded: e.mods.ward !== null }));
    const heal = pickHealTarget(targets, host, REACH);
    const ward = heal < 0 ? pickWardTarget(targets, host, REACH) : -1;
    const chosen = heal >= 0 ? allies[heal] : allies[ward];
    if (!chosen) return;
    readyAt = time + CAST_EVERY_MS;
    lightningBolt(host.scene, [host, chosen], heal >= 0 ? HEAL_COLOUR : WARD_COLOUR, 260);
    if (heal >= 0) chosen.heal(healAmount(chosen.maxHp));
    else {
      chosen.mods.grantWard(Math.max(1, Math.round(chosen.maxHp * WARD_SHARE)), WARD_MS);
      floatText(host.scene, chosen.x, chosen.y - chosen.displayHeight / 2 - 6, 'Shielded', '#7aa8ff', 8, 12, 600);
    }
    playSfx(host.scene, 'heal');
  };

  return {
    act(time) {
      const distance = distanceTo(host, host.target);
      const stance = rangedStance(distance, NEAR, FAR);
      const speed = host.def.speed * host.speedFactor;
      if (stance === 'approach') host.chase(time);
      else if (stance === 'retreat') {
        const d = directionTo(host, host.target);
        host.setVelocity(-d.x * speed, -d.y * speed);
      } else stand(host);
      host.setFlipX(host.target.x < host.x);
      if (!host.armed) return;
      if (time >= readyAt) cast(time);
      if (time >= nextBolt && distance < 220) {
        nextBolt = time + 3400;
        shootBolt(host, directionTo(host, host.target), host.def.shotSpeed ?? 70, 250, { tint: 0xf0e090 });
        playSfx(host.scene, 'enemyShot', { rate: 0.8 });
      }
    },
  };
};
