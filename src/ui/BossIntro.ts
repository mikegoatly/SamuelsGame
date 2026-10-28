import Phaser from 'phaser';
import { gameText } from './gameText';
import { playSfx } from '../systems/sfx';

const BAR_HEIGHT = 36;
const SLIDE_MS = 420;
const HOLD_MS = 1300;

/** Letterbox bars plus a name banner that slides across the screen when a boss arena locks. */
export class BossIntro {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private bars?: { top: Phaser.GameObjects.Rectangle; bottom: Phaser.GameObjects.Rectangle };
  private banner?: Phaser.GameObjects.Text;
  private tagline?: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {}

  play(name: string, tagline?: string): void {
    this.cancel();
    const { scene } = this;
    const { width, height } = scene.scale;
    const top = scene.add.rectangle(width / 2, -BAR_HEIGHT / 2, width, BAR_HEIGHT, 0x000000).setDepth(60);
    const bottom = scene.add.rectangle(width / 2, height + BAR_HEIGHT / 2, width, BAR_HEIGHT, 0x000000).setDepth(60);
    const banner = gameText(scene, -width, height / 2, name.toUpperCase(), 48, { color: '#ffd0a0', stroke: '#3a0f0f' })
      .setOrigin(0.5)
      .setDepth(61)
      .setShadow(0, 0, '#ff5a3a', 14, true, true);
    const sub = tagline
      ? gameText(scene, -width, height / 2 + 48, tagline, 16, { color: '#fff0d8', stroke: '#3a0f0f' }).setWordWrapWidth(Math.max(160, width - 80)).setAlign('center').setOrigin(0.5, 0).setDepth(61)
      : undefined;
    this.bars = { top, bottom };
    this.banner = banner;
    this.tagline = sub;
    this.parts = sub ? [top, bottom, banner, sub] : [top, bottom, banner];
    scene.tweens.add({ targets: top, y: BAR_HEIGHT / 2, duration: SLIDE_MS, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: bottom, y: height - BAR_HEIGHT / 2, duration: SLIDE_MS, ease: 'Quad.easeOut' });
    playSfx(scene, 'bossRoar');
    scene.tweens.chain({
      targets: banner,
      tweens: [
        { x: width / 2, duration: SLIDE_MS + 100, ease: 'Back.easeOut' },
        { x: width / 2 + 14, duration: HOLD_MS, ease: 'Linear' },
        { x: width * 2, duration: SLIDE_MS, ease: 'Quad.easeIn' },
      ],
      onComplete: () => this.fadeBars(),
    });
    if (sub) {
      scene.tweens.chain({
        targets: sub,
        tweens: [
          { x: width / 2, duration: SLIDE_MS + 100, delay: 80, ease: 'Back.easeOut' },
          { x: width / 2 + 14, duration: HOLD_MS - 80, ease: 'Linear' },
          { x: width * 2, duration: SLIDE_MS, ease: 'Quad.easeIn' },
        ],
      });
    }
  }

  /** Snaps the bars and banner to the new screen size. */
  layout(): void {
    if (!this.bars) return;
    const { width, height } = this.scene.scale;
    const { top, bottom } = this.bars;
    this.scene.tweens.killTweensOf([top, bottom]);
    top.setPosition(width / 2, BAR_HEIGHT / 2).setSize(width, BAR_HEIGHT);
    bottom.setPosition(width / 2, height - BAR_HEIGHT / 2).setSize(width, BAR_HEIGHT);
    this.banner?.setY(height / 2);
    this.tagline?.setY(height / 2 + 48);
  }

  /** Removes everything at once (boss or player died, scene closing). */
  cancel(): void {
    for (const part of this.parts) {
      this.scene.tweens.killTweensOf(part);
      part.destroy();
    }
    this.parts = [];
    this.bars = undefined;
    this.banner = undefined;
    this.tagline = undefined;
  }

  private fadeBars(): void {
    this.banner?.destroy();
    this.tagline?.destroy();
    const bars = this.bars ? [this.bars.top, this.bars.bottom] : [];
    this.scene.tweens.add({ targets: bars, alpha: 0, duration: 250, onComplete: () => this.cancel() });
  }
}
