import Phaser from 'phaser';
import { GlitchFrame, Tex } from '../../../content/assetKeys';
import { spiralVolley } from '../../../logic/aim';
import { spreadDirections } from '../../../logic/enemyAi';
import { newBossState, stepBoss, type BossAction, type BossBrainConfig, type BossState } from '../../../logic/bossBrain';
import { FAKE } from '../../../logic/missingTexture';
import { feel } from '../../../systems/feel';
import { playSfx } from '../../../systems/sfx';
import type { Boss } from '../../Boss';

const ORBIT_RADIUS = 70;
const ORBIT_SPEED = 0.0006;
const BOLT_RANGE = 340;
const SEEK_RANGE = 420;
const SEEK_TINT = 0xc070ff;

/** A hollow copy of the Missing Texture: it circles the real one, cannot be hit (it is not in the enemy group, so shots fly through it) and fires only the copy's projectile attacks, at half damage. */
export class Fake {
  readonly sprite: Phaser.GameObjects.Sprite;
  private brain: BossState;
  private config: BossBrainConfig;
  private spin = 0;
  private readonly aim = new Phaser.Math.Vector2(1, 0);

  constructor(
    private readonly boss: Boss,
    private readonly index: number,
    config: BossBrainConfig,
    tint: number | null,
  ) {
    const { scene } = boss;
    this.sprite = scene.add.sprite(boss.x, boss.y, Tex.glitch, GlitchFrame.fakeHollow).setScale(boss.def.scale ?? 1).setDepth(4).setAlpha(0.85);
    this.setTint(tint);
    this.config = config;
    this.brain = newBossState(config, boss.clock.now);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  setTint(tint: number | null): void {
    if (tint === null) this.sprite.clearTint();
    else this.sprite.setTint(tint);
  }

  /** The copy changed: new attacks, fresh timers. */
  setBrain(config: BossBrainConfig): void {
    this.config = config;
    this.brain = newBossState(config, this.boss.clock.now);
  }

  /** Follows the real boss on its own side of it and fires when its attacks come due. `live` is false while the run is locked or over: it then does nothing. */
  update(now: number, live: boolean): void {
    const { boss, sprite } = this;
    const angle = now * ORBIT_SPEED * 2 * Math.PI + (this.index * 2 * Math.PI) / FAKE.count + Math.PI / 2;
    const bob = feel.reduced ? 0 : Math.sin(now / 200 + this.index) * 2;
    const x = boss.x + Math.cos(angle) * ORBIT_RADIUS;
    const y = boss.y + Math.sin(angle) * ORBIT_RADIUS + bob;
    if (!boss.isBlocked(x, y)) sprite.setPosition(x, y);
    sprite.setFlipX(boss.target.x < sprite.x);
    if (!live) return;
    const step = stepBoss(this.config, this.brain, now, 1);
    this.brain = step.state;
    for (const action of step.actions) this.perform(action);
  }

  private damage(): number {
    return Math.max(1, Math.round(this.boss.boltDamage() * FAKE.damageScale));
  }

  private perform(action: BossAction): void {
    const { boss } = this;
    const speed = boss.def.boltSpeed ?? 90;
    const dx = boss.target.x - this.x;
    const dy = boss.target.y - this.y;
    if (action.type === 'burst') {
      this.spin += 0.35;
      for (let i = 0; i < action.count; i++) {
        const a = this.spin + (i * Math.PI * 2) / action.count;
        boss.bolt(this.x, this.y, Math.cos(a), Math.sin(a), speed, this.damage(), BOLT_RANGE);
      }
    } else if (action.type === 'spit') {
      if (Math.hypot(dx, dy) > 1e-6) this.aim.set(dx, dy).normalize();
      for (const d of spreadDirections(dx, dy, action.count, action.arc, this.aim)) boss.bolt(this.x, this.y, d.x, d.y, speed, this.damage(), BOLT_RANGE);
    } else if (action.type === 'spiral') {
      this.spin += 0.5;
      for (let arm = 0; arm < action.arms; arm++) {
        const sign = arm % 2 === 0 ? 1 : -1;
        for (const bolt of spiralVolley(action.count, action.turns * sign, this.spin + (arm * Math.PI) / action.arms, speed)) {
          boss.bolt(this.x, this.y, bolt.x, bolt.y, bolt.speed, this.damage(), BOLT_RANGE);
        }
      }
    } else if (action.type === 'seek') {
      this.spin += 0.4;
      const style = { tint: SEEK_TINT, scale: 1.35, homing: { turnRate: action.turnRate, ms: action.ms, target: boss.target } };
      for (let i = 0; i < action.count; i++) {
        const a = this.spin + (i * Math.PI * 2) / action.count;
        boss.bolt(this.x, this.y, Math.cos(a), Math.sin(a), speed * action.speedFactor, this.damage(), SEEK_RANGE, style);
      }
    } else return;
    playSfx(boss.scene, 'enemyShot', { volume: 1.2, rate: 1.2 });
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
