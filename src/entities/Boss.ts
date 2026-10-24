import Phaser from 'phaser';
import { Sfx } from '../content/assetKeys';
import type { EnemyDef } from '../content/enemies';
import { damageToPlayer } from '../logic/combat';
import { newBossState, phaseTuning, stepBoss, type BossAction, type BossState } from '../logic/bossBrain';
import { Enemy, type EnemyContext } from './Enemy';

const SLAM_BASE_DAMAGE = 22;
const BOLT_BASE_DAMAGE = 9;
const BOLT_SPEED = 90;
const BOLT_RANGE = 340;
const SUMMON_ID = 'bat';
const SUMMON_LEVEL_DROP = 2;

export interface BossHooks {
  /** Spawns a minion near (x, y); the host picks a free spot. */
  summon(enemyId: string, level: number, x: number, y: number): void;
}

/** Stone Guardian: pure state machine in `logic/bossBrain` decides what happens, this class performs it. */
export class Boss extends Enemy {
  private brain: BossState;
  private burstSpin = 0;
  private telegraph: Phaser.GameObjects.Arc[] = [];
  private slamAt = { x: 0, y: 0, radius: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef, level: number, context: EnemyContext, private readonly hooks: BossHooks) {
    super(scene, x, y, def, level, context);
    this.setSize(12, 12).setOffset(2, 4);
    this.brain = newBossState(this.clock.now);
    this.events.emit('boss-spawned', def.name ?? def.id, this.hp, this.maxHp);
  }

  override takeHit(amount: number, directionX: number, directionY: number): void {
    super.takeHit(amount, directionX, directionY);
    if (this.alive) this.events.emit('boss-hp', this.hp, this.maxHp);
  }

  protected override act(time: number): void {
    if (!this.armed) return;
    const step = stepBoss(this.brain, time, this.hp / this.maxHp);
    this.brain = step.state;
    for (const action of step.actions) this.perform(action);
    if (this.brain.mode === 'telegraph') {
      this.setVelocity(0, 0);
      return;
    }
    this.chase(time, this.def.speed * phaseTuning(this.brain.phase).speedMultiplier);
  }

  protected override die(): void {
    this.clearTelegraph();
    this.shots.clear();
    this.scene.cameras.main.shake(500, 0.012);
    super.die();
    this.events.emit('boss-hp', 0, this.maxHp);
    this.events.emit('boss-died', this.x, this.y);
  }

  private perform(action: BossAction): void {
    if (action.type === 'telegraph') this.startTelegraph(action.radius, action.durationMs);
    else if (action.type === 'slam') this.slam();
    else if (action.type === 'burst') this.burst(action.count);
    else if (action.type === 'summon') this.summon(action.count);
    else this.enrage();
  }

  private startTelegraph(radius: number, durationMs: number): void {
    this.slamAt = { x: this.x, y: this.y + 4, radius };
    const ring = this.scene.add.circle(this.x, this.y + 4, radius, 0xff2a2a, 0.12).setStrokeStyle(2, 0xff5a5a, 0.9).setDepth(3);
    const fill = this.scene.add.circle(this.x, this.y + 4, radius, 0xff2a2a, 0.35).setDepth(3).setScale(0.05);
    this.scene.tweens.add({ targets: fill, scale: 1, duration: durationMs, ease: 'Quad.easeIn' });
    this.telegraph = [ring, fill];
    this.scene.sound.play(Sfx.shoot, { volume: 0.3, rate: 0.5 });
  }

  private slam(): void {
    const { x, y, radius } = this.slamAt;
    this.clearTelegraph();
    const wave = this.scene.add.circle(x, y, radius, 0xffffff, 0.35).setStrokeStyle(3, 0xffd0a0, 1).setDepth(7);
    this.scene.tweens.add({ targets: wave, scale: 1.25, alpha: 0, duration: 260, onComplete: () => wave.destroy() });
    this.scene.cameras.main.shake(200, 0.01);
    this.scene.sound.play(Sfx.hit, { volume: 0.7, rate: 0.5 });
    if (Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y) <= radius + 4) {
      this.target.takeDamage(damageToPlayer(SLAM_BASE_DAMAGE, this.level, this.target.level), x, y);
    }
  }

  private burst(count: number): void {
    this.burstSpin += 0.35;
    const damage = damageToPlayer(BOLT_BASE_DAMAGE, this.level, this.target.level);
    for (let i = 0; i < count; i++) {
      const angle = this.burstSpin + (i * Math.PI * 2) / count;
      this.shots.fire(this.x, this.y, Math.cos(angle), Math.sin(angle), BOLT_SPEED, damage, BOLT_RANGE);
    }
    this.scene.sound.play(Sfx.shoot, { volume: 0.3, rate: 0.7 });
  }

  private summon(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.hooks.summon(SUMMON_ID, Math.max(1, this.level - SUMMON_LEVEL_DROP), this.x + Math.cos(angle) * 36, this.y + Math.sin(angle) * 36);
    }
  }

  private enrage(): void {
    this.scene.tweens.add({ targets: this, scale: this.scale * 1.15, duration: 160, yoyo: true });
    this.scene.cameras.main.shake(300, 0.008);
    this.scene.sound.play(Sfx.hit, { volume: 0.6, rate: 0.4 });
  }

  private clearTelegraph(): void {
    for (const shape of this.telegraph) shape.destroy();
    this.telegraph = [];
  }
}
