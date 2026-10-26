import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import type { ItemDef } from '../content/items';
import type { GameClock } from '../systems/GameClock';
import { isPickupExpired, isPickupVisible, magnetises } from '../logic/pickups';

const POP_MS = 380;
const POP_RADIUS = 20;
const MAGNET_RANGE = 40;
const MAGNET_SPEED = 170;

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  private readonly bornAt: number;
  private popping = true;
  private collected = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: ItemDef,
    private readonly target: Phaser.GameObjects.Components.Transform,
    private readonly onCollect: (def: ItemDef) => void,
    private readonly clock: GameClock,
  ) {
    super(scene, x, y, Tex.tiles, def.frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.bornAt = clock.now;
    this.setSize(10, 10).setOffset(3, 3).setDepth(4).setScale(def.scale ?? 1);
    if (def.tint !== undefined) this.setTint(def.tint);
    this.pop(x, y);
  }

  tryCollect(): void {
    if (this.popping || this.collected) return;
    this.collected = true;
    this.onCollect(this.def);
    this.destroy();
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.collected) return;
    const age = this.clock.now - this.bornAt;
    if (isPickupExpired(age)) {
      this.destroy();
      return;
    }
    this.setVisible(isPickupVisible(age));
    if (!this.popping && magnetises(this.def.kind)) this.attract();
  }

  private attract(): void {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance > MAGNET_RANGE || distance < 1) {
      this.setVelocity(0, 0);
      return;
    }
    const pull = MAGNET_SPEED * (1.4 - distance / MAGNET_RANGE);
    this.setVelocity((dx / distance) * pull, (dy / distance) * pull);
  }

  private pop(x: number, y: number): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = POP_RADIUS * (0.5 + Math.random() * 0.5);
    this.scene.tweens.add({ targets: this, x: x + Math.cos(angle) * radius, duration: POP_MS, ease: 'Sine.easeOut' });
    this.scene.tweens.add({
      targets: this,
      y: { from: y - 10, to: y + Math.sin(angle) * radius },
      duration: POP_MS,
      ease: 'Bounce.easeOut',
      onComplete: () => (this.popping = false),
    });
  }
}
