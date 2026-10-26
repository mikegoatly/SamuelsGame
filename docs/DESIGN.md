# Samuel's Game — Design & Architecture

Top-down twin-stick action game in the spirit of *Relic Hunters*. Goal: defeat the ultimate boss.
Runs in browser (desktop + tablet). Phaser 3 + TypeScript + Vite.

## Monsters, elites and room curves (v2 Phase 4)

- Behaviours live one per file in `src/entities/behaviours/*.ts`; `Enemy` only dispatches (`def.custom` picks the module) and keeps health, hits, knockback and loot. Pure rules are in `src/logic` (`fuse`, `orbitDive`, `archer`+`cover`, `pack`, `graveyard`, `shark`, `trail`, `turret`, `whirl`, `support`, `reflect`, `bomb`, `clear`, `beam`).
- Packs: an `EnemyDef.pack` is spawned by `EnemyFactory.spawnGroup` (rats scatter, twins are linked, hounds follow the master). Room clear counts every living monster (`ClearWatch`): split halves, raised dead and pack members all count; dormant gargoyles and fleeing hounds do not, and when only dormant statues remain they are woken.
- Elites (`logic/elites`, `entities/behaviours/mods.ts`): one affix, never on bosses or packs; the ward bar (`logic/ward`) is shared with the Mummy Priest's shield.
- Curves (`LevelConfig.curve`, `logic/waveMix`): waves per room, wave size = slots from `size` (a tank or swarm costs 2), the room's `intro` monster is in every wave of its room and later monsters wait for their room. Tanks spawn near the player, shooters far (`pickRoleSpawn`). Phase 5 tuned the slots (about 65 to 80 monsters per clear, see Balance) and fixed the order of new monsters by difficulty rather than the proposal table (palace: Jester, Twin Mages, Houndmaster, Mirror Knight, Gargoyle; desert: Fire Imp, Mummy Priest, Cactus Turret, Sand Shark, Dust Devil). The arena keeps endless waves with the same planner.
- Extra sprites: `tools/add_monster_frames.py` writes `public/assets/extra/monsters-extra.png` (`Tex.monsters`, `MonsterFrame`). Dev builds expose `window.__spawn(id, level, dx, dy, affix)`.

## 1. Core loop

1. Enter level → fight monster waves/rooms → collect drops → gain XP → level up → weapons scale.
2. Reach level end → boss → reward (relic/power).
3. Return to hub (level select). Replay earlier levels to grind XP/items.

**Pacing rule:** each level has a *recommended player level*. Monsters have fixed levels per stage.
Rushing ahead means under-levelled player → damage dealt reduced, damage taken increased (see §4).

## 2. Levels (data-driven, add more by adding a config file)

| # | Name | Environment | Monster lvl | Reward |
|---|------|-------------|-------------|--------|
| 1 | Broken Wand | Ruins | 1–4 | Broken Wand (basic magic bolt) |
| 2 | Lost Desert | Desert | 5–9 | Skill: Fireball |
| 3 | Killer Palace | Palace | 10–12 | Golden Sword (melee) |
| 4+ | (future) | … | … | … → Ultimate Boss |

Each level config (`src/content/levels/*.ts`): id, name, tilemap key, music, enemy pool + spawn
weights, monster level range, boss id, reward id, unlock requirement (previous level cleared).

## 3. Player

- Stats: HP, move speed, level, XP, dash (cooldown), inventory.
- Weapons (`content/weapons.ts`, `kind: 'ranged' | 'melee'`): Apprentice Staff -> Broken Wand -> Golden Sword; the basic weapon is chosen on the loadout screen, skills work with any of them.
  Golden Sword: base 22 (2.2x a wand bolt), swing every 350ms, ~100 degree cone, reach 28px to the target's body edge, each enemy hit once per
  swing (`logic/melee.ts`, angle-wrap safe), knockback 2.4x, and it swats enemy bolts inside the cone (`systems/MeleeSystem`). DPS ~1.57x the wand but only at close range.
  Owned weapons cycle with Q / mouse wheel / gamepad Y, LB, RB / touch swap button (`logic/weaponCycle.ts`, `systems/WeaponSwitcher`); the equipped weapon is saved and shown in the HUD.
- Weapon damage = `base × (1 + 0.12 × (playerLevel − 1))` × item modifiers.

## 4. Progression maths (pure functions, unit tested)

