import { getEnemy, type EnemyDef } from '../src/content/enemies';
import { curveOf, infoOf, DEFAULT_CURVE } from '../src/content/levels/curve';
import type { LevelConfig } from '../src/content/levels';
import { items } from '../src/content/items';
import { lootTables } from '../src/content/lootTables';
import { getWeapon as baseWeapon, weaponAtLevel, type WeaponDef } from '../src/content/weapons';
import { normalBossLevel, heroicBossLevel, heroicLevelRange, heroicRoomRange } from '../src/logic/heroic';
import { BURN, burnTicks } from '../src/logic/burning';
import { damageToEnemy, damageToPlayer, enemyMaxHp, playerMaxHp } from '../src/logic/combat';
import { addLoot, expectedLoot, noLoot, type LootValue } from '../src/logic/lootValue';
import { addXp } from '../src/logic/progression';
import { REFLECT_COOLDOWN_MS } from '../src/logic/reflect';
import { cleaveFactor, weaponProfile, type WeaponProfile } from './weaponProfile';
import { mulberry32 } from '../src/logic/rng';
import { planWave, wavesInRoom, type LevelCurve, type WaveSpawn } from '../src/logic/waveMix';
import { MARKER_MS } from '../src/logic/spawnMarker';
import { expectedGroupSize } from '../src/logic/groupSize';
import { planSurvivalWave, survivalStage, type SurvivalSource } from '../src/logic/survival';
import { stragglerOf } from '../src/logic/straggler';
import { timingOf, WaveScheduler } from '../src/logic/waveSchedule';
import { CLOUD, cloudTicks } from '../src/logic/toad';
import { payLevel, xpReward } from '../src/logic/xp';
import { HAZARD_HITS } from '../src/logic/hazard/hits';
import { hazardCount } from '../src/logic/hazard/plan';
import type { Encounter, MapTheme } from '../src/logic/map/mapThemes';

/** The imagined player the targets are written for: on-level, basic weapon plus a skill or two, dodging about half of what a standing target would eat. */
export interface Reference {
  weaponId: string;
  accuracy: number;
  /** Extra damage from skills on top of the basic attack. */
  skillBoost: number;
  /** Share of incoming hits avoided; a bot that only aims has 0. */
  dodge: number;
  /** Weapon upgrade level; 1 when missing. */
  weaponLevel?: number;
  /** Overrides on the weapon's derived profile (to switch single factors off in comparisons). */
  profile?: Partial<WeaponProfile>;
}

const getWeapon = (ref: Reference) => weaponAtLevel(baseWeapon(ref.weaponId), ref.weaponLevel ?? 1);

/** What the weapon adds beyond damage times rate (multi-hit, knockback, bolt swatting, walking in); neutral for the default wand. Hero passives are not modelled. */
const profileOf = (ref: Reference): WeaponProfile => ({ ...weaponProfile(getWeapon(ref), ref.accuracy), ...ref.profile });

/** Damage per second against one target at the given levels, skills and walking-in time included. */
const attackDps = (weapon: WeaponDef, profile: WeaponProfile, ref: Reference, playerLevel: number, monsterLevel: number, shield?: EnemyDef['shield']): number =>
  damageToEnemy(weapon.baseDamage, playerLevel, monsterLevel) * (profile.rawDps / weapon.baseDamage) * profile.accuracy * profile.uptime * ref.skillBoost * (shield ? (1 + (1 - shield.reduction)) / 2 : 1);

export const REFERENCE: Reference = { weaponId: 'brokenWand', accuracy: 0.6, skillBoost: 1.25, dodge: 0.5 };

/** Scales the hit rates so a standing player matches what the aim-only bot suffered in playtests (palace room 2 about 450, desert room 4 about 470). */
const CALIBRATION = 0.43;
/** Walking to the monsters and picking up loot around each room fight; waves themselves no longer pause between each other. */
const ROOM_WALK_LOOT_S = 3;
const SAMPLES = 24;
const BOSS_XP_BONUS = 100;
const TRANSIT_S = 6;
const START_S = 4;
/** Hits a standing player takes from one instance of each hazard over a room fight. */
const HAZARD_EXPOSURE: Record<keyof typeof HAZARD_HITS, number> = { crackedFloor: 0.4, rubble: 0.5, gasVent: 0.6, gasPipe: 0.6, firePit: 1, arrowWall: 1, pendulum: 0.8, flameJet: 0.6, spikes: 0.8 };

