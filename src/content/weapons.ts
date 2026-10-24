export interface WeaponDef {
  baseDamage: number;
  fireRateMs: number;
  speed: number;
  range: number;
}

export const magicBolt: WeaponDef = {
  baseDamage: 10,
  fireRateMs: 250,
  speed: 320,
  range: 260,
};
