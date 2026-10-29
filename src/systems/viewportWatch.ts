import type Phaser from 'phaser';

/**
 * Phones report stale sizes mid-rotation, so a quick rotate-and-back can leave the canvas at the wrong aspect.
 * Re-measure a few times once the browser settles; after a rotation or full-screen switch, also force one final refresh
 * in case the last measurement Phaser kept was taken mid-transition.
 */
const SETTLE_DELAYS_MS = [100, 350, 800];

export function installViewportWatch(game: Phaser.Game): void {
  let timers: number[] = [];
  const settle = (force: boolean): void => {
    timers.forEach((id) => window.clearTimeout(id));
    timers = SETTLE_DELAYS_MS.map((ms, i) =>
      window.setTimeout(() => {
        const changed = game.scale.getParentBounds();
        if (changed || (force && i === SETTLE_DELAYS_MS.length - 1)) game.scale.refresh();
      }, ms),
    );
  };
  let pendingForce = false;
  const onResize = (): void => settle(pendingForce);
  const onFlip = (): void => {
    pendingForce = true;
    settle(true);
    window.setTimeout(() => (pendingForce = false), SETTLE_DELAYS_MS[SETTLE_DELAYS_MS.length - 1]! + 50);
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onFlip);
  screen.orientation?.addEventListener?.('change', onFlip);
  document.addEventListener('fullscreenchange', onFlip);
}
