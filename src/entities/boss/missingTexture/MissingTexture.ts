import type Phaser from 'phaser';
import { getEnemy } from '../../../content/enemies';
import { GlitchFrame } from '../../../content/assetKeys';
import { copyBrain, CopyCycle, FAKE, fakeBrain, FakeTracker, fakesMayFire, mtPhase, SWITCH_MS, type CopyId, type CycleEvent, type MtPhase } from '../../../logic/missingTexture';
import { feel } from '../../../systems/feel';
import { floatLabel, floatText } from '../../../systems/floatText';
import { pixelPuff, shatter } from '../../../systems/glitch/shatter';
import { playSfx } from '../../../systems/sfx';
import type { Boss, BossHooks } from '../../Boss';
import { Fake } from './Fake';

const FLICKER_MS = 120;
const BOLT_PUFF_RADIUS = 22;
const HURT_MS = 150;
const BANNER_COLOR = '#ff80f0';

/** Mother Sludge's def has no tint of its own; her glob green stands in. */
const COPY_TINT: Partial<Record<CopyId, number>> = { motherSludge: 0x8fe05a };
const tintOf = (copy: CopyId): number | null => getEnemy(copy).tint ?? COPY_TINT[copy] ?? null;
const BANNER_MARGIN = 8;
const ERROR_DELAY_MS = 600;
const ERROR_RISE = 96;
const nameOf = (copy: CopyId): string => (getEnemy(copy).name ?? copy).toUpperCase();

/**
 * The Missing Texture's brain on top of the ordinary boss body: it keeps swapping which boss's moves the body runs (copy cycle), grows two hollow fakes at
 * half health (they pop after three hits on the real one and re-form after a while) and breaks the floor below a fifth. The rules are pure (logic/missingTexture).
 */
export class MissingTexture {
  private readonly cycle: CopyCycle;
  private readonly tracker = new FakeTracker();
  private fakes: Fake[] = [];
  private phase: MtPhase = 1;
  private applied = '';
  private nextTint: number | null = null;
  private floor?: { start(): void; stop(): void };
  private inside = new Set<object>();

  constructor(private readonly boss: Boss, private readonly hooks: BossHooks) {
    this.cycle = new CopyCycle(Math.random);
    this.wear(this.cycle.copy);
  }

  /** Called every frame the boss can act. True while it is changing copy (the body stands still and attacks nothing). */
  update(now: number): boolean {
    const { boss } = this;
    const phase = mtPhase(boss.hp / boss.maxHp);
    if (phase !== this.phase) this.enter(phase);
    for (const event of this.cycle.update(now, boss.mode, this.phase)) this.onCycle(event);
    if (this.cycle.switching) this.flicker(now);
    else if (boss.mode === 'chase') this.applyMoves();
    this.updateFakes(now);
    return this.cycle.switching;
  }

  /** A hit landed on the real boss. */
  onHit(): void {
    const { boss } = this;
    if (this.tracker.hit(boss.clock.now, this.phase, this.fakes.length > 0)) this.popFakes();
    boss.setFrame(GlitchFrame.bossHurt);
    boss.scene.time.delayedCall(HURT_MS, () => boss.alive && boss.setFrame(GlitchFrame.bossIdle));
  }

  onDeath(): void {
    const { boss } = this;
    this.floor?.stop();
    this.floor = undefined;
    this.removeFakes(true);
    shatter(boss.scene, boss.x, boss.y, boss.def.scale ?? 1);
    const { scene, x, y } = boss;
    scene.time.delayedCall(ERROR_DELAY_MS, () => floatText(scene, x, y - ERROR_RISE, 'ERROR: BOSS NOT FOUND', BANNER_COLOR, 16, 12, 2400));
  }

  destroy(): void {
    this.floor?.stop();
    this.removeFakes(false);
  }

  private enter(phase: MtPhase): void {
    this.phase = phase;
    this.announce();
    if (phase === 3) {
      this.removeFakes(true);
      this.floor = this.hooks.floorGlitch?.();
      this.floor?.start();
    }
  }

