import Phaser from 'phaser';
import { FONT } from '../content/assetKeys';
import { playSfx } from '../systems/sfx';

const BAR_HEIGHT = 36;
const SLIDE_MS = 420;
const HOLD_MS = 1300;

/** Letterbox bars plus a name banner that slides across the screen when a boss arena locks. */
export class BossIntro {
  private parts: Phaser.GameObjects.GameObject[] = [];
  private bars?: { top: Phaser.GameObjects.Rectangle; bottom: Phaser.GameObjects.Rectangle };
  private banner?: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {}

  play(name: string): void {
    this.cancel();
    const { scene } = this;
    const { width, height } = scene.scale;
    const top = scene.add.rectangle(width / 2, -BAR_HEIGHT / 2, width, BAR_HEIGHT, 0x000000).setDepth(60);
    const bottom = scene.add.rectangle(width / 2, height + BAR_HEIGHT / 2, width, BAR_HEIGHT, 0x000000).setDepth(60);
    const banner = scene.add
      .text(-width, height / 2, name.toUpperCase(), { fontFamily: FONT, fontSize: '44px', color: '#ffd0a0', stroke: '#3a0f0f', strokeThickness: 8 })
      .setOrigin(0.5)
      .setResolution(2)
      .setDepth(61)
      .setShadow(0, 0, '#ff5a3a', 14, true, true);
    this.bars = { top, bottom };
    this.banner = banner;
    this.parts = [top, bottom, banner];
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
  }

  private fadeBars(): void {
    this.banner?.destroy();
    const bars = this.bars ? [this.bars.top, this.bars.bottom] : [];
    this.scene.tweens.add({ targets: bars, alpha: 0, duration: 250, onComplete: () => this.cancel() });
  }
}
