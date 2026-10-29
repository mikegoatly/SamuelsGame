import Phaser from 'phaser';
import { BertFrame, Tex } from '../content/assetKeys';
import { bertBrain, bertTuning } from '../content/bert';
import type { EnemyDef } from '../content/enemies';
import { bertCrash, bertRollEnded, newBertState, stepBert, type BertAction, type BertState } from '../logic/bertBrain';
import { BERT_PLATES, brokenPlates, damageAfterArmour, dropPlates, newPlates, plateSideOf, speedWithPlates, type PlateSide, type Plates } from '../logic/bertPlates';
import { newRoll, rollDone, rollTravel, type Roll } from '../logic/bertRoll';
import { bouncePath, pathDistance, type Arena } from '../logic/bounceRay';
import { damageToPlayer } from '../logic/combat';
import { rectCenter, type Point, type Rect } from '../logic/geometry';
import { feel } from '../systems/feel';
import { floatText } from '../systems/floatText';
import { playSfx } from '../systems/sfx';
import { ringBurst, sparkBurst } from '../systems/skills/skillFx';
import { drawLaserBeam, drawLaserLine, drawRollArrow, drawWarningRing } from './bert/BertDraw';
import { BertProps } from './bert/BertProps';
import { Enemy, type EnemyContext, type HitSource } from './Enemy';
import type { Player } from './Player';

const PLATE_FRAMES: Record<PlateSide, number> = { front: BertFrame.plateFront, back: BertFrame.plateBack, left: BertFrame.plateLeft, right: BertFrame.plateRight };
const PLATE_COLOURS: Record<PlateSide, number> = { front: 0xff5a4a, back: 0xffd84a, left: 0x6adf6a, right: 0x6aa8ff };
const PLATE_OFFSETS: Record<PlateSide, Point> = { front: { x: 0, y: 8 }, back: { x: 0, y: -10 }, left: { x: -9, y: -2 }, right: { x: 9, y: -2 } };
const ROLL_HIT_COOLDOWN_MS = 1000;
const LASER_CORRIDOR_PAD = 2;
const BODY_SIZE = 18;
const SPIN_PER_MS = 0.55;
const STAR_RADIUS = 11;