/** Chance that someone passing a fire pit steps in and so keeps burning afterwards (a standing player is in it for good, which HAZARD_EXPOSURE already counts). */
const PIT_STEP_IN_CHANCE = 0.5;

/** Share of max health the burn that lingers after one fire pit costs, on average. */
export const LINGERING_BURN_SHARE = PIT_STEP_IN_CHANCE * burnTicks(BURN.playerMs) * BURN.playerFraction;

/** Share of max health a standing player loses to the room's hazards. */
function hazardShare(theme: Pick<MapTheme, 'hazards' | 'spikePairsPerRoom'>, order: number): number {
  const plan = theme.hazards ?? {};
  let share = 0;
  for (const kind of Object.keys(HAZARD_EXPOSURE) as (keyof typeof HAZARD_HITS)[]) {
    const count = kind === 'spikes' ? (theme.spikePairsPerRoom ?? 0) * 2 : kind in plan ? hazardCount(plan, kind as 'rubble', order) : 0;
    share += count * HAZARD_HITS[kind].fraction * HAZARD_EXPOSURE[kind];
    if (kind === 'firePit') share += count * LINGERING_BURN_SHARE;
  }
  return share;
}

/** Poison ticks of a bloat toad's cloud (a player who stays inside takes them all; BLAST_CHANCE covers who does). */
const TOAD_CLOUD_TICKS = cloudTicks(CLOUD.durationMs, CLOUD.tickMs);

/** Chance a bomb beetle blast lands. */
const BLAST_CHANCE = 0.4;

/** Hits per second a living monster lands on a standing player, hit chance included. */
const MELEE_RATE = 0.9;
const BOLT_RATE = 0.35;
const HIT_RATE: Record<string, number> = {
  chaser: MELEE_RATE,
  erratic: MELEE_RATE,
  charger: 0.5,
  beetle: 0,
  archer: BOLT_RATE / 2.3,
  wisp: 0.25,
  rat: MELEE_RATE,
  necromancer: BOLT_RATE / 2.8,
  shark: 0.2,
  imp: MELEE_RATE,
  turret: 0.35,
  devil: 0.5,
  priest: BOLT_RATE / 2.3,
  jester: 0.15,
  gargoyle: MELEE_RATE,
  twin: 0.3,
  houndmaster: MELEE_RATE,
  hound: MELEE_RATE,
  blob: MELEE_RATE,
  spitter: 0.15,
  toad: 0.25,
  gator: 0.25,
  shroom: 0,
};

/** Slow bodies are easy to kite, so they catch a moving player less often than fast ones. */
const catchUp = (def: EnemyDef): number => Math.min(1, Math.max(0.35, def.speed / 60));

/** Monsters whose damage arrives as bolts a melee swing can swat. */
const BOLT_KINDS: readonly string[] = ['archer', 'wisp', 'necromancer', 'turret', 'priest'];
const throwsBolts = (def: EnemyDef): boolean => def.behaviour === 'ranged' || def.behaviour === 'mage' || BOLT_KINDS.includes(def.custom ?? '');

const rateOf = (def: EnemyDef): number => {
  if (def.behaviour === 'ranged' || def.behaviour === 'mage') return ((def.spread?.count ?? 1) * BOLT_RATE) / ((def.fireEveryMs ?? 2500) / 1000);
  const rate = HIT_RATE[def.custom ?? def.behaviour] ?? MELEE_RATE;
  return rate === MELEE_RATE ? rate * catchUp(def) : rate;
};

export interface MonsterShot {
  def: EnemyDef;
  level: number;
  elite: boolean;
  /** A split half: counts as a kill for xp but drops nothing. */
  half?: boolean;
}

