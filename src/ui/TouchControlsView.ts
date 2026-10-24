import Phaser from 'phaser';
import { ControlFrame, Tex } from '../content/assetKeys';
import { getSkill } from '../content/skills';
import { SKILL_BUTTONS, touchMetrics, type ButtonId } from '../logic/virtualStick';
import type { SkillSlotStatus } from '../logic/skillSlots';
import { SKILL_STATE_KEY } from '../systems/SkillSystem';
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
  private readonly cooldown: Phaser.GameObjects.Graphics;
  private readonly icons: Phaser.GameObjects.Image[];

  constructor(private readonly scene: Phaser.Scene) {
    this.sticks = { move: this.makeStick(), aim: this.makeStick() };
    this.buttons = {
      dash: this.makeImage(ControlFrame.dash),
      skill1: this.makeImage(ControlFrame.skill),
      skill2: this.makeImage(ControlFrame.skill),
      skill3: this.makeImage(ControlFrame.skill),
    };
    this.icons = SKILL_BUTTONS.map(() => scene.add.image(0, 0, Tex.tiles, 0).setVisible(false).setDepth(101));
    this.cooldown = scene.add.graphics().setDepth(102);
  }

  update(): void {
    const state = this.scene.registry.get(TOUCH_STATE_KEY) as TouchState | undefined;
    const visible = state?.visible ?? false;
    const { scale } = this.scene;
    const metrics = touchMetrics(scale.width, scale.height);
    const statuses = this.scene.registry.get(SKILL_STATE_KEY) as readonly SkillSlotStatus[] | undefined;

    this.cooldown.clear();
    for (const zone of metrics.buttons) {
      const image = this.buttons[zone.id];
      image.setVisible(visible).setPosition(zone.x, zone.y).setDisplaySize(zone.r * 2, zone.r * 2);
      image.setAlpha(state?.buttons[zone.id] ? ACTIVE_ALPHA : IDLE_ALPHA);
      const slot = SKILL_BUTTONS.indexOf(zone.id as (typeof SKILL_BUTTONS)[number]);
      if (slot >= 0) this.showSkill(image, this.icons[slot]!, zone, visible, statuses?.[slot]);
    }
    if (state) {
      this.showStick(this.sticks.move, visible ? state.move : undefined, metrics.stickRadius);
      this.showStick(this.sticks.aim, visible ? state.aim : undefined, metrics.stickRadius);
    }
  }

  /** Skill icon on its button; dimmed while cooling down with a dark pie sweeping away, nearly invisible for an empty slot. */
  private showSkill(button: Phaser.GameObjects.Image, icon: Phaser.GameObjects.Image, zone: { x: number; y: number; r: number }, visible: boolean, status?: SkillSlotStatus): void {
    const skill = status?.skillId ? getSkill(status.skillId) : undefined;
    icon.setVisible(visible && skill !== undefined);
    if (!skill || !status) {
      button.setAlpha(visible ? 0.15 : 0);
      return;
    }
    icon.setTexture(skill.icon).setPosition(zone.x, zone.y).setDisplaySize(zone.r * 1.5, zone.r * 1.5);
    if (status.ready) {
      icon.clearTint().setAlpha(0.95);
      button.setTint(skill.color);
      return;
    }
    icon.setTint(0x707080).setAlpha(0.7);
    button.setTint(0x808080);
    if (visible) {
      const start = -Math.PI / 2 + status.fraction * Math.PI * 2;
      this.cooldown.fillStyle(0x000000, 0.55).slice(zone.x, zone.y, zone.r, start, -Math.PI / 2 + Math.PI * 2, false).fillPath();
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