/** Bert the Crystal Golem: the pure rules live in logic/bertBrain, bertPlates, bertRoll and bounceRay; this class performs them and owns the cavern's pillars. */
export class Bert extends Enemy {
  private brain: BertState;
  private plates: Plates;
  private readonly plateImages = new Map<PlateSide, Phaser.GameObjects.Image>();
  private readonly props: BertProps;
  private readonly arena: Arena;
  private readonly centre: Point;
  private shapes: Phaser.GameObjects.GameObject[] = [];
  private stars: Phaser.GameObjects.Image[] = [];
  private roll: Roll = newRoll({ x: 1, y: 0 });
  private rollAim = new Phaser.Math.Vector2(1, 0);
  private rollSpeed = 0;
  private rollBounces = 0;
  private rollFrom: Point = { x: 0, y: 0 };
  private nextRollHitAt = 0;
  private tossSpots: Point[] = [];
  private laserPath: Point[] = [];
  private nextSpikeAt = 0;
  private shownFrame = -1;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef, level: number, context: EnemyContext, arenaRect: Rect) {
    super(scene, x, y, def, level, context);
    this.setSize(BODY_SIZE, BODY_SIZE).setOffset((32 - BODY_SIZE) / 2, 12);
    this.centre = rectCenter(arenaRect);
    this.arena = { kind: 'circle', centre: this.centre, radius: Math.min(arenaRect.w, arenaRect.h) / 2 - bertTuning.arenaMargin };
    this.brain = newBertState(bertBrain, this.clock.now);
    this.plates = newPlates(this.maxHp);
    for (const side of BERT_PLATES) this.plateImages.set(side, scene.add.image(x, y, Tex.bert, PLATE_FRAMES[side]).setScale(def.scale ?? 1).setDepth(5.1));
    this.props = new BertProps(scene, this.target);
    this.props.spawnPillars(this.centre, this.arena.radius, [this.target, { x, y }]);
    this.props.collideWith(this, () => this.brain.mode !== 'rolling');
    this.setFrame(BertFrame.body);
    this.events.emit('boss-spawned', def.name ?? def.id, this.hp, this.maxHp);
  }

  override get targetable(): boolean {
    return this.alive;
  }

  protected override get pullable(): boolean {
    return super.pullable && this.brain.mode === 'walk';
  }

  protected override get showsLevelGap(): boolean {
    return false;
  }

  override takeHit(amount: number, directionX: number, directionY: number, knockback = 1, source: HitSource = 'basic'): void {
    if (!this.targetable) return;
    const side = plateSideOf(-directionX, -directionY);
    const armour = damageAfterArmour(this.brain.mode, this.plates, side, amount);
    this.plates = armour.plates;
    if (armour.plated) this.plateHit(side, armour.broke);
    super.takeHit(armour.damage, directionX, directionY, knockback, source);
    if (this.alive) this.events.emit('boss-hp', this.hp, this.maxHp);
  }

  /** Damage-over-time has no side: it goes through the same armour rules as a tick. */
  override takeDot(amount: number, css?: string, tint?: number): void {
    super.takeDot(damageAfterArmour(this.brain.mode, this.plates, null, amount).damage, css, tint);
    if (this.alive) this.events.emit('boss-hp', this.hp, this.maxHp);
  }

  private plateHit(side: PlateSide, broke: boolean): void {
    playSfx(this.scene, 'crystalHit');
    const image = this.plateImages.get(side);
    if (image) {
      image.setTintFill(0xffffff);
      this.scene.time.delayedCall(70, () => image.active && image.clearTint());
    }
    if (broke) this.breakPlate(side);
  }

  override tryContact(player: Player): void {
    if (!this.alive || !this.armed || feel.isLocked) return;
    const { mode } = this.brain;
    if (mode === 'rolling') {
      const now = this.clock.now;
      if (now < this.nextRollHitAt) return;
      const result = player.takeDamage(damageToPlayer(this.def.slamDamage ?? 18, this.level, player.level), this.x, this.y, 'boss');
      if (result !== 'none') this.nextRollHitAt = now + ROLL_HIT_COOLDOWN_MS;
      return;
    }
    if (mode === 'stunned' || mode === 'rollWindup' || mode === 'uncurl') return;
    super.tryContact(player);
  }

  protected override act(time: number): void {
    if (!this.armed) return;
    if (feel.isLocked || this.target.dead) {
      this.setVelocity(0, 0);
      return;
    }
    const step = stepBert(bertBrain, this.brain, time, this.hp / this.maxHp);
    this.brain = step.state;
    for (const action of step.actions) this.perform(action);
    this.growSpikes(time);
    if (this.brain.mode === 'rolling') this.rolling(time);
    else if (this.brain.mode === 'walk') this.chase(time, this.def.speed * bertBrain.phases[this.brain.phase].speedMultiplier * speedWithPlates(brokenPlates(this.plates)));
    else this.setVelocity(0, 0);
  }

  private perform(action: BertAction): void {
    switch (action.type) {
      case 'phase':
        return this.enterPhase(action.phase);
      case 'cancel':
        return this.cancelWarning();
      case 'slamTelegraph':
        return this.slamTelegraph(action.radius, action.ms);
      case 'slam':
        return this.slam(action.radius);
      case 'tossTelegraph':
        return this.tossTelegraph(action.radius, action.ms, action.count);
      case 'toss':
        return this.toss(action.radius);
      case 'rollTelegraph':
        return this.rollTelegraph(action.ms);
      case 'rollStart':
        return this.startRoll(action.speed, action.bounces);
      case 'rollEnd':
        return this.endRoll();
      case 'stun':
        return this.startStun(action.ms);
      case 'stunEnd':
        return this.endStun();
      case 'laserTelegraph':
        return this.laserTelegraph(action.ms, action.bounces);
      case 'laserFire':
        return this.laserFire(action.ms);
      case 'laserEnd':
        return this.clearShapes();
    }
  }

  private enterPhase(phase: number): void {
    const base = this.def.scale ?? 1;
    this.setScale(base);
    this.scene.tweens.add({ targets: this, scale: base * 1.12, duration: 160, yoyo: true });
    feel.shake(300, 0.01);
    feel.flash(200);
    playSfx(this.scene, 'bossPhase');
    playSfx(this.scene, 'bossRoar', { delay: 0.1 });
    this.showFrame(BertFrame.angry);
    this.dropAllPlates();
    if (phase === 3) {
      this.props.clearPillars();
      this.nextSpikeAt = this.clock.now + 2500;
      floatText(this.scene, this.x, this.y - 30, 'Watch the laser!', '#ff9aa8', 8, 16, 1400);
    }
  }

  private cancelWarning(): void {
    this.clearShapes();
    this.showFrame(this.restFrame());
  }

  private restFrame(): number {
    return this.brain.phase === 1 ? BertFrame.body : BertFrame.angry;
  }

  private showFrame(frame: number): void {
    if (frame === this.shownFrame) return;
    this.shownFrame = frame;
    this.setFrame(frame);
  }

  // Plates

  private breakPlate(side: PlateSide): void {
    const image = this.plateImages.get(side);
    this.plateImages.delete(side);
    const offset = PLATE_OFFSETS[side];
    sparkBurst(this.scene, this.x + offset.x, this.y + offset.y, PLATE_COLOURS[side], 14, 90);
    playSfx(this.scene, 'shatter');
    feel.shake(160, 0.008);
    floatText(this.scene, this.x, this.y - 26, 'Plate off!', '#ffe066', 8, 14, 900);
    if (image) this.scene.tweens.add({ targets: image, y: image.y + 14, angle: 35, alpha: 0, duration: 450, onComplete: () => image.destroy() });
  }

  private dropAllPlates(): void {
    if (brokenPlates(this.plates) === 4) return;
    for (const side of [...this.plateImages.keys()]) this.breakPlate(side);
    this.plates = dropPlates(this.plates);
  }

  // Warnings

  private clearShapes(): void {
    for (const shape of this.shapes) {
      this.scene.tweens.killTweensOf(shape);
      shape.destroy();
    }
    this.shapes = [];
  }

  private slamTelegraph(radius: number, ms: number): void {
    this.shapes.push(...drawWarningRing(this.scene, this.x, this.y + 4, radius, ms));
    playSfx(this.scene, 'enemyShot', { rate: 0.7, volume: 1.6 });
  }

  private slam(radius: number): void {
    const { x, y } = this;
    this.clearShapes();
    const wave = this.scene.add.circle(x, y + 4, radius, 0xffffff, 0.35).setStrokeStyle(3, 0xa8c8ff, 1).setDepth(7);
    this.scene.tweens.add({ targets: wave, scale: 1.25, alpha: 0, duration: 260, onComplete: () => wave.destroy() });
    sparkBurst(this.scene, x, y + 4, 0x9ab8e8, 16, radius * 1.4);
    feel.shake(220, 0.011);
    playSfx(this.scene, 'slam');
    this.hurtInside({ x, y: y + 4 }, radius, this.def.slamDamage ?? 18);
  }

  private hurtInside(at: Point, radius: number, base: number): void {
    const { target } = this;
    if (target.dead || feel.isLocked || Math.hypot(at.x - target.x, at.y - target.y) > radius + 4) return;
    target.takeDamage(damageToPlayer(base, this.level, target.level), at.x, at.y, 'boss');
  }

  private tossTelegraph(radius: number, ms: number, count: number): void {
    this.tossSpots = Array.from({ length: count }, (_, i) => {
      const angle = (i * Math.PI * 2) / count + 0.6;
      const spread = i === 0 ? 0 : 34;
      return { x: this.target.x + Math.cos(angle) * spread, y: this.target.y + Math.sin(angle) * spread };
    });
    for (const spot of this.tossSpots) {
      this.shapes.push(...drawWarningRing(this.scene, spot.x, spot.y, radius, ms));
      const crystal = this.scene.add.image(this.x, this.y - 14, Tex.mines, 18).setScale(1.5).setDepth(12);
      this.scene.tweens.add({ targets: crystal, x: spot.x, y: spot.y, duration: ms, ease: 'Sine.easeInOut' });
      this.scene.tweens.add({ targets: crystal, angle: 360, duration: ms });
      this.shapes.push(crystal);
    }
    playSfx(this.scene, 'enemyShot', { rate: 0.8, volume: 1.4 });
  }

  private toss(radius: number): void {
    this.clearShapes();
    for (const spot of this.tossSpots) {
      sparkBurst(this.scene, spot.x, spot.y, 0xb48cff, 12, radius * 1.6);
      ringBurst(this.scene, spot.x, spot.y, radius, 0xb48cff, 260);
      this.hurtInside(spot, radius, this.def.boltDamage ?? 11);
    }
    feel.shake(120, 0.006);
    playSfx(this.scene, 'shatter');
    this.tossSpots = [];
  }

  // Rolling

  private rollTelegraph(ms: number): void {
    this.rollAim.set(this.target.x - this.x, this.target.y - this.y);
    if (this.rollAim.lengthSq() < 1e-6) this.rollAim.set(1, 0);
    this.rollAim.normalize();
    this.showFrame(BertFrame.ball);
    const end = bouncePath(this.arena, { x: this.x, y: this.y }, this.rollAim, 0)[1]!;
    this.shapes.push(...drawRollArrow(this.scene, this, this.rollAim, end, ms));
    playSfx(this.scene, 'enemyShot', { rate: 0.6, volume: 1.6 });
  }

  private startRoll(speed: number, bounces: number): void {
    this.clearShapes();
    this.roll = newRoll(this.rollAim);
    this.rollSpeed = speed;
    this.rollBounces = bounces;
    this.rollFrom = { x: this.x, y: this.y };
    playSfx(this.scene, 'roll');
  }

  private rolling(_time: number): void {
    const to = { x: this.x, y: this.y };
    const out = rollTravel(this.roll, this.rollFrom, to, this.arena, bertTuning.bodyRadius, this.props.obstacles);
    this.roll = out.roll;
    this.rollFrom = to;
    if (out.event?.type === 'crash') return this.crash(out.event.id);
    const bumped = this.bumpIntoSomething();
    if (out.event?.type === 'bounce' || bumped) {
      feel.shake(110, 0.006);
      playSfx(this.scene, 'slam', { volume: 0.5, rate: 1.3 });
      sparkBurst(this.scene, this.x, this.y, 0x9ab8e8, 6, 50);
    }
    if (rollDone(this.roll, this.rollBounces)) {
      const ended = bertRollEnded(this.brain, this.clock.now, bertBrain.uncurlMs);
      this.brain = ended.state;
      ended.actions.forEach((a) => this.perform(a));
      return;
    }
    const speed = this.rollSpeed * this.speedFactor;
    this.setVelocity(this.roll.dir.x * speed, this.roll.dir.y * speed);
  }

  /** Real walls (or the hero) in the way turn the roll round too, so a mis-sized arena circle can never pin him. */
  private bumpIntoSomething(): boolean {
    const blocked = (this.body as Phaser.Physics.Arcade.Body).blocked;
    let { x, y } = this.roll.dir;
    const hitX = (blocked.left && x < 0) || (blocked.right && x > 0);
    const hitY = (blocked.up && y < 0) || (blocked.down && y > 0);
    if (!hitX && !hitY) return false;
    if (hitX) x = -x;
    if (hitY) y = -y;
    this.roll = { dir: { x, y }, bounces: this.roll.bounces + 1 };
    return true;
  }

  private crash(id: string): void {
    const spike = this.props.kindOf(id) === 'spike';
    this.props.shatter(id);
    const crashed = bertCrash(this.brain, this.clock.now, spike ? bertTuning.spikeStunMs : bertBrain.stunMs);
    this.brain = crashed.state;
    crashed.actions.forEach((a) => this.perform(a));
  }

  private endRoll(): void {
    this.setVelocity(0, 0);
    this.showFrame(this.restFrame());
    this.setAngle(0);
    this.puff();
  }

  private startStun(ms: number): void {
    this.setVelocity(0, 0);
    this.showFrame(BertFrame.stunned);
    this.setAngle(0);
    this.stars.forEach((s) => s.destroy());
    this.stars = [0, 1, 2].map(() => this.scene.add.image(this.x, this.y, Tex.star).setScale(0.5).setTint(0xffe066).setDepth(13));
    floatText(this.scene, this.x, this.y - 30, 'Dazed! Hit him!', '#ffe066', 8, 16, Math.min(ms, 1600));
    playSfx(this.scene, 'crystalHit');
  }

  private endStun(): void {
    this.stars.forEach((s) => s.destroy());
    this.stars = [];
    this.showFrame(this.restFrame());
  }

  // Laser and spikes

  private laserTelegraph(ms: number, bounces: number): void {
    this.clearShapes();
    const dir = new Phaser.Math.Vector2(this.target.x - this.x, this.target.y - this.y);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0);
    this.laserPath = bouncePath(this.arena, { x: this.x, y: this.y }, dir.normalize(), bounces);
    this.shapes.push(...drawLaserLine(this.scene, this.laserPath, ms));
    playSfx(this.scene, 'enemyShot', { rate: 0.5, volume: 1.5 });
  }

  private laserFire(ms: number): void {
    this.clearShapes();
    drawLaserBeam(this.scene, this.laserPath, ms + 120);
    feel.shake(160, 0.007);
    playSfx(this.scene, 'shatter', { volume: 1.2 });
    const { target } = this;
    if (!target.dead && !feel.isLocked && pathDistance(this.laserPath, target) <= bertTuning.laserWidth / 2 + LASER_CORRIDOR_PAD) {
      target.takeDamage(damageToPlayer(bertTuning.laserDamage, this.level, target.level), this.x, this.y, 'boss');
    }
  }

  private growSpikes(time: number): void {
    if (this.brain.phase < 3 || time < this.nextSpikeAt || this.props.spikeCount >= bertTuning.spikeMax) return;
    this.nextSpikeAt = time + bertTuning.spikeEveryMs;
    this.props.growSpike(this.centre, (this.arena as { radius: number }).radius, [this.target, this]);
  }

  // Looks

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.alive) return;
    this.setFlipX(false);
    const rolling = this.brain.mode === 'rolling';
    if (rolling) this.angle += delta * SPIN_PER_MS * (this.roll.dir.x >= 0 ? 1 : -1);
    this.plateImages.forEach((image) => image.setPosition(this.x, this.y).setVisible(!rolling));
    const now = this.clock.now;
    this.stars.forEach((star, i) => {
      const a = now / 260 + (i * Math.PI * 2) / this.stars.length;
      star.setPosition(this.x + Math.cos(a) * STAR_RADIUS, this.y - 14 + Math.sin(a) * 4);
    });
  }

  protected override die(): void {
    this.clearShapes();
    this.props.clearAll();
    this.stars.forEach((s) => s.destroy());
    this.plateImages.forEach((image) => image.destroy());
    this.plateImages.clear();
    this.shots.clear();
    const rocks = this.scene.add.image(this.x, this.y + 2, Tex.bert, BertFrame.rocks).setScale(this.def.scale ?? 1).setDepth(4).setAlpha(0);
    this.scene.tweens.add({ targets: rocks, alpha: 1, duration: 500 });
    this.scene.tweens.add({ targets: rocks, alpha: 0, delay: 3200, duration: 800, onComplete: () => rocks.destroy() });
    sparkBurst(this.scene, this.x, this.y, 0x9ab8e8, 30, 120);
    feel.shake(400, 0.01);
    playSfx(this.scene, 'crumble');
    playSfx(this.scene, 'crumble', { delay: 0.25 });
    super.die();
    this.events.emit('boss-hp', 0, this.maxHp);
    this.events.emit('boss-died', this.x, this.y);
  }

  override destroy(fromScene?: boolean): void {
    this.clearShapes();
    this.props?.destroy();
    this.stars.forEach((s) => s.destroy());
    this.plateImages.forEach((image) => image.destroy());
    super.destroy(fromScene);
  }
}