export interface RoomEstimate {
  order: number;
  playerLevel: number;
  /** Damage taken by the reference player. */
  damage: number;
  damagePct: number;
  /** Damage a standing bot would take. */
  standingDamage: number;
  seconds: number;
  monsters: number;
  xp: number;
  loot: LootValue;
}

export interface LevelEstimate {
  rooms: RoomEstimate[];
  /** Whole run: fights, walking between rooms and the boss. */
  runSeconds: number;
  bossSeconds: number;
  endLevel: number;
  bossXp: number;
  totalSeconds: number;
  loot: LootValue;
}

const coinValue = (itemId: string): number => {
  const item = items[itemId];
  return item?.kind === 'coin' ? item.value : 0;
};

const healValue = (itemId: string): number => {
  const item = items[itemId];
  return item?.kind === 'heal' ? item.heal : 0;
};

function expand(spawns: WaveSpawn[]): MonsterShot[] {
  const shots: MonsterShot[] = [];
  for (const spawn of spawns) {
    const def = getEnemy(spawn.enemyId);
    if (!def.pack) {
      shots.push({ def, level: spawn.level, elite: spawn.affix !== undefined });
      if (def.splitInto) for (let i = 0; i < def.splitInto.count; i++) shots.push({ def: getEnemy(def.splitInto.id), level: spawn.level, elite: false, half: true });
      continue;
    }
    const member = getEnemy(def.pack.member);
    const count = Math.round((def.pack.count[0] + def.pack.count[1]) / 2);
    if (def.pack.leader) shots.push({ def, level: spawn.level, elite: false });
    for (let i = 0; i < count; i++) shots.push({ def: member, level: Math.max(1, spawn.level - (def.pack.levelDrop ?? 0)), elite: false });
  }
  return shots;
}

/** Bolts thrown back by a mirror: half the shots meet its front, at most one reflection per cooldown. */
function reflectedPerSecond(def: EnemyDef, level: number, playerLevel: number, accuracy: number, shotsPerSecond: number): number {
  const reflections = Math.min(shotsPerSecond * accuracy * 0.5, 1000 / Math.max(1, REFLECT_COOLDOWN_MS));
  return reflections * damageToPlayer(def.baseDamage, level, playerLevel) * def.reflect!.damageScale * BOLT_RATE;
}

const STEP_S = 0.1;
const MAX_FIGHT_S = 600;

interface Foe {
  shot: MonsterShot;
  arrivedAt: number;
  killSeconds: number;
}

/** Damage a standing player takes per second from one living monster, plus what it does on death. */
function threatOf({ def, level }: MonsterShot, playerLevel: number, profile: WeaponProfile, shotsPerSecond: number): { perSecond: number; onDeath: number } {
  const hits = CALIBRATION * rateOf(def) * damageToPlayer(def.custom === 'jester' ? def.blastDamage! : def.baseDamage, level, playerLevel);
  const survives = throwsBolts(def) ? 1 - profile.boltsBlocked : 1 - profile.contactAvoided;
  let perSecond = hits * survives;
  // Melee fires no bolts (shotsPerSecond 0), so a mirror has nothing to throw back.
  if (def.reflect && shotsPerSecond > 0) perSecond += CALIBRATION * reflectedPerSecond(def, level, playerLevel, profile.accuracy, shotsPerSecond);
  perSecond *= 1 + profile.closeIn;
  const blasts = def.custom === 'toad' ? TOAD_CLOUD_TICKS : def.custom === 'beetle' ? 1 : 0;
  const onDeath = blasts > 0 && def.blastDamage ? damageToPlayer(def.blastDamage, level, playerLevel) * blasts * BLAST_CHANCE * CALIBRATION : 0;
  return { perSecond, onDeath };
}

/**
 * One room played out on the real scheduler: groups trickle in, later waves start on the timer or when the room is nearly clear, and the
 * reference player kills the oldest monster first. Each monster hurts from its arrival until it dies, so overlap (and the cap) shows up as damage.
 */
