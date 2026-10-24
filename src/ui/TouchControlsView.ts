import Phaser from 'phaser';
import { ControlFrame, Tex } from '../content/assetKeys';
import { touchMetrics, type ButtonId } from '../logic/virtualStick';
import { TOUCH_STATE_KEY, type StickView, type TouchState } from '../systems/TouchSource';

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

  constructor(private readonly scene: Phaser.Scene) {
    this.sticks = { move: this.makeStick(), aim: this.makeStick() };
    this.buttons = { dash: this.makeImage(ControlFrame.dash), altFire: this.makeImage(ControlFrame.altFire) };
  }

  update(): void {
    const state = this.scene.registry.get(TOUCH_STATE_KEY) as TouchState | undefined;
    const visible = state?.visible ?? false;
    const { scale } = this.scene;
    const metrics = touchMetrics(scale.width, scale.height);

    for (const zone of metrics.buttons) {
      const image = this.buttons[zone.id];
      image.setVisible(visible).setPosition(zone.x, zone.y).setDisplaySize(zone.r * 2, zone.r * 2);
      image.setAlpha(state?.buttons[zone.id] ? ACTIVE_ALPHA : IDLE_ALPHA);
    }
    if (state) {
      this.showStick(this.sticks.move, visible ? state.move : undefined, metrics.stickRadius);
      this.showStick(this.sticks.aim, visible ? state.aim : undefined, metrics.stickRadius);
    }
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
