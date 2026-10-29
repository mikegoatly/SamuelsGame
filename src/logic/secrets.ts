import { unlockHeroes, type HeroKit } from './heroSave';
import { nextRunsWithoutGrate } from './grate';
import type { SaveData } from './save';

/** Hidden levels that stay off Level Select until found. */
export type SecretId = 'sewer' | 'mines';

/** The hero who lives down the grate. */
export const SEWER_HERO = 'gloop';

/** Finding the grate: the sewer card appears and Gloop unlocks (his reveal card queues once). Safe to repeat. */
export const discoverSewer = (save: SaveData, kitOf: (heroId: string) => HeroKit | undefined): SaveData =>
  unlockHeroes({ ...save, secrets: { ...save.secrets, sewerFound: true } }, [SEWER_HERO], kitOf);

/** A fresh random desert map was built: updates the pity counter. */
export const recordGrateRun = (save: SaveData, grated: boolean): SaveData => ({
  ...save,
  secrets: { ...save.secrets, desertRunsWithoutGrate: nextRunsWithoutGrate(save.secrets.desertRunsWithoutGrate, grated) },
});

/** Notice id of the "Sewer discovered!" card. */
export const SEWER_NOTICE = 'secret:sewer';

/** Leaving through the grate: the discovery card waits for the next menu screen (once). */
export const queueSewerNotice = (save: SaveData): SaveData =>
  save.seen.includes(SEWER_NOTICE) || save.pendingNotices.includes(SEWER_NOTICE) ? save : { ...save, pendingNotices: [...save.pendingNotices, SEWER_NOTICE] };
