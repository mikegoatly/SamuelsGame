import Phaser from 'phaser';
import { MinesFrame, Tex } from '../content/assetKeys';
import { NabThief } from '../entities/NabThief';
import type { Pickup } from '../entities/Pickup';
import type { Player } from '../entities/Player';
import type { Rect } from '../logic/geometry';
import { GEM_COLOURS, gemItemId } from '../logic/gems';
import { edgeArrow, gateLeft, gateRingRadius, hitNab, nabGivesUp, nabSpeed, nearestCoin, newNabChase, type NabChase } from '../logic/nabChase';
import { pickRectSpawn } from '../logic/spawnPoints';
import { StepOnTrigger } from '../logic/stepOn';
import type { EnemyFactory } from './EnemyFactory';
import { feel } from './feel';
import { floatText } from './floatText';
import type { GameClock } from './GameClock';
import type { GameEvents } from './GameEvents';
import type { LootSystem } from './LootSystem';
import { playSfx } from './sfx';

const ARRIVE_DISTANCE = 96;
const ROOM_INSET = 24;
const POCKET_DISTANCE = 8;
const GATE_TOUCH = 16;
const ARROW_INSET = 14;
const RING_URGENT = 0.3;
const GATE_COLOR = 0xb98cff;
const URGENT_COLOR = 0xff6a6a;

export interface NabOptions {
  scene: Phaser.Scene;
  player: Player;
  clock: GameClock;
  events: GameEvents;
  factory: EnemyFactory;
  loot: LootSystem;
  /** The combat room whose clear brings him. */
  room: number;
  roomRect: (order: number) => Rect | undefined;
  isBlocked: (x: number, y: number) => boolean;
  /** Nothing else has the game paused, so the gate prompt may open. */
  canPrompt: () => boolean;
  /** He turned up (the pity counter resets). */
  onAppear: () => void;
  /** The hero stepped into the open gate. */
  onGate: () => void;
}

type Phase = 'waiting' | 'chase' | 'gate' | 'done';

/** Nab the gem thief: turns up as a room clears, pockets floor coins, drops a gem per hit and opens a magic gate on the third; reaching it in time asks to follow him into the mines. */
export class NabSystem {
  private phase: Phase = 'waiting';
  private nab?: NabThief;
  private chase: NabChase = newNabChase(0);
  private gate?: { x: number; y: number; openedAt: number; sprite: Phaser.GameObjects.Image; peek: Phaser.GameObjects.Image; trigger: StepOnTrigger };
  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(private readonly o: NabOptions) {
    const { scene, events } = o;
    this.gfx = scene.add.graphics().setDepth(25);
    events.on('room-cleared', (order: number) => {
      if (order === o.room && this.phase === 'waiting') this.arrive(order);
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this));
  }

  private get halted(): boolean {
    return feel.isLocked || this.o.player.dead;
  }

  private arrive(order: number): void {
    const { player, factory, clock, scene } = this.o;
    const rect = this.o.roomRect(order);
    if (!rect || this.halted) return;
    const spot = factory.world.clearSpot(pickRectSpawn(rect, player, ARRIVE_DISTANCE, Math.random, this.o.isBlocked, ROOM_INSET));
    this.nab = factory.spawnWith((context) => new NabThief(scene, spot.x, spot.y, player.level, context, () => this.onHit()));
    this.nab.room = rect;
    this.chase = newNabChase(clock.now);
    this.phase = 'chase';
    this.o.onAppear();
    floatText(scene, spot.x, spot.y - 14, 'A thief!', '#9fe07a', 16, 18, 1400);
    playSfx(scene, 'thwip');
  }

  private onHit(): void {
    const nab = this.nab;
    if (!nab || this.phase !== 'chase' || this.halted) return;
    const step = hitNab(this.chase, this.o.clock.now);
    if (step.result === 'ignored') return;
    this.chase = step.chase;
    nab.speed = nabSpeed(this.chase.hits);
    const colour = GEM_COLOURS[Math.floor(Math.random() * GEM_COLOURS.length)]!;
    this.o.loot.spawn(gemItemId(colour), nab.x, nab.y);
    playSfx(this.o.scene, 'crystalHit', { rate: 1 + this.chase.hits * 0.1 });
    if (step.result === 'gate') this.openGate(nab);
    else floatText(this.o.scene, nab.x, nab.y - 14, this.chase.hits === 1 ? 'Hey!' : 'Stop it!', '#9fe07a', 16, 16, 900);
  }

