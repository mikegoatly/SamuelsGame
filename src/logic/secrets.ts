import { unlockHeroes, type HeroKit } from './heroSave';
import { nextRunsWithoutGrate } from './grate';
import { NAB_HERO, nextRunsWithoutNab } from './nab';
import { MAX_PITY, type SaveData, type Secrets } from './save';

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

export const foundSecrets = (secrets: Secrets): SecretId[] => [...(secrets.sewerFound ? ['sewer' as const] : []), ...(secrets.minesFound ? ['mines' as const] : [])];

/** The gem thief who leads the way into the mines. */
export const MINES_HERO = NAB_HERO;
export const MINES_NOTICE = 'secret:mines';

/** Reaching Nab's gate: the mines card appears and Nab unlocks (his reveal card queues once). Safe to repeat. */
export const discoverMines = (save: SaveData, kitOf: (heroId: string) => HeroKit | undefined): SaveData =>
  unlockHeroes({ ...save, secrets: { ...save.secrets, minesFound: true } }, [MINES_HERO], kitOf);

/** An eligible run either met Nab (resets the pity counter) or reached a room without him (one more). */
export const recordNabRun = (save: SaveData, appeared: boolean): SaveData => ({
  ...save,
  secrets: { ...save.secrets, nabPity: Math.min(MAX_PITY, nextRunsWithoutNab(save.secrets.nabPity, appeared)) },
});

/** Following Nab: the discovery card waits for the next menu screen (once). */
export const queueMinesNotice = (save: SaveData): SaveData =>
  save.seen.includes(MINES_NOTICE) || save.pendingNotices.includes(MINES_NOTICE) ? save : { ...save, pendingNotices: [...save.pendingNotices, MINES_NOTICE] };
