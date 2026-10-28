import { Tex } from './assetKeys';
import { motherSludgeBrain, sludgelingBrain, sludgeletBrain } from './bosses';
import type { EnemyDef } from './enemies';

/** Mother Sludge and the pieces she splits into (see logic/bossSplit). Pieces are spawned with their share of her health, so their `baseHp` is only a reference. */
export const motherSludge: EnemyDef = {
  id: 'motherSludge',
  name: 'Mother Sludge',
  frame: 0,
  texture: Tex.sewer,
  textureFrame: 4,
  baseHp: 1150,
  baseDamage: 10,
  speed: 24,
  behaviour: 'boss',
  lootTableId: 'motherSludge',
  scale: 3,
  boss: true,
  tier: 0,
  brain: motherSludgeBrain,
  slamDamage: 12,
  boltDamage: 9,
  boltSpeed: 62,
  tip: 'She splits in two when hurt. Keep hitting the pieces so they cannot join up again!',
};

export const sludgeling: EnemyDef = {
  ...motherSludge,
  id: 'sludgeling',
  textureFrame: 5,
  name: 'Sludgeling',
  baseHp: 600,
  baseDamage: 7,
  speed: 38,
  scale: 2,
  tier: 1,
  brain: sludgelingBrain,
  slamDamage: 8,
  boltDamage: 7,
  boltSpeed: 66,
  tip: undefined,
};

export const sludgelet: EnemyDef = {
  ...sludgeling,
  id: 'sludgelet',
  textureFrame: 4,
  name: 'Sludgelet',
  baseHp: 300,
  baseDamage: 5,
  speed: 52,
  scale: 1.5,
  tier: 2,
  brain: sludgeletBrain,
  slamDamage: 6,
  boltDamage: 6,
  boltSpeed: 70,
};

export const sludgeBoss: EnemyDef[] = [motherSludge, sludgeling, sludgelet];
