import { grantSkill, grantWeapon, type SaveData } from './save';
import { recordBossKill, type RunRecord } from './unlocks';

/** What a hero brings along when unlocked: its signature weapon and an optional starting skill. */
export interface HeroKit {
  weaponId?: string;
  skillId?: string;
}

const NOTICE_PREFIX = 'hero:';

export const heroNoticeId = (heroId: string): string => `${NOTICE_PREFIX}${heroId}`;

export const selectHero = (save: SaveData, heroId: string): SaveData =>
  save.heroes.unlocked.includes(heroId) ? { ...save, heroes: { ...save.heroes, selected: heroId } } : save;

/** Unlocks heroes (once), owns their kit at level 1 without changing the equipped weapon, and queues a reveal card for each. */
export function unlockHeroes(save: SaveData, heroIds: readonly string[], kitOf: (heroId: string) => HeroKit | undefined): SaveData {
  let next = save;
  for (const id of heroIds) {
    if (next.heroes.unlocked.includes(id)) continue;
    const kit = kitOf(id);
    if (kit?.weaponId) next = grantWeapon(next, kit.weaponId, false);
    if (kit?.skillId) next = grantSkill(next, kit.skillId);
    const notice = heroNoticeId(id);
    const pendingNotices = next.seen.includes(notice) || next.pendingNotices.includes(notice) ? next.pendingNotices : [...next.pendingNotices, notice];
    next = { ...next, heroes: { ...next.heroes, unlocked: [...next.heroes.unlocked, id] }, pendingNotices };
  }
  return next;
}

/** Hero ids whose "New hero unlocked!" card has not been seen yet. */
export const pendingHeroReveals = (save: SaveData): string[] =>
  save.pendingNotices.filter((id) => id.startsWith(NOTICE_PREFIX) && !save.seen.includes(id)).map((id) => id.slice(NOTICE_PREFIX.length));

/** Adds a finished (or abandoned) run to the lifetime totals. */
export function bankRun(save: SaveData, record: RunRecord, goldPeak: number): SaveData {
  const bossKillsByHero = record.cleared && record.bossKilled ? recordBossKill(save.stats.bossKillsByHero, record.heroId, record.bossKilled) : save.stats.bossKillsByHero;
  return {
    ...save,
    stats: { totalKills: save.stats.totalKills + record.kills, goldPeak: Math.max(save.stats.goldPeak, goldPeak), bossKillsByHero },
  };
}
