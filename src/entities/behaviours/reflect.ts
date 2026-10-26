import { damageToPlayer } from '../../logic/combat';
import { reflectDirection, reflectsBolt } from '../../logic/reflect';
import { playSfx } from '../../systems/sfx';
import { sparkBurst } from '../../systems/skills/skillFx';
import type { Enemy } from '../Enemy';
import type { Projectile } from '../Projectile';

const REFLECT_SPEED = 130;
const REFLECT_RANGE = 280;
const MIRROR_TINT = 0xa8f0ff;

/** A mirror knight's front throws a player's bolt straight back as a hostile one; hits from behind or the side land normally. */
export function reflectBolt(host: Enemy, bolt: Projectile): boolean {
  const { shield, reflect } = host.def;
  if (!shield || !reflect || !bolt.body) return false;
  if (!reflectsBolt(host.facingAngle, host, bolt, shield.arc)) return false;
  const back = reflectDirection(bolt.body.velocity);
  const damage = Math.max(1, Math.round(damageToPlayer(host.def.baseDamage, host.level, host.target.level) * reflect.damageScale));
  host.shots.fire(bolt.x, bolt.y, back.x, back.y, REFLECT_SPEED, damage, REFLECT_RANGE, { tint: MIRROR_TINT, scale: 1.25 });
  sparkBurst(host.scene, bolt.x, bolt.y, MIRROR_TINT, 5, 50);
  playSfx(host.scene, 'mirror');
  host.flashShield();
  bolt.kill();
  return true;
}
