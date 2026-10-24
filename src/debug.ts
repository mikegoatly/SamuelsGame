import type Phaser from 'phaser';

const flag = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('debug') : null;

/** Dev-only (`?debug=godmode`): player takes no damage and hits much harder. */
export const GOD_MODE = flag === 'godmode';
export const GOD_DAMAGE_MULTIPLIER = 10;

export function exposeForDebug(game: Phaser.Game): void {
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
}
