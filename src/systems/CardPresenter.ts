import type Phaser from 'phaser';
import { CardQueue, shouldQueueCard, shouldShowCard, markSeen, type CardData } from '../logic/itemCards';
import { feel } from './feel';
import type { SaveSystem } from './SaveSystem';

interface CardRequest {
  id: string;
  card: CardData;
}

export interface CardHost {
  scene: Phaser.Scenes.ScenePlugin;
  isEnding(): boolean;
  onClosed(): void;
}

const CARD_SCENE = 'ItemCard';

/** Queues item cards and shows them one at a time over the paused game; never loses or double-burns a card. */
export class CardPresenter {
  private readonly queue = new CardQueue<CardRequest>();
  private open = false;

  constructor(
    private readonly host: CardHost,
    private readonly save: SaveSystem,
  ) {}

  /** True when the card was accepted (it will be shown); false means the caller should fall back to floating text. */
  request(id: string, card: CardData): boolean {
    const { settings, seen } = this.save.data;
    if (this.host.isEnding() || !shouldQueueCard(settings.itemCards, seen, this.queue.ids, id)) return false;
    this.queue.push({ id, card });
    this.flush();
    return true;
  }

  /** Shows the next card if the game is running (not ended, not paused by the pause menu, no card already up). */
  flush(): void {
    const { scene } = this.host;
    if (this.open || this.host.isEnding() || scene.isPaused() || scene.isActive('Pause')) return;
    const next = this.nextToShow();
    if (!next) return;
    feel.thaw();
    this.open = true;
    this.save.update((save) => markSeen(save, next.id));
    scene.pause();
    scene.pause('Hud');
    scene.launch(CARD_SCENE, next.card);
  }

  close(): void {
    if (!this.open) return;
    const next = this.nextToShow();
    if (next) {
      this.save.update((save) => markSeen(save, next.id));
      this.host.scene.get(CARD_SCENE).scene.restart(next.card);
      return;
    }
    this.open = false;
    this.host.scene.stop(CARD_SCENE);
    this.resumeGame();
  }

  /** The run ended: drop waiting cards and release the paused game without burning anything. */
  cancel(): void {
    this.queue.clear();
    if (!this.open) return;
    this.open = false;
    this.host.scene.stop(CARD_SCENE);
    this.resumeGame();
  }

  private resumeGame(): void {
    const { scene } = this.host;
    this.host.onClosed();
    if (scene.isActive('Pause')) return;
    scene.resume();
    scene.resume('Hud');
  }

  private nextToShow(): CardRequest | undefined {
    for (let next = this.queue.shift(); next; next = this.queue.shift()) {
      if (shouldShowCard(this.save.data.settings.itemCards, this.save.data.seen, next.id)) return next;
    }
    return undefined;
  }
}
