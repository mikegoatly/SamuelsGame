import Phaser from 'phaser';
import { Frame, Music } from '../content/assetKeys';
import { CAMERA_ZOOM } from '../content/config';
import { getLevel, type LevelConfig } from '../content/levels';
import { getEnemy } from '../content/enemies';
import { bossDefeatedLine, bossEpilogue } from '../content/bert';
import { withDebugBoss } from '../content/debugBoss';
import { rewardsOf } from '../content/rewards';
import { newRewards } from '../logic/heroicSwitch';
import { getAccessory } from '../content/accessories';
import { getWeapon, weaponAtLevel, weaponFor } from '../content/weapons';
import { EnemyProjectiles, type EnemyProjectile } from '../entities/EnemyProjectile';
import type { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { createProjectilePool, type Projectile } from '../entities/Projectile';
import { levelUpCard } from '../content/cards';
import { CardPresenter } from '../systems/CardPresenter';
import { RewardPickup } from '../entities/RewardPickup';
import { rectCenter } from '../logic/geometry';
import { solidAt } from '../logic/solidity';
import { addCoins, applyLevelClear, heroicFirstClearReward, recordSurvival, weaponLevel, withProgress } from '../logic/save';
import { SURVIVAL_REQUIRED } from '../logic/survival';
import { withRevive } from '../logic/campPurchases';
import { feel } from '../systems/feel';
import { GameClock } from '../systems/GameClock';
import { HeroSystem } from '../systems/HeroSystem';
import { BurnSystem } from '../systems/BurnSystem';
import { JavelinSystem } from '../systems/JavelinSystem';
import { SludgeSystem } from '../systems/SludgeSystem';
import { HeroUnlocks } from '../systems/HeroUnlocks';
import { EnemyFactory } from '../systems/EnemyFactory';
import { GameEvents } from '../systems/GameEvents';
import { ChannelSystem } from '../systems/ChannelSystem';
import { HazardDirector } from '../systems/hazards/HazardDirector';
import { floatText } from '../systems/floatText';
import { InputController } from '../systems/InputController';
import type { LevelDirector } from '../systems/LevelDirector';
import { LootSystem, newRun, type RunState } from '../systems/LootSystem';
import { PotionSystem } from '../systems/PotionSystem';
import { registerBoltHits } from '../systems/BoltHits';
import { MeleeSystem } from '../systems/MeleeSystem';
import { musicOf, type MusicPlayer } from '../systems/MusicPlayer';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { RoomFlowSystem } from '../systems/RoomFlowSystem';
import { saveSystem } from '../systems/SaveSystem';
import { playSfx } from '../systems/sfx';
import { SkillAcquisition } from '../systems/SkillAcquisition';
import { SkillSystem } from '../systems/SkillSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { SpikeSystem } from '../systems/SpikeSystem';
import { SurvivalDirector } from '../systems/SurvivalDirector';
import { exposePerfOverlay } from '../systems/PerfOverlay';
import { exposeBossSpawner, exposeSpawner } from '../systems/debugSpawn';
import { blockedByRects, spawnAvoidRects } from '../logic/spawnAvoid';
import { buildLevelMap, type LevelMap } from './RoomBuilder';
import { installRunMap, removeRunMap } from './runMap';
import { TreasureSystem } from '../systems/TreasureSystem';
import { chooseRunMap, parseSeed, type RunMap } from '../logic/runSeed';
import { hasRandomMap } from '../logic/map';
import { FORCE_GRATE, FORCE_NAB } from '../debug';
import { getHero, heroKit } from '../content/heroes';
import { minesCard, sewerCard } from '../content/cards';
import { GrateSystem } from '../systems/GrateSystem';
import { isLevelPlayable } from '../logic/levelRules';
import { countsForPity } from '../logic/grate';
import { discoverMines, discoverSewer, MINES_NOTICE, queueMinesNotice, queueSewerNotice, recordGrateRun, recordNabRun, SEWER_NOTICE, type SecretId } from '../logic/secrets';
import { chooseNabPlan, nabMissCounts } from '../logic/nab';
import { NabSystem } from '../systems/NabSystem';
import { ScepterSystem } from '../systems/ScepterSystem';
import { SnatchSystem } from '../systems/SnatchSystem';

export interface GameSceneData {
  levelId: string;
  /** Set when retrying: the same map as the run being retried. */
  runMap?: RunMap;
  /** Heroic run: monsters match the hero's level, fixed at the start. */
  heroic?: boolean;
}

const devSeed = (): number | undefined => (import.meta.env.DEV ? parseSeed(new URLSearchParams(window.location.search).get('seed')) : undefined);

/** Where Climb down / Follow lead: the secret level on Normal with the same hero and loadout, or its Level Select card while it is a teaser. */
const SECRET_LEVEL: Record<SecretId, string> = { sewer: 'sewer', mines: 'mines' };
const BUTTON_START = 9;
const REWARD_FADE_MS = 600;
const BOSS_XP_BONUS = 100;
const REWARD_ARM_MS = 1200;

export class GameScene extends Phaser.Scene {
  private ending = false;
  private cards!: CardPresenter;
  private acquisition!: SkillAcquisition;
  private player!: Player;
  private level!: LevelConfig;
  private progression!: ProgressionSystem;
  private run: RunState = newRun();
  private startedAt = 0;
  private kills = 0;
  private clock!: GameClock;
  private enemies!: Phaser.Physics.Arcade.Group;
  private unlocks!: HeroUnlocks;
  private runMap: RunMap = { seed: 0, classic: true };
  private heroic = false;
  private survival = false;
  private director?: LevelDirector;
  private controls!: InputController;
  private nab?: NabSystem;

  constructor() {
    super('Game');
  }

  create(data: Partial<GameSceneData>): void {
    this.ending = false;
    this.kills = 0;
    this.level = withDebugBoss(getLevel(data.levelId ?? 'arena'));
    this.survival = this.level.survival === true;
    this.heroic = data.heroic === true && this.level.mapKey !== undefined;
    this.run = newRun();
    this.clock = new GameClock(this);
    feel.bind(this, this.clock);
    this.startedAt = 0;
    const save = saveSystem.data;
    const events = new GameEvents();
    const progression = (this.progression = new ProgressionSystem(events, save.progress));
    this.runMap = chooseRunMap({
      levelId: this.level.id,
      cleared: save.levels.cleared,
      hasRandomMap: hasRandomMap(this.level.id),
      devSeed: devSeed(),
      previous: data.runMap,
      rng: Math.random,
      sewerFound: save.secrets.sewerFound,
      runsWithoutGrate: save.secrets.desertRunsWithoutGrate,
      forceGrate: FORCE_GRATE,
    });
    const map = buildLevelMap(this, this.level, installRunMap(this, this.level, this.runMap));
    const { walls, playerStart } = map;
    const projectiles = createProjectilePool(this);
    const shots = new EnemyProjectiles(this);
    const weaponId = weaponFor(save.loadout.weapon, save.heroes.selected, save.weapons.owned);
    const weapon = weaponAtLevel(getWeapon(weaponId), weaponLevel(save, weaponId));
    const controls = (this.controls = new InputController(this));
    this.cards = new CardPresenter({ scene: this.scene, isEnding: () => this.ending, onClosed: () => controls.swallowUntilReleased() }, saveSystem);
    const player = new Player(
      this,
      playerStart.x,
      playerStart.y,
      controls,
      projectiles,
      progression,
      events,
      weapon,
      this.clock,
      getHero(save.heroes.selected),
    );
    this.player = player;
    const worn = save.accessories.worn.head;
    player.wearHead(worn ? getAccessory(worn)?.frame : undefined);
    player.reviver = () => this.useRevive();
    player.slowZones = map.slowZones;
    const enemies = (this.enemies = this.physics.add.group({ allowGravity: false }));
    const lookups = [walls, ...map.solid].map((layer) => (x: number, y: number) => layer.getTileAtWorldXY(x, y));
    const isSolid = (x: number, y: number): boolean => solidAt(walls, lookups, x, y);
    const avoid = map.world ? spawnAvoidRects(map.world) : [];
    const factory = new EnemyFactory(this, enemies, { target: player, events, shots, clock: this.clock, isBlocked: isSolid }, projectiles, avoid);
    if (map.channels.length > 0) {
      const sludge = (map.world?.hazards ?? []).filter((h) => h.kind === 'channel');
      let room = 0;
      events.on('room-started', (order: number) => (room = order));
      events.on('boss-started', () => (room = map.world?.bossArena?.order ?? room));
      factory.world.channels = () => sludge.filter((h) => h.room === room).map((h) => h.rect);
    }
    exposeSpawner(factory, player);
    exposeBossSpawner(factory, player);
    exposePerfOverlay(this, factory, projectiles, shots);
    const director = (this.director = this.createDirector(map, player, factory, events, blockedByRects(avoid, isSolid)));
    const skills = new SkillSystem({ scene: this, player, enemies, shots, clock: this.clock, isSolid, save: saveSystem, events });
    new HeroSystem({ scene: this, player, enemies, shots, clock: this.clock, isSolid }, events);
    const burn = new BurnSystem({ scene: this, player, enemies, shots, clock: this.clock, isSolid }, events);
    new PotionSystem(this, player, saveSystem, burn);
    if (player.weapon.javelin) new JavelinSystem({ scene: this, player, enemies, shots, clock: this.clock, isSolid }, burn);
    if (player.weapon.lob) new SludgeSystem({ scene: this, player, enemies, shots, clock: this.clock, isSolid });
    this.unlocks = new HeroUnlocks(this, player, events, saveSystem, player.hero.id, this.level.id, this.level.bossId, (ids) => this.announceHeroes(ids));
    this.acquisition = new SkillAcquisition(this, saveSystem, skills, this.cards);
    const loot = new LootSystem(this, player, events, this.run, saveSystem, this.clock, this.cards, this.acquisition);

    new MeleeSystem({ scene: this, player, enemies, shots, projectiles, isSolid });
    if (map.spikes.length > 0) new SpikeSystem(this, player, this.clock, map.spikes);
    if (map.channels.length > 0) new ChannelSystem(this, player, enemies, this.clock, map.channels);
    if (map.world && map.world.active.length > 0) new HazardDirector({ scene: this, player, enemies, clock: this.clock, isSolid, burn, bolts: projectiles }, map.world, events);

    this.addColliders(map, player, enemies, projectiles, shots);
    const scepter = player.weapon.scepter ? new ScepterSystem({ scene: this, player, enemies, shots, clock: this.clock, isSolid }) : undefined;
    registerBoltHits(this, projectiles, enemies, player, scepter && ((bolt, enemy) => scepter.onBolt(bolt, enemy)));
    if (player.effects.snatch) new SnatchSystem({ scene: this, player, enemies, shots, clock: this.clock, isSolid }, loot);
    this.physics.add.overlap(player, shots.group, (_, boltObj) => {
      const bolt = boltObj as EnemyProjectile;
      if (!bolt.active) return;
      player.takeDamage(bolt.damage, bolt.x, bolt.y, bolt.source);
      bolt.kill();
    });

    events.on('enemy-died', (level) => {
      this.kills++;
      progression.awardKill(level);
    });
    events.on('level-up', (level) => {
      this.celebrateLevelUp(player);
      this.persistProgress();
      this.offerLevelUpCard(level);
    });
    let pityPending = countsForPity({ retry: data.runMap !== undefined, hasPlan: this.runMap.side !== undefined, dev: FORCE_GRATE || devSeed() !== undefined });
    events.on('room-started', () => {
      if (!pityPending) return;
      pityPending = false;
      saveSystem.update((s) => recordGrateRun(s, (map.world?.grates.length ?? 0) > 0));
    });
    this.nab = this.setUpNab(map, events, factory, loot, isSolid, data.runMap !== undefined);
    events.on('player-died', () => this.endRun(director));
    events.on('pause-requested', () => this.pauseGame());
    this.input.keyboard?.on('keydown-ESC', () => this.pauseGame());
    this.input.gamepad?.on('down', (_pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button) => {
      if (button.index === BUTTON_START) this.pauseGame();
    });
    this.startMusic(events);
    this.setUpReward(map, player, events);
    if (map.world && map.world.treasures.length > 0) new TreasureSystem(this, player, loot, this.level, map.world.treasures);
    if (map.world && map.world.grates.length > 0) new GrateSystem(this, player, this.clock, map.world.grates, () => this.canPromptSecret(), () => this.openSecretPrompt('sewer'));

    this.physics.world.setBounds(0, 0, walls.width, walls.height);
    const camera = this.cameras.main;
    camera.setBounds(0, 0, walls.width, walls.height);
    camera.setZoom(CAMERA_ZOOM);
    camera.startFollow(player, true, 0.15, 0.15);
    camera.fadeIn(250);
    if (this.level.environment === 'mines') feel.cave();

    this.scene.launch('Hud', { events, progression, player, director, loot, skills, roomTotal: map.world?.rooms.length, heroic: this.heroic, survivalBestMs: this.survival ? save.survival.bestMs : undefined, bossName: this.level.bossId ? getEnemy(this.level.bossId).name : undefined, bossTagline: this.level.bossId ? getEnemy(this.level.bossId).tip : undefined, bossTicks: this.level.bossId ? getEnemy(this.level.bossId).barTicks : undefined });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      removeRunMap(this, this.level);
      director.stop();
      this.unlocks.finish(false, 0);
      musicOf(this.game).fadeOut();
      events.clear();
      this.scene.stop('Hud');
    });
    director.start();
  }

  resumeGame(): void {
    this.scene.stop('Pause');
    this.scene.resume();
    this.scene.resume('Hud');
    this.cards.flush();
  }

  closeCard(): void {
    this.cards.close();
  }

  /** The skill swap prompt's answer: replace `slot` with `skillId`, or null to keep it in the bag. */
  resolveSwap(skillId: string, slot: number | null): void {
    this.acquisition.resolveSwap(skillId, slot);
    this.cards.close();
  }

  private offerLevelUpCard(level: number): void {
    this.cards.request(`levelUp${level}`, levelUpCard(level));
  }

  quitToLevelSelect(): void {
    this.leaveRun('LevelSelect');
  }

  /** Ends the run without a result, exactly like Quit from the pause menu (gold banked, run recorded as a quit), then opens `next`. */
  private leaveRun(next: string, data?: object): void {
    this.unlocks.finish(false, 0);
    this.bankRun();
    if (this.director?.elapsedMs !== undefined) this.recordSurvivalRun(this.director);
    this.scene.stop('Pause');
    this.scene.stop('SecretPrompt');
    this.scene.start(next, data);
  }

  /** Nab the thief, when this run rolled him (eligible Desert/Palace random maps from Lv 11, or `?debug=nab`); also moves his pity counter. */
  private setUpNab(map: LevelMap, events: GameEvents, factory: EnemyFactory, loot: LootSystem, isSolid: (x: number, y: number) => boolean, retry: boolean): NabSystem | undefined {
    const rooms = map.world?.rooms ?? [];
    if (rooms.length === 0) return undefined;
    const { secrets } = saveSystem.data;
    const plan = chooseNabPlan({ levelId: this.level.id, classic: this.runMap.classic, heroLevel: this.progression.level, heroId: saveSystem.data.heroes.selected, minesFound: secrets.minesFound, runsWithoutNab: secrets.nabPity, rooms: FORCE_NAB ? 1 : rooms.length, rng: Math.random, force: FORCE_NAB });
    let pityPending = nabMissCounts({ plan, retry, dev: FORCE_NAB || devSeed() !== undefined });
    events.on('room-started', () => {
      if (!pityPending) return;
      pityPending = false;
      saveSystem.update((s) => recordNabRun(s, false));
    });
    if (plan?.room === undefined) return undefined;
    return new NabSystem({
      scene: this,
      player: this.player,
      clock: this.clock,
      events,
      factory,
      loot,
      room: plan.room,
      roomRect: (order) => rooms.find((r) => r.order === order)?.rect,
      isBlocked: isSolid,
      canPrompt: () => this.canPromptSecret(),
      onAppear: () => saveSystem.update((s) => recordNabRun(s, true)),
      onGate: () => this.openSecretPrompt('mines'),
    });
  }

  private canPromptSecret(): boolean {
    return !this.ending && !this.scene.isPaused() && !this.scene.isActive('Pause');
  }

  private openSecretPrompt(secret: SecretId): void {
    feel.thaw();
    this.scene.pause();
    this.scene.pause('Hud');
    this.scene.launch('SecretPrompt', { secret });
  }

  /** The secret prompt's answer. Either way the secret is discovered (its hero unlocks); going in then leaves the run like a quit. */
  resolveSecret(secret: SecretId, go: boolean): void {
    this.scene.stop('SecretPrompt');
    const sewer = secret === 'sewer';
    const first = sewer ? !saveSystem.data.secrets.sewerFound : !saveSystem.data.secrets.minesFound;
    saveSystem.update((save) => (sewer ? discoverSewer(save, heroKit) : discoverMines(save, heroKit)));
    if (go) {
      if (first) saveSystem.update(sewer ? queueSewerNotice : queueMinesNotice);
      const level = getLevel(SECRET_LEVEL[secret]);
      if (isLevelPlayable(level)) this.leaveRun('Game', { levelId: level.id, heroic: false });
      else this.leaveRun('LevelSelect', { focusLevelId: level.id });
      return;
    }
    if (!sewer) this.nab?.close();
    if (first) this.cards.request(sewer ? SEWER_NOTICE : MINES_NOTICE, sewer ? sewerCard : minesCard);
    this.controls.swallowUntilReleased();
    this.resumeGame();
    this.time.delayedCall(0, () => this.cards.flush());
  }

  /** Banks coins, grants the reward weapon, records the clear and shows the results screen. */
  completeLevel(): void {
    if (this.ending) return;
    this.ending = true;
    this.player.actionsLocked = true;
    this.cards.cancel();
    feel.lock();
    this.physics.pause();
    const timeMs = Math.round(this.clock.now - this.startedAt);
    const coins = this.run.coins;
    const heroic = this.heroic;
    const owned = saveSystem.data;
    const rewards = newRewards(rewardsOf(this.level), owned.weapons.owned, owned.skills.owned.map((s) => s.id));
    const crownWorn = owned.accessories.worn.head === undefined;
    const heroicReward = heroic ? heroicFirstClearReward(saveSystem.data, this.level.id) : undefined;
    saveSystem.update((save) =>
      applyLevelClear(withProgress(save, this.progression.progress), {
        heroic,
        levelId: this.level.id,
        rewardWeaponId: this.level.rewardWeaponId,
        equipReward: this.level.rewardEquips,
        rewardSkillIds: this.level.rewardSkillIds,
        runCoins: coins,
        timeMs,
      }),
    );
    this.unlocks.finish(true, timeMs);
    this.run.coins = 0;
    const camera = this.cameras.main;
    camera.fadeOut(REWARD_FADE_MS, 20, 18, 28);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('LevelComplete', {
        title: `${this.level.name} recovered!`,
        timeMs,
        kills: this.kills,
        coins,
        gems: this.run.gems,
        xp: this.progression.gainedXp,
        level: this.progression.level,
        rewards,
        seed: this.runMap.classic ? undefined : this.runMap.seed,
        heroic,
        heroicReward,
        crownWorn,
        epilogue: bossEpilogue(this.level.bossId, this.player.hero.id),
        levelName: this.level.name,
      }),
    );
  }

  private createDirector(map: LevelMap, player: Player, factory: EnemyFactory, events: GameEvents, isBlocked: (x: number, y: number) => boolean): LevelDirector {
    const { world, doors, walls } = map;
    if (this.survival) return new SurvivalDirector(this, player, factory, SURVIVAL_REQUIRED.map((id) => getLevel(id).enemyPool), this.progression.level, isBlocked);
    if (!world || !doors) return new SpawnSystem(this, player, factory, events, this.level, isBlocked);
    return new RoomFlowSystem({
      scene: this,
      player,
      factory,
      events,
      level: this.level,
      world,
      doors,
      isBlocked: blockedByRects(spawnAvoidRects(world), (x, y) => solidAt(walls, [(px, py) => walls.getTileAtWorldXY(px, py)], x, y)),
      heroicLevel: this.heroic ? this.progression.level : undefined,
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
    const solidBody = (object: unknown): boolean => (object as Enemy).phased !== true;
    this.physics.add.collider(enemies, enemies, undefined, (a, b) => solidBody(a) && solidBody(b));
    this.physics.add.collider(player, enemies, (_, enemy) => (enemy as Enemy).tryContact(player), (_, enemy) => solidBody(enemy));
  }

  private startMusic(events: GameEvents): MusicPlayer {
    const music = musicOf(this.game);
    if (!this.level.music) {
      music.fadeOut();
      return music;
    }
    music.crossfadeTo(this.level.music);
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
      const prize = rewardsOf(this.level)[0];
      const reward = new RewardPickup(this, x, y, prize?.frame ?? Frame.glowChest, prize?.tint ?? null);
      floatText(this, x, y - 28, bossDefeatedLine(this.level.bossId, getEnemy(this.level.bossId ?? '').name), '#ffe066', 16, 16, 1800);
      let armed = false;
      this.time.delayedCall(REWARD_ARM_MS, () => (armed = true));
      this.physics.add.overlap(player, reward, () => {
        if (!armed || !reward.active || this.ending) return;
        reward.destroy();
        playSfx(this, 'charm');
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

  /** Player.reviver: spends the Revive Token if one is held. */
  private useRevive(): boolean {
    if (!saveSystem.data.revive) return false;
    saveSystem.update((save) => withRevive(save, false));
    return true;
  }

  private persistProgress(): void {
    saveSystem.update((save) => withProgress(save, this.progression.progress));
  }

  private bankRun(): void {
    saveSystem.update((save) => addCoins(withProgress(save, this.progression.progress), this.run.coins));
    this.run.coins = 0;
  }

  /** Mid-run unlock (gold or kills): a banner now; the full reveal card waits for the next menu screen. */
  private announceHeroes(ids: string[]): void {
    if (this.ending) return;
    for (const id of ids) floatText(this, this.player.x, this.player.y - 30, `New hero: ${getHero(id).name}!`, '#ffe066', 16, 24, 2500);
    playSfx(this, 'levelUp');
  }

  private celebrateLevelUp(player: Player): void {
    floatText(this, player.x, player.y - 16, 'LEVEL UP!', '#7dffb0', 16, 24, 1500);
    playSfx(this, 'levelUp');
  }

  private endRun(director: LevelDirector): void {
    if (this.ending) return;
    this.ending = true;
    this.player.actionsLocked = true;
    this.cards.cancel();
    feel.lock();
    director.stop();
    this.unlocks.finish(false, 0);
    const lostCoins = this.run.coins;
    this.run.coins = 0;
    this.persistProgress();
    const survival = this.recordSurvivalRun(director);
    const camera = this.cameras.main;
    this.physics.pause();
    camera.fadeOut(900, 20, 18, 28);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
      this.scene.start('GameOver', {
        levelId: this.level.id,
        runMap: this.runMap,
        heroic: this.heroic,
        level: this.progression.level,
        progress: director.progressLabel(),
        lostCoins,
        survival: survival && { ...survival, kills: this.kills },
      }),
    );
  }

  /** Survival only: saves the time survived if it beats the best. */
  private recordSurvivalRun(director: LevelDirector): { timeMs: number; bestMs: number; newBest: boolean } | undefined {
    if (!this.survival || director.elapsedMs === undefined) return undefined;
    const result = recordSurvival(saveSystem.data, director.elapsedMs, director.wave);
    if (result.newBest) saveSystem.update(() => result.save);
    return { timeMs: Math.floor(director.elapsedMs), bestMs: result.save.survival.bestMs, newBest: result.newBest };
  }
}
