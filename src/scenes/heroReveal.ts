import Phaser from 'phaser';
import { heroCard } from '../content/cards';
import { heroes } from '../content/heroes';
import { heroNoticeId, pendingHeroReveals } from '../logic/heroSave';
import { saveSystem } from '../systems/SaveSystem';

/** Shows the "New hero unlocked!" card for each hero waiting in the save, one after another, over `scene` (which waits underneath). */
export function revealNextHero(scene: Phaser.Scene, delayMs = 0): void {
  const id = pendingHeroReveals(saveSystem.data).find((heroId) => heroes[heroId]);
  if (!id || scene.scene.isActive('Notice')) return;
  scene.time.delayedCall(delayMs, () => {
    scene.events.once(Phaser.Scenes.Events.RESUME, () => revealNextHero(scene));
    scene.scene.launch('Notice', { ...heroCard(heroes[id]!), under: scene.scene.key, noticeId: heroNoticeId(id) });
    scene.scene.bringToTop('Notice');
    scene.scene.pause();
  });
}
