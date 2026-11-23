import Phaser from 'phaser';
import { Tex } from '../content/assetKeys';
import type { HeroDef } from '../content/heroes';
import { GOD_MODE } from '../debug';
import type { WeaponDef } from '../content/weapons';
import { speedFactorAt } from '../logic/hazards';
import type { Rect } from '../logic/geometry';
import { BowDraw } from '../logic/bowDraw';
import { frontalDamage, passiveEffects, Strikes, type PassiveEffects, type Strike } from '../logic/passives';
import { PLAYER_IFRAMES_MS, PlayerTimers } from '../logic/playerTimers';
import { reviveHp, REVIVE_IFRAMES_MS } from '../logic/potions';
import { KnockoutRules, SECOND_BLOB, secondBlobHp } from '../logic/secondBlob';
import { lobDistance } from '../logic/sludge';
import { computePlayerStats, type PlayerStats } from '../logic/stats';
import { headOffset } from '../logic/accessoryWear';
import type { DamageSource } from '../logic/unlocks';
import { dustPuff, muzzleFlash } from '../systems/fx';
import { sparkBurst } from '../systems/skills/skillFx';
import { feel } from '../systems/feel';
import type { GameClock } from '../systems/GameClock';
import type { GameEvents } from '../systems/GameEvents';
import type { InputController } from '../systems/InputController';
import type { ProgressionSystem } from '../systems/ProgressionSystem';
import { floatText } from '../systems/floatText';
import { playSfx } from '../systems/sfx';
import { rollGlitchTwist, GLITCH_SIDE_DAMAGE } from '../logic/glitchGun';
import { PhaseGlitch } from '../logic/phaseGlitch';
import { BOW_SPREAD, CRESCENT, PIERCE_EXTRA_ENEMIES, spreadAngles } from '../logic/weaponTwists';
import { fireProjectile } from './Projectile';
import { sendWave } from './waveShot';

/** What a hit did: nothing (i-frames, dead), soaked by a shield, or hurt the player. */
export type DamageResult = 'none' | 'absorbed' | 'hurt';

/** Idle angle between each dagger of a dual weapon and the aim line. */
const DUAL_SPREAD = 0.4;
const ABSORB_IFRAMES_MS = 500;

export class Player extends Phaser.Physics.Arcade.Sprite {
  static readonly DASH_SPEED = 260;
  static readonly DASH_MS = 150;
  static readonly DASH_COOLDOWN_MS = 800;
  static readonly IFRAMES_MS = PLAYER_IFRAMES_MS;
  static readonly KNOCKBACK_MS = 120;

  hp: number;
  maxHp: number;
  stats: PlayerStats;
  dead = false;
  /** Quicksand patches (world px) that slow movement. */
  slowZones: Rect[] = [];
  /** Extra velocity from wind gusts (px/s), added to walking. */
  windPush = { x: 0, y: 0 };
  /** While true walking input is ignored (a spider's silk reels the player in); dashing still breaks free. */
  moveLocked = false;
  /** Called each frame a skill slot button is pressed; the skill system decides whether anything happens. */
  skillHandler?: (slot: number, x: number, y: number, aim: Phaser.Math.Vector2) => void;
  /** Soaks up incoming damage (Arcane Shield): returns how much still gets through. */
  damageAbsorber?: (amount: number) => number;
  /** Asked when HP hits 0: true means a Revive Token was spent and the player gets back up. */
  reviver?: () => boolean;
  /** Called on the frame the potion key is pressed. */
  potionHandler?: () => void;
  /** Set when the run is ending: no more shooting or casting. */
  actionsLocked = false;
  /** Called on each melee swing; the melee system finds and hurts whatever the cone touches. */
  meleeHandler?: (x: number, y: number, aim: number, weapon: WeaponDef) => { reverse: boolean } | undefined;
  /** Called when a charged weapon's draw is released (bow); `fraction` is 0..1 of a full draw. */
  bowHandler?: (x: number, y: number, aim: number, fraction: number, weapon: WeaponDef) => void;
  /** Called when the Javelin is thrown. */
  javelinHandler?: (x: number, y: number, aim: number, weapon: WeaponDef) => void;
  /** Called when a lobbed weapon (Sludge Slinger) fires: `distance` is how far the blob should land. */
  lobHandler?: (x: number, y: number, aim: number, distance: number, weapon: WeaponDef) => void;
  /** How far the bow is drawn right now, 0..1. */
  drawFraction = 0;
  weapon: WeaponDef;
  /** Numbers of the hero's passive. */
  readonly effects: PassiveEffects;

