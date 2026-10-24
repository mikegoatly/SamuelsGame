import { FIREBALL } from '../logic/fireball';
import { MAX_SKILL_LEVEL } from '../logic/save';

export { MAX_SKILL_LEVEL };

/** One entry per skill level 1..5; later phases add the upgrade UI and economy, stats already read from here. */
export type PerLevel<T> = readonly [T, T, T, T, T];

/** True from skill level 5, where each skill gains its unique twist. */
interface Twisted {
  twist: boolean;
}

export interface FireballParams extends Twisted {
  damage: number;
  radius: number;
  edgeDamage: number;
  speed: number;
  range: number;
}
export interface NovaParams extends Twisted {
  damage: number;
  radius: number;
  slowFactor: number;
  slowMs: number;
}
export interface ChainParams extends Twisted {
  damage: number;
  coneDeg: number;
  coneRange: number;
  jumps: number;
  jumpRange: number;
  falloff: number;
}
export interface ShieldParams extends Twisted {
  durationMs: number;
  absorb: number;
  radius: number;
}
export interface BlinkParams extends Twisted {
  distance: number;
  damage: number;
  width: number;
  iframesMs: number;
}
export interface BoomerangParams extends Twisted {
  damage: number;
  range: number;
  speed: number;
}
export interface CloudParams extends Twisted {
  damagePerTick: number;
  tickMs: number;
  radius: number;
  durationMs: number;
  range: number;
}
export interface WolfParams extends Twisted {
  durationMs: number;
  biteDamage: number;
  biteEveryMs: number;
  speed: number;
  /** Wolves summoned per cast. */
  count: number;
}
export interface MeteorParams extends Twisted {
  damage: number;
  radius: number;
  edgeDamage: number;
  delayMs: number;
  range: number;
}
export interface WellParams extends Twisted {
  radius: number;
  durationMs: number;
  pullSpeed: number;
  damagePerTick: number;
  tickMs: number;
  range: number;
  collapseDamage: number;
}

interface SkillBase {
  id: string;
  name: string;
  description: string;
  /** Texture key of the generated icon (see PreloadScene). */
  icon: string;
  /** Accent colour for the HUD, cards and effects. */
  color: number;
  cooldownMs: PerLevel<number>;
  maxLevel: typeof MAX_SKILL_LEVEL;
}

export type FireballSkill = SkillBase & { kind: 'projectile'; params: PerLevel<FireballParams> };
export type NovaSkill = SkillBase & { kind: 'nova'; params: PerLevel<NovaParams> };
export type ChainSkill = SkillBase & { kind: 'chain'; params: PerLevel<ChainParams> };
export type ShieldSkill = SkillBase & { kind: 'shield'; params: PerLevel<ShieldParams> };
export type BlinkSkill = SkillBase & { kind: 'blink'; params: PerLevel<BlinkParams> };
export type BoomerangSkill = SkillBase & { kind: 'boomerang'; params: PerLevel<BoomerangParams> };
export type CloudSkill = SkillBase & { kind: 'cloud'; params: PerLevel<CloudParams> };
export type WolfSkill = SkillBase & { kind: 'wolf'; params: PerLevel<WolfParams> };
export type MeteorSkill = SkillBase & { kind: 'meteor'; params: PerLevel<MeteorParams> };
export type WellSkill = SkillBase & { kind: 'well'; params: PerLevel<WellParams> };
/** Skills cast by `skills/extraCasters` (everything beyond the original five). */
export type ExtraSkill = BoomerangSkill | CloudSkill | WolfSkill | MeteorSkill | WellSkill;
export type SkillDef = FireballSkill | NovaSkill | ChainSkill | ShieldSkill | BlinkSkill | ExtraSkill;

const levels = <T>(make: (index: number) => T): PerLevel<T> => [make(0), make(1), make(2), make(3), make(4)];
const twist = (index: number): boolean => index >= MAX_SKILL_LEVEL - 1;
const grow = (base: number, perLevel: number) => (index: number): number => Math.round(base * (1 + perLevel * index) * 10) / 10;

const fireballCooldown = grow(FIREBALL.cooldownMs, -0.06);
const fireballDamage = grow(FIREBALL.damage, 0.2);
const fireballRadius = grow(FIREBALL.radius, 0.08);

export const fireball: FireballSkill = {
  id: 'fireball',
  name: 'Fireball',
  description: 'Hurl a slow fireball that explodes on impact, burning everything nearby.',
  icon: 'skill-fireball',
  color: 0xff7a2a,
  kind: 'projectile',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(fireballCooldown),
  params: levels((i) => ({ damage: fireballDamage(i), radius: fireballRadius(i), edgeDamage: FIREBALL.edgeDamage, speed: FIREBALL.speed, range: FIREBALL.range, twist: twist(i) })),
};

export const frostNova: NovaSkill = {
  id: 'frostNova',
  name: 'Frost Nova',
  description: 'A freezing ring bursts around you, hurting enemies and slowing them by half for 3 seconds.',
  icon: 'skill-frostNova',
  color: 0x7ad8ff,
  kind: 'nova',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(8000, -0.06)),
  params: levels((i) => ({ damage: grow(10, 0.2)(i), radius: grow(56, 0.08)(i), slowFactor: 0.5, slowMs: grow(3000, 0.08)(i), twist: twist(i) })),
};

