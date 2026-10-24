import Phaser from 'phaser';
import { ControlFrame, Tex } from '../content/assetKeys';
import { touchMetrics, type ButtonId } from '../logic/virtualStick';
import { FIREBALL_STATE_KEY } from '../systems/FireballSystem';
import type { FireballStatus } from '../logic/fireball';
import { canSwapWeapons, TOUCH_STATE_KEY, type StickView, type TouchState } from '../systems/TouchSource';

const IDLE_ALPHA = 0.4;
const ACTIVE_ALPHA = 0.8;

interface StickImages {
  base: Phaser.GameObjects.Image;
  knob: Phaser.GameObjects.Image;
}

/** Renders the state owned by TouchSource; holds no input logic. */
export class TouchControlsView {
  private readonly sticks: Record<'move' | 'aim', StickImages>;
  private readonly buttons: Record<ButtonId, Phaser.GameObjects.Image>;
  private readonly cooldown: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.sticks = { move: this.makeStick(), aim: this.makeStick() };
    this.buttons = { dash: this.makeImage(ControlFrame.dash), altFire: this.makeImage(ControlFrame.altFire), swap: this.makeImage(ControlFrame.swap) };
    this.cooldown = scene.add.graphics().setDepth(101);
  }

  update(): void {
    const state = this.scene.registry.get(TOUCH_STATE_KEY) as TouchState | undefined;
    const visible = state?.visible ?? false;
    const { scale } = this.scene;
    const metrics = touchMetrics(scale.width, scale.height, canSwapWeapons());

    const fireball = this.scene.registry.get(FIREBALL_STATE_KEY) as FireballStatus | undefined;
    this.cooldown.clear();
    for (const zone of metrics.buttons) {
      const image = this.buttons[zone.id];
      const hidden = (zone.id === 'altFire' && !fireball?.unlocked) ;
      image.setVisible(visible && !hidden).setPosition(zone.x, zone.y).setDisplaySize(zone.r * 2, zone.r * 2);
      image.setAlpha(state?.buttons[zone.id] ? ACTIVE_ALPHA : IDLE_ALPHA);
      if (zone.id === 'altFire' && visible && fireball?.unlocked) this.showFireball(image, zone, fireball);
    }
    if (state) {
      this.showStick(this.sticks.move, visible ? state.move : undefined, metrics.stickRadius);
      this.showStick(this.sticks.aim, visible ? state.aim : undefined, metrics.stickRadius);
    }
  }

  /** Orange tint when ready; greyed with a dark pie sweeping away as the cooldown recovers. */
  private showFireball(image: Phaser.GameObjects.Image, zone: { x: number; y: number; r: number }, fireball: FireballStatus): void {
    if (!fireball.available) {
      image.setTint(0x505058).setAlpha(0.3);
      return;
    }
    if (fireball.ready) {
      image.setTint(0xff9030).setAlpha(Math.max(image.alpha, 0.65));
      return;
    }
    image.setTint(0x808080);
    const start = -Math.PI / 2 + fireball.fraction * Math.PI * 2;
    this.cooldown.fillStyle(0x000000, 0.55).slice(zone.x, zone.y, zone.r, start, -Math.PI / 2 + Math.PI * 2, false).fillPath();
  }

  private showStick({ base, knob }: StickImages, view: StickView | undefined, radius: number): void {
    const show = view?.active ?? false;
    base.setVisible(show);
    knob.setVisible(show);
    if (!view || !show) return;
    base.setPosition(view.originX, view.originY).setDisplaySize(radius * 2, radius * 2);
    knob.setPosition(view.originX + view.knobX, view.originY + view.knobY).setDisplaySize(radius, radius);
  }

  private makeStick(): StickImages {
    const base = this.makeImage(ControlFrame.stickBase).setAlpha(IDLE_ALPHA);
    const knob = this.makeImage(ControlFrame.stickKnob).setAlpha(ACTIVE_ALPHA);
    return { base, knob };
  }

  private makeImage(frame: string): Phaser.GameObjects.Image {
    return this.scene.add.image(0, 0, Tex.controls, frame).setVisible(false).setDepth(100);
  }
}
