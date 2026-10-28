import Phaser from 'phaser';
import { applyHp, completeMerge, findMerge, isDead, mergeDue, newFamily, splitDue, splitPiece, startMerge, totalHp, type Family, type Piece } from '../../logic/bossSplit';
import { feel } from '../../systems/feel';
import type { GameClock } from '../../systems/GameClock';
import type { GameEvents } from '../../systems/GameEvents';
import { playSfx } from '../../systems/sfx';
import type { Boss } from '../Boss';

const PIECE_IDS = ['motherSludge', 'sludgeling', 'sludgelet'] as const;
/** Pieces further apart than this do not start to merge. */
const MERGE_RANGE = 220;
const SCAN_MS = 250;
/** After a hit breaks a merge, no new one starts for this long, so the player gets a breather. */
const CANCEL_PAUSE_MS = 2500;
const OFFSET_STEPS = 5;
const GLOW = 0xb8ffe8;

/** The pieces' spawner, supplied by the level (EnemyFactory). */
export interface PieceSpawner {
  (id: string, level: number, x: number, y: number, hp: number, family: BossFamily, pieceId: number): Boss;
}

/**
 * Runs Mother Sludge's family: one health pool shared by the pieces (rules in logic/bossSplit), the split and merge actions, and the
 * single boss bar. It ticks on the scene's update, after every piece has moved, so pieces can be swapped safely.
 */