- XP to next level: `round(25 × level^1.5)`.
- Monster XP reward: `5 × monsterLevel × (1 + 0.06 × (monsterLevel − 1))`, reduced when monster far below player level (anti-grind on easy stuff).
- Level-gap modifier (`gap = monsterLevel − playerLevel`):
  - damage dealt by player × `clamp(1 − 0.1 × gap, 0.3, 1.2)`
  - damage taken × `clamp(1 + 0.15 × gap, 0.7, 2.5)`
- Drops: each enemy def references a loot table (`content/lootTables.ts`): `rolls` independent rolls, each picks
  one entry (or nothing) by weight (per-mille). `rollDrops(table, rng, luck)` in `logic/loot.ts`; luck inflates rare/epic weights.
  Rarity: common (coins), rare (potions), epic (charms). Rates per roll: slime ~62% coins, 11% potion, 5.6% gem;
  bat 60% coin, 10% potion, 5.6% gem; cyclops 60% coins/piles, 20% potion (7% large), 9.8% gem (gem weights are x1.4, see Balance).
- Items (`content/items.ts`): coin (2), coin pile (12), gold pile (24), health potion small/large (+25/+60 HP, at full HP converts to 2 coins),
  Gems (red Power, green Swiftness, blue Vitality) are spendable upgrade material (v2 phase 2), no passive bonus.
  `computePlayerStats(level)` gives maxHp, moveSpeed, damageMultiplier; weapon upgrade levels scale damage and fire rate (`weaponAtLevel`).
- Pickups pop out of dead enemies; coins, gems and scrolls magnet to the player within 40px, health potions do not (walk onto them); all auto-collect on overlap, blink then despawn after 20s.

### Save & run state
`logic/save.ts` (pure): `{version, progress{level,xp}, coins, charms, weapons{owned,equipped}, levels{cleared,bestTimes}}`;
`parseSave` never throws and repairs junk field by field. `SaveSystem` wraps `localStorage` (failures swallowed, in-memory fallback).
Saved on level-up, charm pickup, level clear, quit to menu and death (progress only). Level/XP persist across deaths; coins
collected during the run are discarded on death and banked on quit/clear.

### Menus
MainMenu -> LevelSelect (2x2 cards, Back) -> Game {levelId}; GameOver (Retry / Level select); Pause overlay (Resume / Quit).
`ui/MenuList` provides focus navigation for all menus: pointer tap, keyboard (arrows/WASD, Enter/Space, Esc), gamepad
(D-pad/left stick, A, B/Start = back). `ui/MenuScene` rebuilds a menu on resize.

## 5. Controls

| Action | Keyboard/mouse | Touch (tablet) | Gamepad |
|---|---|---|---|
| Move | WASD | Left virtual stick | Left stick / D-pad |
| Aim + fire | Mouse + LMB | Right virtual stick (fires past ~50% deflection) | Right stick (auto-fires past ~50%) or RT |
| Skill 1 | RMB or 1 | Button 1 | LT |
| Skill 2 | E or 2 | Button 2 | RB |
| Skill 3 | R or 3 | Button 3 | LB |
| Dash | Space | Button | A |
| Pause | Esc | Button (top right) | Start |

Touch (`TouchSource`): floating twin sticks. A touch starting in the left half spawns the move stick, the right half the
aim stick (radius ~50 game px at 640x360, scaled with screen). Dash and the three skill buttons fan out on the right edge (skill icon + cooldown pie); touches starting on them (or the fullscreen button) never spawn a stick. Controls show only after a touch and
hide on mouse/keyboard/gamepad use. Layout maths is pure (`logic/virtualStick.ts`); `HudScene` renders the `TouchState`
read from the scene registry. Scaling is `Phaser.Scale.EXPAND` from a 640x360 base (no letterbox; HUD anchors to edges
and re-lays out on resize); portrait touch devices get a CSS "Rotate your device" overlay.

Input abstraction (`InputController`) emits `moveVector`, `aimVector`, `fire`, `altFire`, `dash` so game
code never reads devices directly.

## 6. Art & audio (Kenney CC0, copied into `public/assets` by script)

