import Phaser from 'phaser';
import { Frame, Music, Sfx } from '../content/assetKeys';
import { CAMERA_ZOOM } from '../content/config';
import { GOD_DAMAGE_MULTIPLIER, GOD_MODE } from '../debug';
import { getLevel, type LevelConfig } from '../content/levels';
import { getEnemy } from '../content/enemies';
import { rewardOf } from '../content/rewards';
import { getWeapon } from '../content/weapons';
import { EnemyProjectiles, type EnemyProjectile } from '../entities/EnemyProjectile';
import type { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { createProjectilePool, Projectile } from '../entities/Projectile';
import { RewardPickup } from '../entities/RewardPickup';
import { damageToEnemy } from '../logic/combat';
import { rectCenter } from '../logic/geometry';
import { addCoins, applyLevelClear, withProgress } from '../logic/save';
import { GameClock } from '../systems/GameClock';
import { EnemyFactory } from '../systems/EnemyFactory';
import { FireballSystem } from '../systems/FireballSystem';
import { GameEvents } from '../systems/GameEvents';
import { floatText } from '../systems/floatText';
import { InputController } from '../systems/InputController';
import type { LevelDirector } from '../systems/LevelDirector';
import { LootSystem, type RunState } from '../systems/LootSystem';
import { MeleeSystem } from '../systems/MeleeSystem';
import { MusicPlayer } from '../systems/MusicPlayer';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { RoomFlowSystem } from '../systems/RoomFlowSystem';
import { saveSystem } from '../systems/SaveSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { SpikeSystem } from '../systems/SpikeSystem';
import { WeaponSwitcher } from '../systems/WeaponSwitcher';
import { buildLevelMap, type LevelMap } from './RoomBuilder';

export interface GameSceneData {
  levelId: string;
}

const BUTTON_START = 9;
const REWARD_FADE_MS = 600;
const BOSS_XP_BONUS = 100;
const REWARD_ARM_MS = 1200;

export class GameScene extends Phaser.Scene {
  private ending = false;
  private level!: LevelConfig;
  private progression!: ProgressionSystem;
  private run: RunState = { coins: 0 };
  private startedAt = 0;
  private kills = 0;
  private clock!: GameClock;
  private enemies!: Phaser.Physics.Arcade.Group;

  constructor() {
    super('Game');
  }

  create(data: Partial<GameSceneData>): void {
    this.ending = false;
    this.kills = 0;
    this.level = getLevel(data.levelId ?? 'arena');
    this.run = { coins: 0 };
    this.clock = new GameClock(this);
    this.startedAt = 0;
    const save = saveSystem.data;
    const events = new GameEvents();
    const progression = (this.progression = new ProgressionSystem(events, save.progress));
    const map = buildLevelMap(this, this.level);
    const { walls, playerStart } = map;
    const projectiles = createProjectilePool(this);
    const shots = new EnemyProjectiles(this);
    const weapon = getWeapon(save.weapons.equipped);
    const player = new Player(
      this,
      playerStart.x,
      playerStart.y,
      new InputController(this),
      projectiles,
      progression,
      events,
      weapon,
      () => saveSystem.data.charms,
    );
    player.slowZones = map.slowZones;
    const enemies = (this.enemies = this.physics.add.group({ allowGravity: false }));
    const isSolid = (x: number, y: number): boolean => [walls, ...map.solid].some((layer) => layer.getTileAtWorldXY(x, y) !== null);
    const factory = new EnemyFactory(this, enemies, { target: player, events, shots, clock: this.clock, isBlocked: isSolid });
    const director = this.createDirector(map, player, factory, events);
    const loot = new LootSystem(this, player, events, this.run, saveSystem);
    const fireball = new FireballSystem({
      scene: this,
      player,
      enemies,
      clock: this.clock,
      unlocked: () => saveSystem.data.powers.unlocked.includes('fireball'),
      isSolid,
    });

    new MeleeSystem({ scene: this, player, enemies, shots, isSolid });
    new WeaponSwitcher(player, events, saveSystem);
    if (map.spikes.length > 0) new SpikeSystem(this, player, this.clock, map.spikes);

    this.addColliders(map, player, enemies, projectiles, shots);
    this.physics.add.overlap(projectiles, enemies, (boltObj, enemyObj) => {
      const bolt = boltObj as Projectile;
      const enemy = enemyObj as Enemy;
      if (!bolt.active || !enemy.alive || !enemy.targetable) return;
      const multiplier = GOD_MODE ? GOD_DAMAGE_MULTIPLIER : 1;
      const damage = damageToEnemy(bolt.weapon.baseDamage, progression.level, enemy.level, player.stats.damageMultiplier) * multiplier;
      enemy.takeHit(damage, bolt.body!.velocity.x, bolt.body!.velocity.y);
      bolt.kill();
    });
    this.physics.add.overlap(player, shots.group, (_, boltObj) => {
      const bolt = boltObj as EnemyProjectile;
      if (!bolt.active) return;
      player.takeDamage(bolt.damage, bolt.x, bolt.y);
      bolt.kill();
    });

    events.on('enemy-died', (level) => {
      this.kills++;
      progression.awardKill(level);
    });
    events.on('level-up', () => {
      this.celebrateLevelUp(player);
      this.persistProgress();
    });
    events.on('player-died', () => this.endRun(director));
    events.on('pause-requested', () => this.pauseGame());
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === BUTTON_START) this.pauseGame();
    });
    const music = this.startMusic(events);
    this.setUpReward(map, player, events);

    this.physics.world.setBounds(0, 0, walls.width, walls.height);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, walls.width, walls.height);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(player, true, 0.15, 0.15);
    camera.fadeIn(250);

    this.scene.launch('Hud', { events, progression, player, director, loot, fireball, roomTotal: map.world?.rooms.length });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      director.stop();
      music?.stop();
      events.clear();
      this.scene.stop('Hud');
    });
    director.start();
  }

  resumeGame(): void {
    this.scene.stop('Pause');
    this.scene.resume();
    this.scene.resume('Hud');
  }

  quitToLevelSelect(): void {
    this.bankRun();
    this.scene.stop('Pause');
    this.scene.start('LevelSelect');
  }

  /** Banks coins, grants the reward weapon, records the clear and shows the results screen. */
  completeLevel(): void {
    if (this.ending) return;
    this.ending = true;
    this.physics.pause();
    const timeMs = Math.round(this.clock.now - this.startedAt);
    const coins = this.run.coins;
    saveSystem.update((save) =>
      applyLevelClear(withProgress(save, this.progression.progress), {
        levelId: this.level.id,
        rewardWeaponId: this.level.rewardWeaponId,
        rewardPowerId: this.level.rewardPowerId,
        runCoins: coins,
        timeMs,
      }),
    );
    this.run.coins = 0;
    const camera = this.cameras.main;
    camera.fadeOut(REWARD_FADE_MS, 20, 18, 28);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('LevelComplete', {
        title: `${this.level.name} recovered!`,
        timeMs,
        kills: this.kills,
        coins,
        xp: this.progression.gainedXp,
        level: this.progression.level,
        reward: rewardOf(this.level),
      }),
    );
  }

  private createDirector(map: LevelMap, player: Player, factory: EnemyFactory, events: GameEvents): LevelDirector {
    const { world, doors, walls } = map;
    if (!world || !doors) return new SpawnSystem(this, player, factory, events, this.level);
    return new RoomFlowSystem({
      scene: this,
      player,
      factory,
      events,
      level: this.level,
      world,
      doors,
      isBlocked: (x, y) => walls.getTileAtWorldXY(x, y) !== null,
    });
  }

  private addColliders(
    map: LevelMap,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    projectiles: Phaser.Physics.Arcade.Group,
    shots: EnemyProjectiles,
  ): void {
    for (const layer of [map.walls, ...map.solid]) {
      this.physics.add.collider(player, layer);
      this.physics.add.collider(enemies, layer);
      this.physics.add.collider(projectiles, layer, (bolt) => (bolt as Projectile).kill());
      this.physics.add.collider(shots.group, layer, (bolt) => (bolt as EnemyProjectile).kill());
    }
    this.physics.add.collider(enemies, enemies);
    this.physics.add.collider(player, enemies, (_, enemy) => (enemy as Enemy).tryContact(player));
  }

  private startMusic(events: GameEvents): MusicPlayer | undefined {
    if (!this.level.music) return undefined;
    const music = new MusicPlayer(this);
    music.play(this.level.music);
    const bossMusic = this.level.bossMusic ?? Music.boss;
    if (bossMusic) events.on('boss-started', () => music.crossfadeTo(bossMusic));
    return music;
  }

  /** The boss drops the level reward at the arena centre; picking it up completes the level. */
  private setUpReward(map: LevelMap, player: Player, events: GameEvents): void {
    const arena = map.world?.bossArena;
    if (!arena) return;
    events.on('boss-died', () => {
      if (this.ending) return;
      this.dismissMinions();
      this.progression.gain(BOSS_XP_BONUS);
      const { x, y } = rectCenter(arena.rect);
      const prize = rewardOf(this.level);
      const reward = new RewardPickup(this, x, y, prize?.frame ?? Frame.glowChest, prize?.tint ?? null);
      floatText(this, x, y - 28, `${getEnemy(this.level.bossId ?? '').name ?? 'Boss'} defeated!`, '#ffe066', 12, 16, 1800);
      let armed = false;
      this.time.delayedCall(REWARD_ARM_MS, () => (armed = true));
      this.physics.add.overlap(player, reward, () => {
        if (!armed || !reward.active || this.ending) return;
        reward.destroy();
        this.sound.play(Sfx.shoot, { volume: 0.5, rate: 2.2 });
        this.completeLevel();
      });
    });
  }

  private dismissMinions(): void {
    for (const enemy of this.enemies.getChildren() as Enemy[]) if (!enemy.def.boss) enemy.dismiss();
  }

  private pauseGame(): void {
    if (this.ending || this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.pause('Hud');
    this.scene.launch('Pause');
  }

  private persistProgress(): void {
    saveSystem.update((save) => withProgress(save, this.progression.progress));
  }

  private bankRun(): void {
    saveSystem.update((save) => addCoins(withProgress(save, this.progression.progress), this.run.coins));
    this.run.coins = 0;
  }

  private celebrateLevelUp(player: Player): void {
    floatText(this, player.x, player.y - 16, 'LEVEL UP!', '#7dffb0', 14, 24, 1100);
    this.sound.play(Sfx.shoot, { volume: 0.5, rate: 1.8 });
    this.sound.play(Sfx.hit, { volume: 0.4, rate: 1.5, delay: 0.1 });
  }

  private endRun(director: LevelDirector): void {
    if (this.ending) return;
    this.ending = true;
    director.stop();
    const lostCoins = this.run.coins;
    this.run.coins = 0;
    this.persistProgress();
    const camera = this.cameras.main;
    this.physics.pause();
    camera.fadeOut(900, 20, 18, 28);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('GameOver', {
        levelId: this.level.id,
        level: this.progression.level,
        progress: director.progressLabel(),
        lostCoins,
      }),
    );
  }
}
