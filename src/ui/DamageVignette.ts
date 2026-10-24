import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import { hurtVignetteAlpha, lowHpPulse } from '../logic/vignette';

/** Red edge glow: a flash when hurt, and a heartbeat pulse while hp is under 25%. */
export class DamageVignette {
  private readonly image: Phaser.GameObjects.Image;
  private clock = 0;
  private hurtAt = -Infinity;
  private paused = false;

  constructor(scene: Phaser.Scene) {
    this.image = scene.add.image(0, 0, Tex.vignette).setOrigin(0).setDepth(50).setAlpha(0);
    this.resize(scene.scale.width, scene.scale.height);
  }

  resize(width: number, height: number): void {
    this.image.setDisplaySize(width, height);
  }

  hurt(): void {
    this.hurtAt = this.clock;
  }

  /** Hidden while the game is paused (the HUD does not update then). */
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.image.setVisible(!paused);
  }

  update(deltaMs: number, hpRatio: number, reduced: boolean): void {
    if (this.paused) return;
    this.clock += deltaMs;
    const flash = hurtVignetteAlpha(this.clock - this.hurtAt, reduced);
    this.image.setAlpha(Math.max(flash, lowHpPulse(hpRatio, this.clock, reduced)));
  }
}
