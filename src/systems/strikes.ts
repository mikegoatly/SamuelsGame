import type Phaser from 'phaser';

/** Scene event for "the player's attack just landed at a point": resonating crystals (and anything else that reacts to a hit on the world) listen for it. */
export const PLAYER_STRIKE = 'player-strike';

export type StrikeListener = (x: number, y: number, reach: number) => void;

/** Reports a strike of radius `reach` at (x, y); call it from melee swings and every skill or thrown weapon with an impact point. */
export const strikeAt = (scene: Phaser.Scene, x: number, y: number, reach: number): void => void scene.events.emit(PLAYER_STRIKE, x, y, reach);

export const onStrike = (scene: Phaser.Scene, listener: StrikeListener): (() => void) => {
  scene.events.on(PLAYER_STRIKE, listener);
  return () => void scene.events.off(PLAYER_STRIKE, listener);
};