export const chainLightning: ChainSkill = {
  id: 'chainLightning',
  name: 'Chain Lightning',
  description: 'Lightning strikes the nearest enemy in front of you, then leaps to up to 4 more nearby.',
  icon: 'skill-chainLightning',
  color: 0xfff27a,
  kind: 'chain',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(5000, -0.06)),
  params: levels((i) => ({ damage: grow(16, 0.2)(i), coneDeg: 70, coneRange: 120, jumps: 4, jumpRange: 70, falloff: 0.85, twist: twist(i) })),
};

export const arcaneShield: ShieldSkill = {
  id: 'arcaneShield',
  name: 'Arcane Shield',
  description: 'A bubble for 3 seconds that destroys enemy bolts and soaks up damage.',
  icon: 'skill-arcaneShield',
  color: 0x8ab4ff,
  kind: 'shield',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(12000, -0.06)),
  params: levels((i) => ({ durationMs: grow(3000, 0.07)(i), absorb: grow(40, 0.25)(i), radius: 20, twist: twist(i) })),
};

export const blinkStrike: BlinkSkill = {
  id: 'blinkStrike',
  name: 'Blink Strike',
  description: 'Teleport up to 90 pixels toward your aim, stopping at walls, damaging enemies on the way.',
  icon: 'skill-blinkStrike',
  color: 0xc08cff,
  kind: 'blink',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(7000, -0.06)),
  params: levels((i) => ({ distance: 90, damage: grow(18, 0.2)(i), width: 8, iframesMs: 400, twist: twist(i) })),
};

export const boomerangBlade: BoomerangSkill = {
  id: 'boomerangBlade',
  name: 'Boomerang Blade',
  description: 'Throw a spinning blade that cuts everything on the way out and again on the way back.',
  icon: 'skill-boomerangBlade',
  color: 0xd0d8e8,
  kind: 'boomerang',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(3500, -0.06)),
  params: levels((i) => ({ damage: grow(14, 0.2)(i), range: 140, speed: grow(250, 0.04)(i), twist: twist(i) })),
};

export const poisonCloud: CloudSkill = {
  id: 'poisonCloud',
  name: 'Poison Cloud',
  description: 'Leave a toxic cloud for 4 seconds that poisons everything inside it.',
  icon: 'skill-poisonCloud',
  color: 0x7adf4a,
  kind: 'cloud',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(9000, -0.06)),
  params: levels((i) => ({ damagePerTick: grow(4, 0.2)(i), tickMs: 500, radius: grow(60, 0.08)(i), durationMs: grow(4000, 0.07)(i), range: 70, twist: twist(i) })),
};

export const spiritWolf: WolfSkill = {
  id: 'spiritWolf',
  name: 'Spirit Wolf',
  description: 'Summon a ghostly wolf for 10 seconds that hunts the nearest enemy and bites it.',
  icon: 'skill-spiritWolf',
  color: 0x9ad8ff,
  kind: 'wolf',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(14000, -0.06)),
  params: levels((i) => ({ durationMs: grow(10000, 0.05)(i), biteDamage: grow(10, 0.2)(i), biteEveryMs: 700, speed: grow(105, 0.04)(i), count: twist(i) ? 2 : 1, twist: twist(i) })),
};

export const meteor: MeteorSkill = {
  id: 'meteor',
  name: 'Meteor',
  description: 'Call down a meteor on the marked spot. It lands after one second with a huge blast.',
  icon: 'skill-meteor',
  color: 0xff5a2a,
  kind: 'meteor',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(12000, -0.06)),
  params: levels((i) => ({ damage: grow(60, 0.2)(i), radius: grow(44, 0.08)(i), edgeDamage: 0.5, delayMs: 1000, range: 120, twist: twist(i) })),
};

export const gravityWell: WellSkill = {
  id: 'gravityWell',
  name: 'Gravity Well',
  description: 'Open a vortex that drags enemies into one spot for 2 seconds. Bosses resist it.',
  icon: 'skill-gravityWell',
  color: 0x3fe0c0,
  kind: 'well',
  maxLevel: MAX_SKILL_LEVEL,
  cooldownMs: levels(grow(11000, -0.06)),
  params: levels((i) => ({ radius: grow(70, 0.08)(i), durationMs: 2000, pullSpeed: grow(70, 0.08)(i), damagePerTick: grow(3, 0.2)(i), tickMs: 500, range: 90, collapseDamage: grow(35, 0.2)(i), twist: twist(i) })),
};

/** In scroll-drop and menu order. */
export const skillList: readonly SkillDef[] = [fireball, frostNova, chainLightning, boomerangBlade, arcaneShield, poisonCloud, spiritWolf, blinkStrike, meteor, gravityWell];

export const skills: Readonly<Record<string, SkillDef>> = Object.fromEntries(skillList.map((skill) => [skill.id, skill]));

export const skillIds: readonly string[] = skillList.map((skill) => skill.id);

export const getSkill = (id: string): SkillDef | undefined => (Object.hasOwn(skills, id) ? skills[id] : undefined);

/** Owned ids that are real skills (stale or junk save entries are ignored). */
export const knownSkillIds = (owned: readonly string[]): string[] => owned.filter((id) => Object.hasOwn(skills, id));

export const clampSkillLevel = (level: number): number => Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.floor(level)));

/** Cooldown for a skill at `level`. */
export const skillCooldown = (skill: SkillDef, level: number): number => skill.cooldownMs[clampSkillLevel(level) - 1]!;

/** Params for a skill at `level`, typed by the skill's own kind. */
export const skillParams = <S extends SkillDef>(skill: S, level: number): S['params'][number] => skill.params[clampSkillLevel(level) - 1]!;