export class BossFamily {
  private state: Family;
  private readonly bosses: Boss[] = [];
  private line?: Phaser.GameObjects.Graphics;
  private nextScanAt = 0;
  private merging: [Boss, Boss] | null = null;
  private done = false;
  /** Landing rings currently warned by pieces, so landings spread out and puddles never form inside a ring that is still telegraphed. */
  private readonly claims: { owner: Boss; x: number; y: number; r: number; until: number }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly clock: GameClock,
    private readonly events: GameEvents,
    private readonly level: number,
    motherMax: number,
    private readonly spawner: PieceSpawner,
    private readonly emergeSpot: (x: number, y: number) => { x: number; y: number },
  ) {
    this.state = newFamily(motherMax, clock.now);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
  }

  /** The mother's full health: what the bar is measured against. */
  get maxHp(): number {
    return this.state.motherMax;
  }

  add(boss: Boss): void {
    this.bosses.push(boss);
  }

  emitHp(): void {
    this.events.emit('boss-hp', totalHp(this.state), this.state.motherMax);
  }

  /** A piece took damage (`hit` false for damage over time, which does not interrupt a merge). */
  report(boss: Boss, hit: boolean): void {
    const result = applyHp(this.state, boss.pieceId, boss.hp, this.clock.now, hit);
    this.state = result.family;
    if (result.mergeCancelled) {
      this.endMerge();
      if (hit) this.nextScanAt = this.clock.now + CANCEL_PAUSE_MS;
    }
    this.emitHp();
  }

  /** A piece died: true when it was the last one, so the boss is dead. */
  pieceDied(boss: Boss): boolean {
    const result = applyHp(this.state, boss.pieceId, 0, this.clock.now, true);
    this.state = result.family;
    if (result.mergeCancelled) this.endMerge();
    this.forget(boss);
    if (!isDead(this.state)) {
      this.emitHp();
      return false;
    }
    this.dispose();
    return true;
  }

  /** Registers a landing ring for `owner` until `until`; moves it round the wanted spot if another piece already claimed it. */
  claimLanding(owner: Boss, want: { x: number; y: number }, r: number, until: number, free: (x: number, y: number) => boolean): { x: number; y: number } {
    const now = this.clock.now;
    for (let i = this.claims.length - 1; i >= 0; i--) if (this.claims[i]!.until <= now || this.claims[i]!.owner === owner) this.claims.splice(i, 1);
    let spot = want;
    for (let k = 0; k <= OFFSET_STEPS; k++) {
      const angle = ((k - 1) * Math.PI * 2) / OFFSET_STEPS;
      const x = k === 0 ? want.x : want.x + Math.cos(angle) * r * 0.9;
      const y = k === 0 ? want.y : want.y + Math.sin(angle) * r * 0.9;
      if (!this.claims.some((c) => Math.hypot(c.x - x, c.y - y) < (c.r + r) * 0.7) && free(x, y)) {
        spot = { x, y };
        break;
      }
    }
    this.claims.push({ owner, x: spot.x, y: spot.y, r, until });
    return spot;
  }

  /** The owner has landed: its ring is gone. True when another piece's ring still covers (x, y) within r. */
  releaseLanding(owner: Boss, x: number, y: number, r: number): boolean {
    const now = this.clock.now;
    let covered = false;
    for (let i = this.claims.length - 1; i >= 0; i--) {
      const c = this.claims[i]!;
      if (c.owner === owner) this.claims.splice(i, 1);
      else if (c.until > now && Math.hypot(c.x - x, c.y - y) < c.r + r) covered = true;
    }
    return covered;
  }

  splitDue(boss: Boss): boolean {
    return splitDue(this.state, boss.pieceId);
  }

  private update(): void {
    const now = this.clock.now;
    for (let i = this.bosses.length - 1; i >= 0; i--) {
      const boss = this.bosses[i]!;
      if (boss.splitAt > 0 && now >= boss.splitAt && boss.alive) this.split(boss);
    }
    if (this.state.merge) this.stepMerge(now);
    else if (now >= this.nextScanAt) {
      this.nextScanAt = now + SCAN_MS;
      this.scanForMerge(now);
    }
  }

  private split(boss: Boss): void {
    const result = splitPiece(this.state, boss.pieceId, this.clock.now);
    boss.splitAt = 0;
    if (!result) return;
    this.state = result.family;
    const { x, y } = boss;
    const away = this.emergeSpot(x, y);
    this.forget(boss);
    boss.dismiss();
    result.children.forEach((child, i) => this.spawnPiece(child, i === 0 ? { x, y } : away));
    feel.shake(220, 0.008);
    playSfx(this.scene, 'squelch');
    this.emitHp();
  }

  private spawnPiece(piece: Piece, at: { x: number; y: number }): Boss {
    const boss = this.spawner(PIECE_IDS[piece.tier]!, this.level, at.x, at.y, piece.hp, this, piece.id);
    this.bosses.push(boss);
    return boss;
  }

  private forget(boss: Boss): void {
    const at = this.bosses.indexOf(boss);
    if (at >= 0) this.bosses.splice(at, 1);
  }

  private bossOf(id: number): Boss | undefined {
    for (const boss of this.bosses) if (boss.pieceId === id) return boss;
    return undefined;
  }

  private readonly pairable = (a: Piece, b: Piece): boolean => {
    const first = this.bossOf(a.id);
    const second = this.bossOf(b.id);
    return !!first && !!second && first.mergeReady && second.mergeReady && Phaser.Math.Distance.Between(first.x, first.y, second.x, second.y) <= MERGE_RANGE;
  };

  private scanForMerge(now: number): void {
    if (this.bosses.length < 2 || feel.isLocked) return;
    const pair = findMerge(this.state, now, this.pairable);
    if (!pair) return;
    const a = this.bossOf(pair[0].id)!;
    const b = this.bossOf(pair[1].id)!;
    this.state = startMerge(this.state, pair[0], pair[1], now);
    this.merging = [a, b];
    a.merging = b.merging = true;
    playSfx(this.scene, 'squelch', { rate: 0.7 });
  }

  private stepMerge(now: number): void {
    const pair = this.merging;
    if (!pair || !pair[0].alive || !pair[1].alive) return this.endMerge();
    const [a, b] = pair;
    if (mergeDue(this.state, now)) return this.completeMerge(a, b, now);
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const at = this.state.merge!.mergeAt;
    a.slideTo(mx, my, at);
    b.slideTo(mx, my, at);
    this.drawLine(a, b, now);
  }

  private completeMerge(a: Boss, b: Boss, now: number): void {
    const done = completeMerge(this.state, now);
    if (!done) return this.endMerge();
    this.state = done.family;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    this.merging = null;
    this.clearLine();
    this.forget(a);
    this.forget(b);
    a.dismiss();
    b.dismiss();
    this.spawnPiece(done.piece, { x: mx, y: my });
    playSfx(this.scene, 'squelch', { rate: 0.6 });
  }

  /** Drops the merge (hit, partner gone) and frees both pieces to fight again. */
  private endMerge(): void {
    if (this.merging) for (const boss of this.merging) boss.merging = false;
    this.merging = null;
    this.state = this.state.merge ? { ...this.state, merge: null } : this.state;
    this.clearLine();
  }

  /** A glow line between the two, pulsing faster as they close in. */
  private drawLine(a: Boss, b: Boss, now: number): void {
    const line = (this.line ??= this.scene.add.graphics().setDepth(7));
    const pulse = feel.reduced ? 0.8 : 0.55 + 0.35 * Math.sin(now / 70);
    line.clear().lineStyle(4, GLOW, pulse).lineBetween(a.x, a.y, b.x, b.y).fillStyle(GLOW, pulse).fillCircle(a.x, a.y, 4).fillCircle(b.x, b.y, 4);
  }

  private clearLine(): void {
    this.line?.destroy();
    this.line = undefined;
  }

  private dispose(): void {
    if (this.done) return;
    this.done = true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    this.clearLine();
  }
}
