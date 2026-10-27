import type Phaser from 'phaser';

const flags = import.meta.env.DEV ? (new URLSearchParams(window.location.search).get('debug') ?? '').split(',') : [];

/** Dev-only (`?debug=godmode`): player takes no damage and hits much harder. */
export const GOD_MODE = flags.includes('godmode');
/** Dev-only (`?debug=perf`, or `?debug=godmode,perf`): FPS and load overlay for stress testing. */
export const PERF_OVERLAY = flags.includes('perf');
export const GOD_DAMAGE_MULTIPLIER = 10;

export function exposeForDebug(game: Phaser.Game): void {
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
}