  private readonly strikes: Strikes;
  private readonly knockouts: KnockoutRules;
  private head?: Phaser.GameObjects.Image;
  private readonly wand: Phaser.GameObjects.Image;
  /** Second dagger of a dual weapon, mirrored across the aim line. */
  private readonly offhand?: Phaser.GameObjects.Image;
  private readonly aimDirection = new Phaser.Math.Vector2(1, 0);
  private readonly position = new Phaser.Math.Vector2();
  private readonly headingDirection = new Phaser.Math.Vector2(1, 0);
  private swing = { startedAt: -Infinity, aim: 0, reverse: false };
  private readonly draw = new BowDraw();
  private drawWeapon: WeaponDef | undefined;
  private readonly onScenePause = (): void => this.cancelDraw();
  private readonly timers: PlayerTimers;
  private readonly phase = new PhaseGlitch();
  private phaseGhosts?: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private phaseTinted = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: InputController,
    private readonly projectiles: Phaser.Physics.Arcade.Group,
    private readonly progression: ProgressionSystem,
    readonly events: GameEvents,
    weapon: WeaponDef,
    private readonly clock: GameClock,
    readonly hero: HeroDef,
  ) {
    super(scene, x, y, Tex.tiles, hero.frame);
    if (hero.tint !== null) this.setTint(hero.tint);
    this.effects = passiveEffects(hero.passive.id);
    this.timers = new PlayerTimers({
      dashMs: Player.DASH_MS * this.effects.dashScale,
      dashCooldownMs: Player.DASH_COOLDOWN_MS,
      iframesMs: Player.IFRAMES_MS,
      knockbackMs: Player.KNOCKBACK_MS,
    });
    this.strikes = new Strikes(this.effects);
    this.knockouts = new KnockoutRules(this.effects.secondBlob);
    this.weapon = weapon;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setSize(10, 10).setOffset(3, 5).setDepth(10).setPushable(false);
    this.wand = scene.add.image(x, y, Tex.tiles, weapon.frame).setDepth(11);
    this.offhand = weapon.dual ? scene.add.image(x, y, Tex.tiles, weapon.frame).setDepth(11).setFlipX(true) : undefined;
    this.showWeapon();
    this.stats = this.computeStats();
    this.maxHp = this.hp = this.stats.maxHp;
    events.on('level-up', () => this.onLevelUp());
    scene.events.on(Phaser.Scenes.Events.PAUSE, this.onScenePause);
  }

  get level(): number {
    return this.progression.level;
  }

  /** Pause-safe game time, ms. */
  get now(): number {
    return this.clock.now;
  }

  /** Unit direction the player last walked in (monsters arriving "behind" appear opposite it). */
  get heading(): { x: number; y: number } {
    return this.headingDirection;
  }

  get isDashing(): boolean {
    return this.timers.isDashing(this.clock.now);
  }

  get invulnerable(): boolean {
    return this.timers.invulnerable(this.clock.now);
  }

  /** Phase Glitch: enemy projectiles pass straight through (and keep flying) while this is true. */
  get shotsPassThrough(): boolean {
    return this.effects.phaseGlitch && this.phase.active(this.clock.now);
  }

  /** An enemy projectile just hurt the hero: Phase Glitch opens its 1.2s window. */
  onShotLanded(): void {
    if (this.effects.phaseGlitch) this.phase.start(this.clock.now);
  }

  /** What a basic attack hitting an enemy at (x, y) does beyond its damage: the ranger's crit, the monk's stun. */
  strike(x: number, y: number): Strike {
    return this.strikes.strike(Math.hypot(x - this.x, y - this.y));
  }

  private computeStats(): PlayerStats {
    return computePlayerStats(this.level, this.hero.stats, this.weapon.id === this.hero.signatureWeaponId);
  }

  /** `gentle` (burning): no i-frames, knockback, shake, rumble or hurt sound; the health still drops. */
  takeDamage(amount: number, fromX: number, fromY: number, source: DamageSource = 'melee', options: { gentle?: boolean } = {}): DamageResult {
    if (this.dead || this.actionsLocked || feel.isLocked || this.invulnerable || GOD_MODE) return 'none';
    const reduced = frontalDamage(amount, this.aimDirection.angle(), { x: fromX - this.x, y: fromY - this.y }, this.effects, source);
    const through = this.damageAbsorber ? this.damageAbsorber(reduced) : reduced;
    if (through <= 0) {
      this.timers.grantInvulnerability(this.clock.now, ABSORB_IFRAMES_MS);
      return 'absorbed';
    }
    this.hp = Math.max(0, this.hp - through);
    this.events.emit('player-damaged', source, through);
    if (!options.gentle) {
      this.timers.hurt(this.clock.now);
      playSfx(this.scene, 'hurt');
      feel.shake(100, 0.004);
      this.controls.rumble(150, 0.4, 0.7);
      const away = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(120);
      this.setVelocity(away.x, away.y);
      this.events.emit('player-hurt');
    }
    const outcome = this.hp <= 0 ? this.knockouts.resolve(() => this.reviver?.() ?? false) : undefined;
    if (outcome === 'secondBlob') this.shrinkInstead();
    else if (outcome === 'revive') this.revive();
    else {
      this.events.emit('hp-changed', this.hp, this.maxHp);
      if (outcome === 'die') this.die();
    }
    return 'hurt';
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.dead) return;
    const now = this.clock.now;
    this.position.set(this.x, this.y);
    this.controls.update(this.scene, this.position);
    this.aimDirection.copy(this.controls.aimVector);
    if (this.controls.moveVector.lengthSq() > 0.04) this.headingDirection.copy(this.controls.moveVector).normalize();

    this.handleDash(now);
    if (!this.timers.isDashing(now) && !this.timers.inKnockback(now)) {
      const speed = this.stats.moveSpeed * speedFactorAt(this, this.slowZones);
      const [mx, my] = this.moveLocked ? [0, 0] : [this.controls.moveVector.x, this.controls.moveVector.y];
      this.setVelocity(mx * speed + this.windPush.x, my * speed + this.windPush.y);
    }

    if (!this.actionsLocked && this.controls.potion) this.potionHandler?.();
    if (this.actionsLocked) this.cancelDraw();
    else this.handleFire(now);
    if (!this.actionsLocked) this.controls.skills.forEach((pressed, slot) => pressed && this.skillHandler?.(slot, this.x, this.y - 2, this.aimDirection));
    this.updateVisuals(now);
  }

  /** Teleports (Blink Strike) and grants brief i-frames. */
  blinkTo(x: number, y: number, iframesMs: number): void {
    this.setPosition(x, y);
    (this.body as Phaser.Physics.Arcade.Body).reset(x, y);
    this.timers.grantInvulnerability(this.clock.now, iframesMs);
  }

  /** Puts a head accessory (frame of the accessories sheet) on the hero, or takes it off. */
  wearHead(frame: number | undefined): void {
    this.head?.destroy();
    this.head = frame === undefined ? undefined : this.scene.add.image(this.x, this.y, Tex.accessories, frame).setDepth(12);
    this.placeHead(1);
  }

  private placeHead(alpha: number): void {
    const offset = headOffset(this.hero.id, this.flipX);
    this.head?.setPosition(this.x + offset.x * this.scaleX, this.y + offset.y * this.scaleY).setFlipX(this.flipX).setAlpha(alpha).setScale(this.scaleX);
  }

  private showWeapon(): void {
    this.wand.setFrame(this.weapon.frame);
    if (this.weapon.tint === null) this.wand.clearTint();
    else this.wand.setTint(this.weapon.tint);
    this.offhand?.setFrame(this.weapon.frame);
    if (this.weapon.tint !== null) this.offhand?.setTint(this.weapon.tint);
  }

  heal(amount: number): void {
    if (this.dead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.events.emit('hp-changed', this.hp, this.maxHp);
  }

  private onLevelUp(): void {
    if (this.dead) return;
    this.stats = this.computeStats();
    this.maxHp = this.hp = this.stats.maxHp;
    this.events.emit('hp-changed', this.hp, this.maxHp);
  }

  /** Revive Token: back up at half HP with a couple of seconds of i-frames. */
  private revive(): void {
    this.hp = reviveHp(this.maxHp);
    this.timers.grantInvulnerability(this.clock.now, REVIVE_IFRAMES_MS);
    this.events.emit('hp-changed', this.hp, this.maxHp);
    floatText(this.scene, this.x, this.y - 16, 'REVIVED!', '#ffe066', 16, 24, 1500);
    playSfx(this.scene, 'levelUp');
  }

  /** Gloop's Second Blob: back up at 30% HP with a moment of safety, and smaller (so the body is too) for the rest of the run. The squash wobble only ever dips below the final size, so the body never grows into a wall. */
  private shrinkInstead(): void {
    this.hp = secondBlobHp(this.maxHp);
    this.timers.grantInvulnerability(this.clock.now, SECOND_BLOB.iframesMs);
    this.events.emit('hp-changed', this.hp, this.maxHp);
    floatText(this.scene, this.x, this.y - 16, 'SECOND BLOB!', '#7adf4a', 16, 24, 1500);
    playSfx(this.scene, 'levelUp');
    this.setScale(SECOND_BLOB.scale);
    (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    if (feel.reduced) return;
    sparkBurst(this.scene, this.x, this.y, 0x7adf4a, 14, 60);
    this.scene.tweens.add({ targets: this, scaleX: { from: SECOND_BLOB.scale * 0.7, to: SECOND_BLOB.scale }, scaleY: { from: SECOND_BLOB.scale * 0.6, to: SECOND_BLOB.scale }, duration: 520, ease: 'Bounce.easeOut' });
  }

  private die(): void {
    this.dead = true;
    this.cancelDraw();
    this.setVelocity(0, 0);
    this.setTint(0xff5050).setAlpha(1);
    this.wand.setVisible(false);
    this.offhand?.setVisible(false);
    this.head?.setVisible(false);
    this.phaseGhosts?.forEach((g) => g.setVisible(false));
    this.events.emit('player-died');
  }

  private handleDash(now: number): void {
    if (!this.controls.dash || !this.timers.tryDash(now)) return;
    const direction = this.controls.moveVector.lengthSq() > 0 ? this.controls.moveVector : this.aimDirection;
    const unit = direction.clone().normalize();
    this.setVelocity(unit.x * Player.DASH_SPEED, unit.y * Player.DASH_SPEED);
    dustPuff(this.scene, this.x, this.y);
  }

  private get fireRateMs(): number {
    return this.weapon.fireRateMs / this.stats.attackRate;
  }

  /** Drops a half-drawn bow (pause, card, death, locked, weapon swap): no shot, and fire must be released before drawing again. */
  cancelDraw(): void {
    this.draw.cancel();
    this.drawFraction = 0;
    this.wand?.setScale(1);
  }

  private handleDraw(now: number): void {
    if (this.drawWeapon !== this.weapon) {
      this.drawWeapon = this.weapon;
      this.cancelDraw();
    }
    const charge = this.weapon.charge!;
    const before = this.drawFraction;
    const { fraction, released } = this.draw.update(this.controls.fire, now, charge.maxMs, this.timers.canFire(now));
    this.drawFraction = fraction;
    if (before < 1 && fraction >= 1) playSfx(this.scene, 'uiConfirm', { rate: 1.8, volume: 0.5 });
    if (released !== null && this.timers.tryFire(now, this.fireRateMs)) {
      this.bowHandler?.(this.x, this.y - 2, this.aimDirection.angle(), released, this.weapon);
    }
  }

  private handleFire(now: number): void {
    if (this.weapon.charge) {
      this.handleDraw(now);
      return;
    }
    if (this.drawFraction > 0) this.cancelDraw();
    if (!this.controls.fire || !this.timers.tryFire(now, this.fireRateMs)) return;
    if (this.weapon.kind === 'melee') {
      this.swingSword(now);
      return;
    }
    if (this.weapon.javelin) {
      this.javelinHandler?.(this.x, this.y - 2, this.aimDirection.angle(), this.weapon);
      return;
    }
    if (this.weapon.lob) {
      const reach = Math.hypot(this.controls.aimWorldPoint.x - this.x, this.controls.aimWorldPoint.y - this.y);
      const distance = lobDistance({ fromPointer: this.controls.aimFromPointer, distance: reach }, this.weapon.range);
      this.lobHandler?.(this.x, this.y - 2, this.aimDirection.angle(), distance, this.weapon);
      return;
    }
    if (this.weapon.crescent) {
      sendWave(this.projectiles, this.x, this.y - 2, this.aimDirection.angle(), this.weapon, [], CRESCENT, this.weapon.activeTwist === 'boneRise');
      playSfx(this.scene, 'shoot');
      return;
    }
    const shot = this.fireBolts();
    if (shot.fired) {
      playSfx(this.scene, 'shoot');
      muzzleFlash(this.scene, this.x + this.aimDirection.x * 14, this.y - 2 + this.aimDirection.y * 14, this.aimDirection.angle(), shot.tint);
    }
  }

  /** One shot of an ordinary bolt weapon: a fan of three for the Pixel Pulse's level 5 twist, or a rolled twist for the Glitch Gun. True when anything fired. */
  private fireBolts(): { fired: boolean; tint?: number } {
    const { weapon, aimDirection } = this;
    const x = this.x + aimDirection.x * 10;
    const y = this.y - 2 + aimDirection.y * 10;
    const base = aimDirection.angle();
    const roll = weapon.glitchGun ? rollGlitchTwist(Math.random) : undefined;
    const fan = weapon.activeTwist === 'pulseTrio' || roll?.spread === true;
    const pierce = roll ? roll.pierce + (weapon.activeTwist === 'pierce' ? PIERCE_EXTRA_ENEMIES : 0) : undefined;
    let fired = false;
    const angles = fan ? spreadAngles(base, BOW_SPREAD.count, BOW_SPREAD.angle) : [base];
    angles.forEach((angle, i) => {
      const side = fan && i !== Math.floor(angles.length / 2);
      const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
      const scale = (roll?.damageScale ?? 1) * (side ? (roll ? GLITCH_SIDE_DAMAGE : BOW_SPREAD.sideDamageScale) : 1);
      const bolt = fireProjectile(this.projectiles, x, y, direction, weapon, { damageScale: scale, tint: roll?.tint, pierce, splits: roll ? roll.splits : undefined });
      fired ||= bolt !== null;
    });
    return { fired, tint: roll?.tint };
  }

  private swingSword(time: number): void {
    const aim = this.aimDirection.angle();
    const result = this.meleeHandler?.(this.x, this.y - 2, aim, this.weapon);
    this.swing = { startedAt: time, aim, reverse: result?.reverse ?? false };
  }

  /** Angle the held weapon points at: aimed normally, sweeping through the cone while a swing plays. */
  private weaponAngle(time: number): number {
    const melee = this.weapon.melee;
    if (!melee) return this.aimDirection.angle();
    const progress = (time - this.swing.startedAt) / melee.swingMs;
    if (progress < 0 || progress >= 1) return this.aimDirection.angle();
    if (melee.thrust) return this.swing.aim;
    const sweep = this.swing.reverse ? 1 - progress : progress;
    return this.swing.aim - melee.arc / 2 + sweep * melee.arc;
  }

  private updateVisuals(time: number): void {
    const hurt = this.timers.blinking(time);
    const alpha = this.isDashing || this.timers.granted(time) ? 0.5 : hurt && Math.floor(time / 70) % 2 === 0 ? 0.35 : 1;
    this.setFlipX(this.aimDirection.x < 0);
    this.setAlpha(alpha);
    this.placeHead(alpha);
    const aim = this.aimDirection.angle();
    const spread = this.offhand ? DUAL_SPREAD : 0;
    const angle = this.weaponAngle(time) + spread;
    const size = this.scaleX;
    const lift = 2 * size;
    const reach = ((this.weapon.kind === 'melee' ? 11 : 8) - this.drawFraction * 2 + this.punchReach(time)) * size;
    if (this.offhand) {
      const mirrored = 2 * aim - angle;
      this.offhand
        .setPosition(this.x + Math.cos(mirrored) * reach, this.y - lift + Math.sin(mirrored) * reach)
        .setRotation(mirrored + Math.PI / 2)
        .setAlpha(alpha);
    }
    this.wand
      .setPosition(this.x + Math.cos(angle) * reach, this.y - lift + Math.sin(angle) * reach)
      .setRotation(angle + Math.PI / 2)
      .setScale(1 + this.drawFraction * 0.25)
      .setAlpha(alpha);
    if (this.weapon.charge) this.drawFraction >= 1 ? this.wand.setTint(0xffe27a) : this.showWeapon();
    this.updatePhaseLook(time, alpha);
  }

  /** Phase Glitch's look, the one deliberate exception to the hero never glitching: two offset cyan and magenta copies flicker around him (a steady cyan tint when flashes are reduced). Depth 10.5 keeps the copies on the clean camera. */
  private updatePhaseLook(time: number, alpha: number): void {
    const on = this.shotsPassThrough;
    if (!on) {
      if (this.phaseTinted) {
        this.phaseTinted = false;
        if (this.hero.tint !== null) this.setTint(this.hero.tint);
        else this.clearTint();
      }
      this.phaseGhosts?.forEach((g) => g.setVisible(false));
      return;
    }
    if (feel.reduced) {
      this.setTint(0x9ff0ff);
      this.phaseTinted = true;
      this.phaseGhosts?.forEach((g) => g.setVisible(false));
      return;
    }
    this.phaseGhosts ??= [0x60f0ff, 0xff60e0].map((tint) => this.scene.add.image(this.x, this.y, this.texture.key, this.frame.name).setDepth(10.5).setTint(tint)) as [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
    const swap = Math.floor(time / 60) % 2 === 0 ? 1 : -1;
    this.phaseGhosts.forEach((g, i) => g.setTexture(this.texture.key, this.frame.name).setFlipX(this.flipX).setScale(this.scaleX, this.scaleY).setPosition(this.x + (i === 0 ? -2 : 2) * swap, this.y).setAlpha(0.55 * alpha).setVisible(true));
  }

  /** How far a punching weapon is thrust out at this moment. */
  private punchReach(time: number): number {
    const melee = this.weapon.melee;
    const progress = melee ? (time - this.swing.startedAt) / melee.swingMs : 1;
    return melee?.thrust && progress >= 0 && progress < 1 ? Math.sin(progress * Math.PI) * 9 : 0;
  }

  override destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.PAUSE, this.onScenePause);
    this.wand.destroy();
    this.offhand?.destroy();
    this.head?.destroy();
    this.phaseGhosts?.forEach((g) => g.destroy());
    super.destroy(fromScene);
  }
}