  private onCycle(event: CycleEvent): void {
    const { boss } = this;
    if (event.type === 'switch-start') {
      this.nextTint = tintOf(event.to);
      boss.setVelocity(0, 0);
      this.banner(`COPYING: ${nameOf(event.to)}...`);
      playSfx(boss.scene, 'bossPhase', { volume: 0.5, rate: 1.4 });
      this.announce();
    } else this.wear(event.copy);
  }

  /** Floating banner above the boss, kept inside the camera view (a phone screen is narrow). */
  private banner(text: string): void {
    const { boss } = this;
    const label = floatLabel(boss.scene, boss.x, boss.y - boss.displayHeight / 2 - 10, text, BANNER_COLOR, 16, 8, SWITCH_MS);
    const view = boss.scene.cameras.main.worldView;
    const half = label.displayWidth / 2 + BANNER_MARGIN;
    if (view.width > 2 * half) label.x = Math.min(Math.max(label.x, view.x + half), view.right - half);
  }

  /** Tells the Glitch screen effect to burst (it listens for this event). */
  private announce(): void {
    this.boss.events.emit('glitch-announce');
  }

  /** Flickers between the plain checker and the colour it is about to wear (a steady colour change when flashes are reduced). */
  private flicker(now: number): void {
    const on = feel.reduced || Math.floor(now / FLICKER_MS) % 2 === 1;
    this.boss.setBodyTint(on ? this.nextTint : null);
  }

  private wear(copy: CopyId): void {
    this.boss.setBodyTint(tintOf(copy));
    for (const fake of this.fakes) fake.setTint(tintOf(copy));
    this.applyMoves();
  }

  /** Hands the body (and the fakes) the attacks of the current copy and phase, once per change and only between attacks. */
  private applyMoves(): void {
    const key = this.cycle.attackKey(this.phase);
    if (key === this.applied || this.boss.mode !== 'chase') return;
    this.applied = key;
    this.boss.applyBrain(copyBrain(this.cycle.copy, this.phase));
    const brain = fakeBrain(this.cycle.copy, this.phase);
    for (const fake of this.fakes) fake.setBrain(brain);
  }

  private updateFakes(now: number): void {
    const { boss } = this;
    if (this.tracker.update(now, this.phase)) this.growFakes(true);
    if (this.tracker.present(this.phase) && this.fakes.length === 0) this.growFakes(false);
    const live = fakesMayFire({ switching: this.cycle.switching, locked: feel.isLocked, targetDead: boss.target.dead });
    for (const fake of this.fakes) fake.update(now, live);
    this.puffBolts();
  }

  private growFakes(reform: boolean): void {
    const { boss } = this;
    const copy = this.cycle.copy;
    this.fakes = Array.from({ length: FAKE.count }, (_, i) => new Fake(boss, i, fakeBrain(copy, this.phase), tintOf(copy)));
    if (reform) for (const fake of this.fakes) pixelPuff(boss.scene, fake.x, fake.y);
  }

  private popFakes(): void {
    this.removeFakes(true);
    playSfx(this.boss.scene, 'shatter');
    this.announce();
  }

  private removeFakes(effect: boolean): void {
    for (const fake of this.fakes) {
      if (effect) shatter(this.boss.scene, fake.x, fake.y, 1.5);
      fake.destroy();
    }
    this.fakes = [];
  }

  /** Player shots fly straight through the fakes: a little pixel puff shows where they passed. */
  private puffBolts(): void {
    const bolts = this.hooks.playerBolts;
    if (!bolts || this.fakes.length === 0) {
      this.inside.clear();
      return;
    }
    const now = new Set<object>();
    for (const bolt of bolts.getChildren() as Phaser.Physics.Arcade.Sprite[]) {
      if (!bolt.active || !this.fakes.some((fake) => Math.hypot(fake.x - bolt.x, fake.y - bolt.y) < BOLT_PUFF_RADIUS)) continue;
      now.add(bolt);
      if (!this.inside.has(bolt)) pixelPuff(this.boss.scene, bolt.x, bolt.y);
    }
    this.inside = now;
  }
}