Recommended: **Tiny Dungeon** 16px style, scaled ×3 with pixel-art rendering — has wizard/knight heroes,
monsters, swords/staffs, ruin tiles. Supplement:
- Desert: `Tiny Dungeon` has sand tiles (frames 48–53) — use those.
- Golden Sword: `Tiny Dungeon` sword frames 103–107, tinted gold.
- Palace: `Roguelike Interior Pack` / `Roguelike City Pack` (16px).
- Projectiles/VFX: `Particle Pack`, `Explosion Pack`, `Smoke Particles` (tint for fireball).
- UI: `UI Pack - Pixel Adventure`, `Fantasy UI Borders`, `Onscreen Controls` (virtual sticks), `Other/Fonts` (Kenney Pixel).
- SFX: `Impact Sounds`, `RPG Audio`, `Interface Sounds`.
- Music: `C:\Users\mikeg\OneDrive\Royalty Free Background Music Pack` (39 MP3, flat, no licence file —
  confirm licence before publishing). Candidates by title only, need listening:

  | Use | Candidates |
  |---|---|
  | Menu/hub | Relaxing Melody, Idle |
  | Ruins | Complicated Melody, Layered Synth |
  | Desert | Hard, Arpeggio (low confidence) |
  | Palace | Montage, Soft Piano and Cello |
  | Boss | Fight, Hard Rock |
  | Victory | Sailor Theme, Catchy Piano (check length) |

  Kenney `Music Loops` / `Music Jingles` as fallback.

Alternative: `Topdown Shooter` (64px, modern guns/zombies) — cohesive but off-theme.

## 7. Architecture

```
src/
  main.ts                 Phaser game config (scale EXPAND, pixelArt, Arcade physics)
  scenes/                 Boot, Preload, Menu, LevelSelect, Game, Hud (parallel), Pause, LevelComplete, GameOver
  entities/               Player, Enemy (base) + behaviours (chaser, shooter, charger), Boss, Projectile, Pickup
  systems/                InputController, CombatSystem, SpawnSystem, LootSystem, ProgressionSystem, SaveSystem
  logic/                  Pure TS: xp.ts, damage.ts, loot.ts (no Phaser imports → unit tested with Vitest)
  content/                levels/, enemies.ts, weapons.ts, items.ts, bosses.ts (data only)
public/assets/            copied Kenney assets + Tiled maps (.tmj)
tools/copy-assets.ts      copies chosen files from Kenney collection
tests/                    Vitest specs for logic/
```

