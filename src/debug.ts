import type Phaser from 'phaser';

const flags = import.meta.env.DEV && typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('debug') ?? '').split(',') : [];

/** Dev-only (`?debug=godmode`): player takes no damage and hits much harder. */
export const GOD_MODE = flags.includes('godmode');
/** Dev-only (`?debug=perf`, or `?debug=godmode,perf`): FPS and load overlay for stress testing. */
export const PERF_OVERLAY = flags.includes('perf');
/** Dev-only (`?debug=grate`): desert runs get a random map with a forced grate room, even before the desert is cleared. */
export const FORCE_GRATE = flags.includes('grate');
/** Dev-only (`?debug=sewer`): the Sunken Sewer shows on Level Select without finding the grate first. */
export const SEWER_DEBUG = flags.includes('sewer');
/** Dev-only (`?debug=bert`): the ruins boss is Bert the Crystal Golem (Lv 17) and clearing it grants Bert's Pebble, so the fight can be tried without the mines. */
export const BERT_DEBUG = flags.includes('bert');
/** Dev-only (`?debug=mines`, combine as `?debug=mines,godmode`): the Crystal Mines show on Level Select without being discovered first. */
export const MINES_DEBUG = flags.includes('mines');
export const GOD_DAMAGE_MULTIPLIER = 10;

export function exposeForDebug(game: Phaser.Game): void {
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
}