function roomFight(level: LevelConfig, curve: LevelCurve, order: number, encounter: Encounter, playerLevel: number, ref: Reference, seed: number) {
  const weapon = getWeapon(ref);
  const profile = profileOf(ref);
  const shotsPerSecond = weapon.melee ? 0 : profile.rawDps / weapon.baseDamage;
  const rng = mulberry32(order * 7919 + seed * 104729);
  const scheduler = new WaveScheduler({
    order,
    totalWaves: wavesInRoom(curve, order),
    timing: timingOf(curve),
    plan: (wave) => planWave(level.enemyPool, curve, { order, wave, levels: [encounter.minLevel, encounter.maxLevel] }, infoOf, rng),
    straggler: () => stragglerOf(level.enemyPool, curve, order, [encounter.minLevel, encounter.maxLevel], infoOf, rng),
    sizeOf: (spawn) => expand([{ ...spawn, role: 'any' }]).length,
    rng: mulberry32(seed + 1),
  });
  const alive: Foe[] = [];
  const pending: { arriveAt: number; foes: Foe[] }[] = [];
  const spawned: MonsterShot[] = [];
  const hurt = (foe: Foe, until: number): number => {
    const { perSecond, onDeath } = threatOf(foe.shot, playerLevel, profile, shotsPerSecond);
    return perSecond * (until - foe.arrivedAt) + onDeath;
  };
  let damage = 0;
  let xp = 0;
  let target: Foe | undefined;
  let clock = 0;
  let work = 0;
  const counted = (): number => alive.length + pending.reduce((sum, p) => sum + p.foes.length, 0);
  while (true) {
    if (clock >= MAX_FIGHT_S) throw new Error(`room ${order} of ${level.id} is unwinnable for the reference player (${alive.length} alive after ${MAX_FIGHT_S}s)`);
    for (const event of scheduler.tick({ dtMs: STEP_S * 1000, alive: counted() })) {
      if (event.kind !== 'spawn') continue;
      const arriveAt = clock + MARKER_MS / 1000;
      const foes = expand([{ ...event.spawn, role: 'any' }]).map((shot): Foe => {
        const dps = attackDps(weapon, profile, ref, playerLevel, shot.level, shot.def.shield);
        return { shot, arrivedAt: arriveAt, killSeconds: (enemyMaxHp(shot.def.baseHp, shot.level) * (shot.elite ? 1.3 : 1)) / Math.max(1, dps) };
      });
      pending.push({ arriveAt, foes });
      spawned.push(...foes.map((f) => f.shot));
    }
    while (pending.length > 0 && pending[0]!.arriveAt <= clock) alive.push(...pending.shift()!.foes);
    if (scheduler.allReleased && counted() === 0) break;
    clock += STEP_S;
    target ??= alive[0];
    if (!target) continue;
    work += STEP_S * cleaveFactor(profile.targetsPerHit, alive.length);
    if (work < target.killSeconds) continue;
    damage += hurt(target, clock);
    xp += xpReward(payLevel(target.shot.level, target.shot.def.xpLevelDrop), playerLevel);
    alive.splice(alive.indexOf(target), 1);
    target = undefined;
    work = 0;
  }
  return { damage, seconds: clock + ROOM_WALK_LOOT_S, xp, shots: spawned };
}

export function estimateRoom(level: LevelConfig, order: number, encounter: Encounter, playerLevel: number, ref: Reference = REFERENCE, theme?: Pick<MapTheme, 'hazards' | 'spikePairsPerRoom'>): RoomEstimate {
  const curve = curveOf(level);
  let standing = 0;
  let seconds = 0;
  let xp = 0;
  let monsters = 0;
  let loot = noLoot();
  for (let seed = 0; seed < SAMPLES; seed++) {
    const result = roomFight(level, curve, order, encounter, playerLevel, ref, seed);
    standing += result.damage / SAMPLES;
    seconds += result.seconds / SAMPLES;
    xp += result.xp / SAMPLES;
    monsters += result.shots.length / SAMPLES;
    for (const shot of result.shots) {
      const table = lootTables[shot.def.lootTableId];
      if (table && !shot.half) loot = addLoot(loot, expectedLoot(table, coinValue, shot.elite, healValue), 1 / SAMPLES);
    }
  }
  standing += theme ? hazardShare(theme, order) * playerMaxHp(playerLevel) : 0;
  const damage = standing * (1 - ref.dodge);
  return { order, playerLevel, damage, damagePct: damage / playerMaxHp(playerLevel), standingDamage: standing, seconds, monsters, xp, loot };
}