- Maps: Tiled JSON (`.tmj`). Ruins and desert are generated by `tools/generate-maps.ts` from per-level `MapTheme`s
  (`logic/map/mapThemes.ts`: tile palette, cover, encounters) and `LayoutPreset`s (`logic/layoutPresets.ts`; pure layout in
  `logic/dungeonLayout.ts`). Ruins: serpentine 4x2 grid, start room, 5 combat rooms, boss arena; desert: 5x2 grid, 6 larger rooms; straight 3-wide corridors with a door at each end).
  Random maps (`logic/map/index.ts`: `hasRandomMap(levelId)`, `buildRandomMap(levelId, seed)`) reuse the same themes and
  presets (room count, order, sizes, cover budget, encounters, hazards) on a bigger grid (`MapTheme.random`): a seeded
  self-avoiding route (`logic/layout/route.ts`) ends in a boss pair of cells entered along the row; combat rooms roll a
  shape (`logic/layout/shapes.ts`: plain, L-corner, pillared hall, split bars; palace is symmetric only) kept clear of the
  corridor cross; interior walls live in `DungeonLayout.blocks` (floorMask treats them as wall); ~60% of seeds add one
  dead-end side room (`layout.sideRoom`, kind `side`, last corridor, its two doors carry the parent combat room's index)
  exported as a `treasure` point object (`parseLevelObjects(...).treasures`). Classic `.tmj` regeneration is untouched. Random maps may place up to 15% fewer hazards in shaped rooms, and `balanceModel` bands are measured on classic maps. Runtime: random maps only play once a level has been cleared (the first-ever run uses the classic `.tmj`); Retry reuses the run's map; dev `?seed=N` forces a random map; the results screen shows "Map #N" for random runs. Side rooms hold a non-solid chest; touching it drops about one room-3 fight's gold plus a potion (`treasureDrops` in `logic/treasure.ts`). Layers: `ground`, `walls`
  (collision), object layer `objects` (`playerStart`, `room` {order, encounter, waves, minLevel, maxLevel}, `door` {room},
  `bossArena` {order}, `exit`, `hazard` {kind: quicksand}). `logic/tiledObjects.ts` parses it; `scenes/TiledMapBuilder.ts` builds layers plus a runtime
  `doors` layer (door tiles solid while closed).
- Save: `localStorage` — player level, XP, inventory, cleared levels, unlocked powers.
- Tests: Vitest for `logic/`; shared builders in `tests/builders.ts`.

## 8. Milestones

1. **Skeleton** — Vite+Phaser+TS project, asset copy script, Boot/Preload/Game scene, player moves & shoots (keyboard+mouse), placeholder room.
2. **Combat core** — enemies (chaser), damage, HP, death, XP + level up, HUD bars, unit tests for logic.
3. **Touch controls** — virtual twin sticks + buttons, responsive scaling.
4. **Level 1 Ruins** — Tiled map, spawns, loot drops, boss, Broken Wand reward, level select + save.
5. **Level 2 Desert** — Fireball alt-fire, new enemy types, level-gap scaling tuned.
6. **Level 3 Palace** — Golden Sword melee, palace boss.
7. **Polish** — audio, particles, screen shake, menus, balancing.

## 9. Level 1 flow (M4b)

- `LevelDirector` (SpawnSystem for arena waves, RoomFlowSystem for ruins). RoomFlow: enter room rect (inset 16px) -> doors of that
  room close (shake + sfx) -> waves spawn in the room from the level pool at the room's level range (`roomWaves`) -> doors open
  when all dead; cleared rooms never retrigger. After all 5 rooms, entering the arena locks its doors and spawns the boss.
- Enemy bolts: pooled `EnemyProjectile`, damage via `damageToPlayer`, die on walls/doors. Ghost: kites at 85-115px, shoots every ~1.8s (speed 70).
- Stone Guardian (`entities/Boss.ts`, brain in `logic/bossBrain.ts`): Lv5, base HP 455 (910 effective), scale 2.5, no knockback.
  Phase 1: chase, slam (0.8s red telegraph, r=60, every 3s), 8-bolt burst every 3.4s. Phase 2 (<=50%): x1.5 speed, slam every 2s,
  12-bolt burst every 3s, 2 bats every 8s. A Lv4 player with the staff needs ~85-100s at 50% uptime. Drops 4 loot rolls plus the reward;
  +100 XP bonus.
- Reward pickup -> `completeLevel()` (banks coins, grants+equips Broken Wand, marks cleared) -> `LevelCompleteScene` -> level select.
- Music: ruins loop (vol 0.4) crossfades to boss track when the arena locks; stops on leave. M toggles mute (saved in `settings.muted`).

## 10. Level 2 flow (M5)

- Desert uses the same RoomFlow as the ruins: 6 rooms, monster levels 5 to 9 (1/2/2/2/3/3 waves), then the Sand Rat. Music `desert.mp3`
  (Arpeggio), boss reuses `boss.mp3`; `LevelConfig.music` / `bossMusic` drive `MusicPlayer`, `PreloadScene` loads whatever the levels declare.
- Enemies (`content/enemies.ts`): scorpion (behaviour `charger`, `logic/charge.ts`: windup 0.6s with red lane, dash, recover), bandit (`ranged`
  with `spread` 3 bolts / 0.5 rad), mummy (80 base HP, speed 24), vulture (tinted erratic bat). Loot tables pay more coins (piles, 10-coin gold piles) and
  >=15% potions.
- Bosses are data-driven: `logic/bossBrain.ts` takes a `BossBrainConfig` (`content/bosses.ts`), an attack list per phase of slam, burrow,
  burst, spit and summon. Sequenced attacks (slam, burrow) own the boss; timed ones pause while it is hidden. Sand Rat: base HP 1030 (3348 at Lv10),
  a Lv8-9 player with the broken wand needs ~94-112s at 50% uptime. Burrow every 6.2s/4.4s, spit every 2.8s/2.2s.
- Fireball (`logic/fireball.ts`, `systems/skills/FireballCaster.ts`): level 1 cooldown 2.5s, radius 40, 30 base damage (independent of the weapon), falloff to 0.4 at the edge. See section 14.
- Quicksand: `hazard` objects become slow zones (50% speed, `logic/hazards.ts`) drawn as dark sand pits.
- Level rewards are `rewardWeaponId` plus `rewardSkillIds`; `LevelCompleteScene` lists each ("Fireball learned!" / "Broken Wand acquired!") from `content/rewards.ts`.

## 11. Level 3 flow (M6)

- Palace: `PALACE_THEME` + `PALACE_PRESET` (5x2 grid mirrored from the desert: start on the right, six odd-sized symmetric combat rooms, throne room spanning two cells).
  `LayoutPreset.symmetric` centres rooms on their corridor lines, mirrors cover into four quadrants and lines the throne room with a mirrored colonnade;
  `placeSpikeTraps` adds mirrored pairs of timed spike traps and `throneTiles` the boss teleport points (`throne` objects). Ground is a tinted checkerboard
  (per-tile tint, `EnvironmentTint.checker`), walls grey brick with banners, statues as cover. Monster levels 10-12 per room (`monsterLevelRange` 10-12, two waves each). Music `palace.mp3` (Montage), boss `boss-palace.mp3` (Hard Rock).
- Spike traps (`logic/spikes.ts`, `systems/SpikeSystem`): 3.2s cycle on the pause-safe GameClock, down -> 0.7s red-blinking warning -> up 0.9s; only up spikes hurt (10% max HP through `HAZARD_HITS.spikes`, at most every 650ms, i-frames and dash respected).
- Enemies: palaceGuard (shield: frontal hits take 55% less, shield turns at 1.3 rad/s so flanking works; `logic/shield.ts`), royalArcher (`leadAim` predictive shots),
  darkMage (`logic/blink.ts`: blinks 85px when the player is within 62px, then fires a slow homing orb; `logic/angle.ts steerToward`), assassin (charger, alpha 0.14 while stalking via `cloakAlpha`, revealed on windup/hit).
  Palace loot pays 3.5-4 coins/kill, 11-17% large potions, 8-11% gems.
- Mad King (Lv15, base HP 1800 = 8100, scale 3): phase 1 (x1.1 speed) 3-lunge combos (0.65s red lane, then 0.5s re-aimed follow-ups, 400ms dashes), 16-bolt ring every 3.6s, double counter-rotating 14-bolt spirals, 2 guards every 24s;
  phase 2 (<=50%, x1.3 speed) swaps spirals for a 6-orb seeking ring every 2.8s (`seek` attack: `logic/homing.ts`, 1.3 rad/s for 3.2s at 0.8x bolt speed, so they can be outrun; walls and sword swings destroy them), 2-lunge combos, a 12-bolt ring and teleport between three thrones
  (vanish 0.8s, warning ring at the destination, shockwave on arrival; destinations clamped to the arena and unblocked). The brain keeps the running sequence in `BossState.current`,
  so a phase change mid-lunge/hide always finishes it; hidden time pushes every other timer back. A Lv13-14 player with wand + fireballs needs ~120-170s at 50% uptime. A player who never moves dies in ~13s (phase 1) / ~9s (phase 2) with i-frames respected (`tests/bossSim.ts`).
- Clearing it grants and equips the Golden Sword ("Golden Sword acquired!"). `ultimate` (comingSoon, no map) shows as a locked "??? / The Ultimate Boss awaits / Coming soon" card once the palace is cleared (`visibleLevels`); a level 4 is a new config + theme + preset.

## 12. Chase navigation

- `logic/pathfinding.ts`: A* over the 16px tile grid (8-way, no corner cutting) where a tile is passable only if the body fits (`bodyClear` at its centre, so big bodies see inflated walls), then string-pulling smoothing with `corridorClear` (centre + both edge lines). Returns the nearest reachable point when the goal is walled off.
- `logic/navigator.ts`: per-enemy `Navigator.aim()`: straight at the player when a body-wide corridor is clear, else follows the path, recomputed every ~0.35-0.5s; stuck detection (under 30% of the expected travel in 1s) makes it slide sideways along the obstacle for 0.7s and repath.
  `Enemy.chase` uses it for every chaser/boss/stalker (not while a boss is burrowed); window and node count are bounded, so the cost stays small.

## 14. Skills and loadout (v2 phase 1)

- `content/skills.ts`: `SkillDef {id, name, description, icon, color, kind, cooldownMs[5], params[5], maxLevel 5}`; stats are always read through `skillCooldown` / `skillParams(skill, level)`, so phase 2 only adds upgrade UI and economy. Owned skills carry a level (1 for now).
- `SkillSystem` (`systems/SkillSystem.ts`): three slots from `save.loadout`, `SkillCooldowns` on the `GameClock`, casting from `Player.skillHandler` (slot, origin, aim), slot statuses published in the registry (`skillState`) for `ui/SkillBar` and `TouchControlsView`. A caster returning false (no target, blocked blink) spends no cooldown.
- Casters (`systems/skills/`): Fireball, Frost Nova (`logic/frostNova.ts`, enemy `applySlow` honoured by chase, kite, dash and the navigator), Chain Lightning (`logic/chainLightning.ts`, cone then jumps with line of sight, zig-zag bolt), Arcane Shield (`logic/arcaneShield.ts`, `Player.damageAbsorber`, bolts inside the bubble are destroyed), Blink Strike (`logic/blinkStrike.ts`, `Player.blinkTo`, `PlayerTimers.grantInvulnerability`).
- Input: LMB/RT/aim stick basic; RMB or 1, E or 2, R or 3 / LT, RB, LB / touch buttons for the slots; keyboard taps use `KeyLatch`, touch buttons latch taps too. Weapon cycling was removed.
- HUD: bottom-centre skill bar with a cooldown sweep and the Input Prompts glyph (`content/inputGlyphs.ts`) of the device used last (`systems/inputDevice.ts`).
- `LoadoutScene` (Level select -> Loadout -> Game) and `SkillSwapScene` (modal through `CardPresenter`, default focus is Keep in bag) use `MenuList`, so mouse, touch, keyboard and gamepad all work.
- Save v6 (`skills.owned`, `loadout`), migration in `parseSave` (powers, equipped weapon, rewards of cleared levels via `LegacySkillRewards`). Scrolls: `logic/skillScroll.ts`, chance per loot table (`scrollChance`, bosses 3%, default 0.5%).

## Hazards (v2 phase 4)

- Data: `MapTheme.hazards` (`HazardPlan`: per kind, a count per combat room; rubble/wind/sandstorm use the number as intensity) and `bossHazard`. `logic/hazard/placement.ts` places them from a separate random stream (`seed ^ 0x5bd1e995`) so rooms, cover, quicksand and spikes never move. Footprints stay inside the room, off the 3-wide corridor lanes plus a tile of margin (pendulums only the lane itself), off cover and each other, and never seal a pocket (tested by flood fill with all footprints as walls). Objects are `hazard` objects with `kind`, `room`, `offset` and integer params; `parseLevelObjects` returns them as `active`.
- Pure timing/geometry in `logic/hazard/`: `cycle` (phaseAt), `crack`, `rubble`, `vents` (gas, flame), `wind`, `sandstorm`, `pendulum`, `arrows`, `victims` (cooldowns, damage fractions), `plan`, `placement`.
- Runtime: `systems/hazards/HazardDirector` builds one class per object (all draw with Graphics plus small particle emitters, no new art), wakes a room's hazards on `room-started` (boss arena on `boss-started`), calms them on `room-cleared`/`boss-died` (fire pits stay lit), and halts all on player death, `feel.isLocked` or shutdown. Timing runs on the GameClock. Player damage is `takeDamage(..., 'hazard')` as a fraction of max HP; enemies take `takeHit`/`takeDot` as a fraction of max HP, bosses excluded. Wind uses `Player.windPush` and `Enemy.nudge`; pits eject with `Player.blinkTo`. Fog respects the reduce-flash setting (`feel.reduced` caps it). Sfx reuse existing audio files under new ids.

## Heroes (v2 phase 3)

- `content/heroes.ts`: `HeroDef` (frame, tint, stat multipliers for HP, speed, attack rate, damage, skill cooldown, passive, signature weapon, optional starting skill, hint). Ratings: low 0.85, mid 1.0, high 1.2. `computePlayerStats(level, mods, signature)` applies them; the signature weapon adds +10% damage. Damage rides in `stats.damageMultiplier`, so bolts, melee and skills pick it up unchanged.
- Passives are numbers in `logic/passives.ts` (`passiveEffects`): knight frontal reduction (`Player.takeDamage`), dwarf gold (`GoldBonus`, carries fractions) and potion multiplier, ranger crit and monk every-5th stun (`Strikes`, called from `Enemy.takeHit` for `source: 'basic'` hits only; skills pass `'skill'`), necromancer rise chance and rogue dash trap (`systems/HeroSystem`, reusing `SpiritWolfCaster` with an `AllyLook` and `ZoneField`), secret hero luck (`rollDrops` luck and scroll chance), wizard skill cooldown 0.9 via stats.
- Unlocks: `logic/unlocks.ts` (pure rules over a `RunRecord` and `AccountStats`), `logic/runLog.ts` (builds the record), `logic/heroSave.ts` (select, unlock + kit grant, bank stats, pending reveals). `systems/HeroUnlocks` feeds the log from `GameEvents` (`player-damaged` with a `DamageSource`: contact = melee, enemy bolts = ranged, spikes = hazard, boss attacks = boss; `skill-cast`, `potion-used`, `boss-started`, `boss-died`), checks account rules live (kills, gold) and judges the run on clear, quit or death.
- Unlock rules: knight = clear Ruins with zero skill attempts (fizzles count); rogue = Desert under 5:00; dwarf = 800 gold at once; ranger = clear Desert or Palace with at most 20 melee damage (boss contact and lunges count as melee); monk = clear with no potion that actually healed you (walking over one at full HP gives gold and does not count; a revive token is not a potion; floor potions no longer magnetise; dashing is allowed); necromancer = 600 total kills (allies' kills count); secret = three bosses by three heroes. Allies hit with `source: 'ally'`, which never triggers rising. Knight's frontal reduction ignores hazards. `GameScene` banks the run on SHUTDOWN if nothing else did; `parseSave` drops unknown hero ids.
- Save v8: `heroes {unlocked, selected}`, `stats {totalKills, goldPeak, bossKillsByHero}`; unlocking queues a `hero:<id>` notice shown by `scenes/heroReveal` on Level Select and the results screen. Flow: Level Select -> Hero Select -> Loadout -> Game.

## Economy (v2 phase 2)

Pure logic: `logic/upgrades.ts` (costs, weapon tables, stat diff lines), `shop.ts` (seeded stock, prices), `campPurchases.ts` (upgrade, buy skill/potion/revive on a save),
`potions.ts`, `weaponTwists.ts` (pierce counting, split angles), `gems.ts`. Content: `content/upgradeInfo.ts` (gem colour, tier and twist per skill/weapon id), `campOffers.ts`
(rows and panel text from a save), `upgradePreview.ts`. UI: `CampScene` with `CampRow`, `TabBar`, `Wallet`. In level: `PotionSystem`, `BoltHits` (player bolt damage, pierce, split),
sword wave through `MeleeSystem`. Boss tables use `gemBurst`.

## Balance (v2 phase 5)

- Model: `tests/balanceModel.ts` (reference player, per-room damage / seconds / XP / loot, run time) with `src/logic/lootValue.ts` (expected gold, gems, potions and healing of a loot table). Hit rates are calibrated so a standing player matches the aim-only Playwright bot (palace room 2 about 450 damage, desert room 4 about 470 before the pass); the reference dodges half. `tests/balanceModel.test.ts` pins the bands.
- Reference damage per room (% of max HP, hazards included): Ruins 6 12 16 21 35, Desert 16 22 28 36 51 47, Palace 22 28 34 35 49 60; a player starting each level on its recommended level ends the ruins at 6, the desert at 10, the palace at 13 (the Mad King is Lv15). A clear takes the reference player about 2 / 4 / 6 minutes.
- Mirror Knight: reflects one bolt per 1.5s (`REFLECT_COOLDOWN_MS`) for 50% of its contact damage; other bolts on its front hit the shield for the usual reduction.
- Hazards: `logic/hazard/hits.ts` holds every hit (fraction of max HP, gap between hits, duty); each hit is 3.5-12%, repeats no faster than the 600ms player i-frames, and standing in one for 10s never kills a full-health player. Flame jets hit once per jet (1s), pendulums every 1.2s at most.
- Economy: coins are 2 / 12 / 24 gold; gem drop weights are scaled by `GEM_DROP_SCALE` 1.4 (`scaleGemDrops`, paid for out of "nothing"). Floor potions do not magnetise (`magnetises` in `logic/pickups`).
- Hazard cooldowns (`Cooldowns.tryTake`) are only spent when the hit lands, so i-frames from another source never eat the next hazard hit. Every hazard drains at most 6% of max HP per second from someone who stays (pendulum 8% every 1.4s).
- Existing saves keep their player level; only the XP needed for the next one changed (`25 x L^1.5`), so a long-time player is simply a little behind its bar.
- Palace curve: two waves in rooms 1-4, three in rooms 5-6, slots 3 + 0.8 per wave.
