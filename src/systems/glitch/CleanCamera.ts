import Phaser from 'phaser';
import { Enemy } from '../../entities/Enemy';
import { EnemyProjectile } from '../../entities/EnemyProjectile';
import { Fireball } from '../../entities/Fireball';
import type { Player } from '../../entities/Player';
import { Projectile } from '../../entities/Projectile';
import { SpiritWolf } from '../../entities/SpiritWolf';
import { isSaneView } from '../../logic/cameraGuard';
import { isCleanDepth } from '../../logic/glitchClean';

type Cam = Phaser.Cameras.Scene2D.Camera;
type Shake = { isRunning: boolean; _offsetX: number; _offsetY: number; update: () => void };
type Piece = Phaser.GameObjects.GameObject;

/**
 * Keeps the hero and the hero's attacks out of the screen glitch. The main camera carries the post-FX; a second, effect-free camera
 * draws only the clean objects on top (every other object is told to ignore it). It never follows or lerps by itself: each frame it
 * copies the main camera's finished scroll, zoom and rotation (right after the main camera has computed them, before drawing), plus
 * shake offsets and fade, so the two can never disagree.
 */
export class CleanCamera {
  readonly camera: Cam;
  private readonly known = new Set<Piece>();
  private readonly pending: Piece[] = [];
  private readonly shake: Shake;
  private readonly mainShake: Shake;
  private warned = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly main: Cam,
    private readonly player: Player,
  ) {
    this.camera = scene.cameras.add(main.x, main.y, main.width, main.height, false, 'glitch-clean');
    this.shake = this.camera.shakeEffect as unknown as Shake;
    this.mainShake = main.shakeEffect as unknown as Shake;
    this.shake.update = () => undefined;
    for (const object of scene.children.list) this.pending.push(object);
    scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.queue, this);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.sync, this);
    main.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.copyView, this);
    this.copyView();
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.queue, this);
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sync, this);
    this.main.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.copyView, this);
    if (this.scene.cameras) this.scene.cameras.remove(this.camera);
    for (const object of this.known) if (object.active) object.cameraFilter &= ~this.camera.id;
  }

  private queue(object: Piece): void {
    this.pending.push(object);
  }

  /** Depth is set right after an object is added, so objects are sorted at the end of the frame they appeared in. */
  private isClean(object: Piece): boolean {
    if (object === this.player || object instanceof Projectile || object instanceof Fireball || object instanceof SpiritWolf) return true;
    if (object instanceof Enemy || object instanceof EnemyProjectile) return false;
    return isCleanDepth((object as Phaser.GameObjects.Image).depth);
  }

  private makeClean(object: Piece): void {
    if (this.known.has(object)) return;
    this.known.add(object);
    object.cameraFilter &= ~this.camera.id;
    this.main.ignore(object);
  }

  /** Called after the main camera has worked out where it is looking for this frame. */
  private copyView = (): void => {
    const main = this.main;
    if (!isSaneView(main)) {
      this.recentre();
      return;
    }
    const camera = this.camera;
    camera.setZoom(main.zoom).setRotation((main as unknown as { rotation: number }).rotation);
    camera.scrollX = main.scrollX;
    camera.scrollY = main.scrollY;
    camera.setRoundPixels(main.roundPixels);
    this.shake.isRunning = this.mainShake.isRunning;
    this.shake._offsetX = Number.isFinite(this.mainShake._offsetX) ? this.mainShake._offsetX : 0;
    this.shake._offsetY = Number.isFinite(this.mainShake._offsetY) ? this.mainShake._offsetY : 0;
    camera.setAlpha(1 - (main.fadeEffect as unknown as { alpha: number }).alpha);
  };

  /** A non-finite main view never recovers by itself (follow lerps from the old scroll): put it back on the hero. */
  private recentre(): void {
    if (Number.isFinite(this.player.x) && Number.isFinite(this.player.y)) {
      const main = this.main;
      if (!Number.isFinite(main.zoom) || main.zoom <= 0) main.setZoom(1);
      main.centerOn(this.player.x, this.player.y);
    }
    if (import.meta.env.DEV && !this.warned) {
      this.warned = true;
      console.warn('GlitchFx: main camera view was not finite; re-centred on the player');
    }
  }

  private sync(): void {
    for (const object of this.pending) {
      if (!object.scene) continue;
      if (this.isClean(object)) this.makeClean(object);
      else this.camera.ignore(object);
    }
    this.pending.length = 0;
    const { wand, offhand, head } = this.player as unknown as Record<'wand' | 'offhand' | 'head', Phaser.GameObjects.Image | undefined>;
    for (const piece of [wand, offhand, head]) if (piece?.active) this.makeClean(piece);
    for (const object of this.known) if (!object.active && object !== this.player) this.known.delete(object);
    this.copyView();
  }
}
