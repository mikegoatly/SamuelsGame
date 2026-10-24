import Phaser from 'phaser';
import { Sfx } from '../content/assetKeys';
import { CAMERA_ZOOM } from '../content/config';
import { getLevel, type LevelConfig } from '../content/levels';
import { getWeapon } from '../content/weapons';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { createProjectilePool, Projectile } from '../entities/Projectile';
import { damageToEnemy } from '../logic/combat';
import { addCoins, applyLevelClear, withProgress } from '../logic/save';
import { GameEvents } from '../systems/GameEvents';
import { floatText } from '../systems/floatText';
import { InputController } from '../systems/InputController';
import { LootSystem, type RunState } from '../systems/LootSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { saveSystem } from '../systems/SaveSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { buildLevelMap } from './RoomBuilder';

export interface GameSceneData {
  levelId: string;
}

const BUTTON_START = 9;

export class GameScene extends Phaser.Scene {
  private ending = false;
  private level!: LevelConfig;
  private progression!: ProgressionSystem;
  private run: RunState = { coins: 0 };
  private startedAt = 0;

  constructor() {
    super('Game');
  }

  create(data: Partial<GameSceneData>): void {
    this.ending = false;
    this.level = getLevel(data.levelId ?? 'arena');
    this.run = { coins: 0 };
    this.startedAt = this.time.now;
    const save = saveSystem.data;
    const events = new GameEvents();
    const progression = (this.progression = new ProgressionSystem(events, save.progress));
    const { walls, playerStart } = buildLevelMap(this, this.level);
    const projectiles = createProjectilePool(this);
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
    const enemies = this.physics.add.group({ allowGravity: false });
    const spawner = new SpawnSystem(this, player, enemies, events, this.level);
    const loot = new LootSystem(this, player, events, this.run, saveSystem);

    this.physics.add.collider(player, walls);
    this.physics.add.collider(enemies, walls);
    this.physics.add.collider(enemies, enemies);
    this.physics.add.collider(player, enemies, (_, enemy) => (enemy as Enemy).tryContact(player));
    this.physics.add.collider(projectiles, walls, (bolt) => (bolt as Projectile).kill());
    this.physics.add.overlap(projectiles, enemies, (boltObj, enemyObj) => {
      const bolt = boltObj as Projectile;
      const enemy = enemyObj as Enemy;
      if (!bolt.active || !enemy.alive) return;
      const damage = damageToEnemy(bolt.weapon.baseDamage, progression.level, enemy.level, player.stats.damageMultiplier);
      enemy.takeHit(damage, bolt.body!.velocity.x, bolt.body!.velocity.y);
      bolt.kill();
    });

    events.on('enemy-died', (level) => progression.awardKill(level));
    events.on('level-up', () => {
      this.celebrateLevelUp(player);
      this.persistProgress();
    });
    events.on('player-died', () => this.endRun(spawner));
    events.on('pause-requested', () => this.pauseGame());
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === BUTTON_START) this.pauseGame();
    });

    this.physics.world.setBounds(0, 0, walls.width, walls.height);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, walls.width, walls.height);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(player, true, 0.15, 0.15);
    camera.fadeIn(250);

    this.scene.launch('Hud', { events, progression, player, spawner, loot });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.clear();
      this.scene.stop('Hud');
    });
    spawner.start();
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

  /** Called by the level flow (M4b) when the boss/exit is done: banks coins, grants the reward, records the clear. */
  completeLevel(): void {
    saveSystem.update((save) =>
      applyLevelClear(withProgress(save, this.progression.progress), {
        levelId: this.level.id,
        rewardWeaponId: this.level.rewardWeaponId,
        runCoins: this.run.coins,
        timeMs: this.time.now - this.startedAt,
      }),
    );
    this.run.coins = 0;
    this.scene.start('LevelSelect');
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

  private endRun(spawner: SpawnSystem): void {
    if (this.ending) return;
    this.ending = true;
    spawner.stop();
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
        wave: spawner.wave,
        lostCoins,
      }),
    );
  }
}