/** The reference player against the boss: all their basic attacks and skills, at their accuracy. */
function bossFightSeconds(level: LevelConfig, playerLevel: number, ref: Reference): number {
  const weapon = getWeapon(ref);
  const boss = getEnemy(level.bossId!);
  const bossLevel = level.bossLevel ?? 1;
  const dps = attackDps(weapon, profileOf(ref), ref, playerLevel, bossLevel);
  return enemyMaxHp(boss.baseHp, bossLevel) / dps;
}

/** Walks the whole level: player level rises with xp between rooms; the boss adds its bonus and loot. */
export function estimateLevel(level: LevelConfig, encounters: readonly Encounter[], startLevel: number, ref: Reference = REFERENCE, theme?: MapTheme): LevelEstimate {
  let progress = { level: startLevel, xp: 0 };
  let loot = noLoot();
  const rooms: RoomEstimate[] = [];
  encounters.forEach((encounter, i) => {
    const room = estimateRoom(level, i + 1, encounter, progress.level, ref, theme);
    rooms.push(room);
    loot = addLoot(loot, room.loot);
    progress = addXp(progress, room.xp).progress;
  });
  const boss = level.bossId ? getEnemy(level.bossId) : undefined;
  const bossXp = boss ? xpReward(level.bossLevel ?? 1, progress.level) + BOSS_XP_BONUS : 0;
  progress = addXp(progress, bossXp).progress;
  const bossTable = boss ? lootTables[boss.lootTableId] : undefined;
  if (bossTable) loot = addLoot(loot, expectedLoot(bossTable, coinValue, false, healValue));
  const fights = rooms.reduce((sum, r) => sum + r.seconds, 0);
  const bossSeconds = boss ? bossFightSeconds(level, rooms[rooms.length - 1]!.playerLevel, ref) : 0;
  return { rooms, endLevel: progress.level, bossXp, totalSeconds: fights, bossSeconds, runSeconds: START_S + fights + TRANSIT_S * rooms.length + bossSeconds, loot };
}

/**
 * Gear a hero of that level plausibly owns (upgrades are paid with gems and gold earned along the way): the reference weapon at upgrade level 3 by hero 15,
 * 4 by 25 and 5 (max) from 40. Only the weapon is modelled; its damage and rate scale exactly as in game.
 */
export const gearedReference = (heroLevel: number): Reference => ({ ...REFERENCE, weaponLevel: heroLevel >= 40 ? 5 : heroLevel >= 25 ? 4 : heroLevel >= 15 ? 3 : 1 });

/** The level as its Heroic version plays for a hero of `heroLevel`: shifted encounters, boss and monster range. */
export function heroicVariant(level: LevelConfig, encounters: readonly Encounter[], heroLevel: number): { level: LevelConfig; encounters: Encounter[] } {
  const range = level.monsterLevelRange;
  return {
    level: { ...level, monsterLevelRange: heroicLevelRange(range, heroLevel), bossLevel: heroicBossLevel(normalBossLevel(level), heroLevel) },
    encounters: encounters.map((e) => {
      const [minLevel, maxLevel] = heroicRoomRange([e.minLevel, e.maxLevel], range, heroLevel);
      return { ...e, minLevel, maxLevel };
    }),
  };
}

const groupOf = (id: string): number => {
  const { pack } = getEnemy(id);
  return expectedGroupSize(pack, pack ? getEnemy(pack.member).custom === 'twin' : false);
};

/** Share of potion drops the survival hero actually collects while being swarmed. */
const SURVIVAL_PICKUP = 0.7;
const SURVIVAL_MAX_S = 30 * 60;

