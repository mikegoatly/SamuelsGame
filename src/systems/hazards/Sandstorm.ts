import Phaser from 'phaser';
import { stormAt } from '../../logic/hazard/sandstorm';
import type { ActiveHazardSpec } from '../../logic/tiledObjects';
import { feel } from '../feel';
import { playSfx } from '../sfx';
import { puff, smokeEmitter, steady, type Emitter } from './emitters';
import { HazardBase } from './HazardBase';
import type { Hazard, HazardWorld } from './types';

const FOG_KEY = 'storm-fog';
const FOG_SIZE = 1700;
const FOG_TINT = 0xd8b070;
const MAX_FOG = 0.94;
const MAX_FOG_REDUCED = 0.62;
const FADE_OUT_MS = 600;

/** Canvas texture: clear in the middle, opaque sand towards the edges (the screen is far smaller than FOG_SIZE, so only a patch around you stays visible). */
function ensureFogTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(FOG_KEY)) return;
  const size = 512;
  const canvas = scene.textures.createCanvas(FOG_KEY, size, size)!;
  const ctx = canvas.getContext();
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(216,176,112,0)');
  gradient.addColorStop(0.05, 'rgba(216,176,112,0)');
  gradient.addColorStop(0.13, 'rgba(216,176,112,0.97)');
  gradient.addColorStop(1, 'rgba(216,176,112,1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  canvas.refresh();
}

/** Room-wide dust storm: dust whirls up first (the warning), then a sand-coloured fog closes in around you and later clears. */
export class Sandstorm extends HazardBase {
  private readonly fog: Phaser.GameObjects.Image;
  private readonly dust: Emitter;
  private readonly carry = { value: 0 };
  private risen = -1;

  constructor(world: HazardWorld, spec: ActiveHazardSpec) {
    super(world, spec, 0.4);
    ensureFogTexture(world.scene);
    this.fog = world.scene.add.image(0, 0, FOG_KEY).setDisplaySize(FOG_SIZE, FOG_SIZE).setDepth(30).setAlpha(0).setVisible(false);
    this.dust = smokeEmitter(world.scene, 8, { speedX: { min: 70, max: 150 }, speedY: { min: -14, max: 14 }, lifespan: 1100, scale: { start: 0.08, end: 0.22 }, alpha: { start: 0.55, end: 0 } });
    this.rest();
  }

  protected rest(): void {
    this.fog.setVisible(false);
  }

  override calm(): void {
    this.live = false;
    this.world.scene.tweens.killTweensOf(this.fog);
    if (!this.fog.visible) return;
    this.world.scene.tweens.add({ targets: this.fog, alpha: 0, duration: FADE_OUT_MS, onComplete: () => this.fog.setVisible(false) });
  }

  override halt(): void {
    this.live = false;
    this.world.scene.tweens.killTweensOf(this.fog);
    this.fog.setVisible(false).setAlpha(0);
  }

  protected tick(now: number, dtMs: number): void {
    const { player } = this.world;
    this.world.scene.tweens.killTweensOf(this.fog);
    const { fog, dust } = stormAt(now, this.offset);
    const cap = feel.reduced ? MAX_FOG_REDUCED : MAX_FOG;
    this.fog.setVisible(fog > 0.005).setPosition(player.x, player.y).setAlpha(Math.min(cap, fog * cap));
    if (dust > 0.02 && this.risen < 0) {
      this.risen = 0;
      playSfx(this.world.scene, 'sandRise');
    } else if (dust <= 0.02) this.risen = -1;
    const { x, y, w, h } = this.rect;
    for (let i = steady(this.carry, 90 * dust, dtMs); i > 0; i--) puff(this.dust, x + Math.random() * w, y + Math.random() * h, FOG_TINT, 1);
  }

  override destroy(): void {
    this.fog.destroy();
    this.dust.destroy();
    super.destroy();
  }
}

export const sandstorm = (world: HazardWorld, spec: ActiveHazardSpec): Hazard => new Sandstorm(world, spec);