  private openGate(nab: NabThief): void {
    const { scene, clock } = this.o;
    this.phase = 'gate';
    nab.still = true;
    const { x, y } = this.o.factory.world.clearSpot(nab);
    playSfx(scene, 'shatter');
    feel.shake(120, 0.004);
    const sprite = scene.add.image(x, y, Tex.mines, MinesFrame.gate[0]).setDepth(3).setScale(0);
    scene.tweens.add({ targets: sprite, scale: 1.6, duration: 260, ease: 'Back.easeOut' });
    const peek = scene.add.image(x, y - 6, Tex.mines, MinesFrame.nabWave).setDepth(4).setVisible(false);
    this.gate = { x, y, openedAt: clock.now, sprite, peek, trigger: new StepOnTrigger() };
    floatText(scene, x, y - 18, 'Catch me if you can!', '#c8a8ff', 16, 18, 1600);
    scene.tweens.add({
      targets: nab,
      scale: 0.2,
      alpha: 0,
      x,
      y: y + 2,
      duration: 380,
      onComplete: () => {
        nab.dismiss();
        if (!this.gate) return;
        peek.setVisible(true);
        scene.tweens.add({ targets: peek, angle: { from: -14, to: 14 }, duration: 260, yoyo: true, repeat: -1 });
      },
    });
  }

  private update(): void {
    this.gfx.clear();
    if (this.phase === 'chase') this.updateChase();
    else if (this.phase === 'gate') this.updateGate();
  }

  private updateChase(): void {
    const nab = this.nab;
    if (!nab?.active) return this.finish();
    if (this.halted) {
      nab.still = true;
      return;
    }
    const now = this.o.clock.now;
    if (nabGivesUp(this.chase, now)) {
      floatText(this.o.scene, nab.x, nab.y - 14, 'Nab got away!', '#9fe07a', 16, 18, 1400);
      nab.slipAway();
      return this.finish();
    }
    const coins = (this.o.loot.group.getChildren() as Pickup[]).filter((p) => p.active && p.def.kind === 'coin');
    const coin = nearestCoin(nab, coins) as Pickup | undefined;
    nab.goal = coin;
    if (coin && Phaser.Math.Distance.Between(nab.x, nab.y, coin.x, coin.y) < POCKET_DISTANCE) {
      coin.destroy();
      playSfx(this.o.scene, 'coin', { rate: 0.8, volume: 0.6 });
      floatText(this.o.scene, nab.x, nab.y - 12, 'Mine!', '#ffe066', 16, 12, 700);
    }
  }

  private updateGate(): void {
    const gate = this.gate;
    if (!gate) return;
    if (this.halted) return;
    const left = gateLeft(gate.openedAt, this.o.clock.now);
    if (left <= 0) {
      floatText(this.o.scene, this.o.player.x, this.o.player.y - 18, 'Too slow!', '#ff8a8a', 16, 18, 1600);
      this.close();
      return;
    }
    gate.sprite.setFrame(MinesFrame.gate[Math.floor(this.o.clock.now / 120) % MinesFrame.gate.length]!);
    const colour = left < RING_URGENT ? URGENT_COLOR : GATE_COLOR;
    this.gfx.lineStyle(3, colour, 0.9).strokeCircle(gate.x, gate.y, gateRingRadius(left));
    this.drawArrow(gate, colour);
    const { player } = this.o;
    const inside = Phaser.Math.Distance.Between(player.x, player.y, gate.x, gate.y) < GATE_TOUCH;
    if (gate.trigger.step(inside, this.o.canPrompt())) this.o.onGate();
  }

  private drawArrow(target: { x: number; y: number }, colour: number): void {
    const camera = this.o.scene.cameras.main;
    const view = camera.worldView;
    const arrow = edgeArrow({ x: view.x, y: view.y, width: view.width, height: view.height }, target, ARROW_INSET / camera.zoom);
    if (!arrow) return;
    const size = 10 / camera.zoom;
    const { x, y, angle } = arrow;
    const point = (a: number, r: number): [number, number] => [x + Math.cos(angle + a) * r, y + Math.sin(angle + a) * r];
    const [ax, ay] = point(0, size);
    const [bx, by] = point(2.5, size);
    const [cx, cy] = point(-2.5, size);
    this.gfx.fillStyle(colour, 1).fillTriangle(ax, ay, bx, by, cx, cy);
    this.gfx.lineStyle(2 / camera.zoom, 0x14121c, 1).strokeTriangle(ax, ay, bx, by, cx, cy);
  }

  /** The gate closes (prompt answered with Not now, or too slow). */
  close(): void {
    const gate = this.gate;
    this.gate = undefined;
    this.gfx.clear();
    if (gate) {
      const { scene } = this.o;
      scene.tweens.killTweensOf(gate.peek);
      scene.tweens.add({ targets: [gate.sprite, gate.peek], scale: 0, alpha: 0, duration: 260, onComplete: () => [gate.sprite, gate.peek].forEach((g) => g.destroy()) });
    }
    this.finish();
  }

  private finish(): void {
    this.phase = 'done';
    this.nab = undefined;
  }
}