export interface SurvivalEstimate {
  /** Seconds until the reference player dies; Infinity if they outlast the model's limit. */
  seconds: number;
  stage: number;
  kills: number;
  endLevel: number;
}

/** Heroic Survival played out on the real director: the oldest monster is killed first, every living one hurts, drops heal, xp raises the hero. Dies when health runs out. */
export function estimateSurvival(startLevel: number, ref: Reference, source: SurvivalSource, seed: number): SurvivalEstimate {
  const weapon = getWeapon(ref);
  const profile = profileOf(ref);
  const shotsPerSecond = weapon.melee ? 0 : profile.rawDps / weapon.baseDamage;
  const rng = mulberry32(seed * 7919 + 13);
  const timing = { ...survivalStage(0, startLevel, source).timing };
  let progress = { level: startLevel, xp: 0 };
  let hp = playerMaxHp(startLevel);
  let stage = survivalStage(0, startLevel, source);
  const scheduler = new WaveScheduler({
    order: 1,
    totalWaves: Infinity,
    timing,
    arena: true,
    plan: () => planSurvivalWave(stage, infoOf, rng, groupOf),
    straggler: () => stragglerOf(stage.pool, DEFAULT_CURVE, 1, stage.levels, infoOf, rng),
    sizeOf: (spawn) => expand([{ ...spawn, role: 'any' }]).length,
    rng: mulberry32(seed + 1),
  });
  const alive: Foe[] = [];
  const pending: { arriveAt: number; foes: Foe[] }[] = [];
  let kills = 0;
  let target: Foe | undefined;
  let work = 0;
  let clock = 0;
  const counted = (): number => alive.length + pending.reduce((sum, p) => sum + p.foes.length, 0);
  while (clock < SURVIVAL_MAX_S) {
    stage = survivalStage(clock * 1000, startLevel, source);
    Object.assign(timing, stage.timing);
    for (const event of scheduler.tick({ dtMs: STEP_S * 1000, alive: counted() })) {
      if (event.kind !== 'spawn') continue;
      const arriveAt = clock + MARKER_MS / 1000;
      const foes = expand([{ ...event.spawn, role: 'any' }]).map((shot): Foe => {
        const dps = attackDps(weapon, profile, ref, progress.level, shot.level, shot.def.shield);
        return { shot, arrivedAt: arriveAt, killSeconds: (enemyMaxHp(shot.def.baseHp, shot.level) * (shot.elite ? 1.3 : 1)) / Math.max(1, dps) };
      });
      pending.push({ arriveAt, foes });
    }
    while (pending.length > 0 && pending[0]!.arriveAt <= clock) alive.push(...pending.shift()!.foes);
    clock += STEP_S;
    let incoming = 0;
    for (const foe of alive) incoming += threatOf(foe.shot, progress.level, profile, shotsPerSecond).perSecond;
    hp -= incoming * STEP_S * (1 - ref.dodge);
    if (hp <= 0) return { seconds: clock, stage: stage.index, kills, endLevel: progress.level };
    target ??= alive[0];
    if (!target) continue;
    work += STEP_S * cleaveFactor(profile.targetsPerHit, alive.length);
    if (work < target.killSeconds) continue;
    hp -= threatOf(target.shot, progress.level, profile, shotsPerSecond).onDeath * (1 - ref.dodge);
    const table = lootTables[target.shot.def.lootTableId];
    const heal = table ? expectedLoot(table, coinValue, target.shot.elite, healValue).heal : 0;
    const before = progress.level;
    progress = addXp(progress, xpReward(payLevel(target.shot.level, target.shot.def.xpLevelDrop), progress.level)).progress;
    hp = Math.min(playerMaxHp(progress.level), hp + heal * SURVIVAL_PICKUP + (playerMaxHp(progress.level) - playerMaxHp(before)));
    kills++;
    alive.splice(alive.indexOf(target), 1);
    target = undefined;
    work = 0;
  }
  return { seconds: Infinity, stage: stage.index, kills, endLevel: progress.level };
}
