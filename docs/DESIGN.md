# Samuel's Game — Design & Architecture

Top-down twin-stick action game in the spirit of *Relic Hunters*. Goal: defeat the ultimate boss.
Runs in browser (desktop + tablet). Phaser 3 + TypeScript + Vite.

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
| 2 | Lost Desert | Desert | 5–9 | Wand power: Fireball |
| 3 | Killer Palace | Palace | 10–15 | Golden Sword |
| 4+ | (future) | … | … | … → Ultimate Boss |

Each level config (`src/content/levels/*.ts`): id, name, tilemap key, music, enemy pool + spawn
weights, monster level range, boss id, reward id, unlock requirement (previous level cleared).

## 3. Player

- Stats: HP, move speed, level, XP, dash (cooldown), inventory.
- Weapons: slot-based. Start with fists/stick → Broken Wand → Wand+Fireball (alt fire) → Golden Sword (melee).
- Weapon damage = `base × (1 + 0.12 × (playerLevel − 1))` × item modifiers.

## 4. Progression maths (pure functions, unit tested)

- XP to next level: `round(20 × level^1.5)`.
- Monster XP reward: `5 × monsterLevel`, reduced when monster far below player level (anti-grind on easy stuff).
- Level-gap modifier (`gap = monsterLevel − playerLevel`):
  - damage dealt by player × `clamp(1 − 0.1 × gap, 0.3, 1.2)`
  - damage taken × `clamp(1 + 0.15 × gap, 0.7, 2.5)`
- Drops: each enemy def references a loot table (`content/lootTables.ts`): `rolls` independent rolls, each picks
  one entry (or nothing) by weight (per-mille). `rollDrops(table, rng, luck)` in `logic/loot.ts`; luck inflates rare/epic weights.
  Rarity: common (coins), rare (potions), epic (charms). Rates per roll: slime ~62% coins, 11% potion, 2% charm;
  bat 60% coin, 10% potion, 2% charm; cyclops 60% coins/piles, 20% potion (7% large), 5% charm.
- Items (`content/items.ts`): coin (1), coin pile (5), health potion small/large (+25/+60 HP, at full HP converts to 2 coins),
  Charm of Power (+5% weapon dmg), Swiftness (+4% move speed), Vitality (+10 max HP); charms stack permanently.
  `computePlayerStats(level, charms)` gives maxHp, moveSpeed, damageMultiplier (weapon damage modifier).
- Pickups pop out of dead enemies, magnet to the player within 40px, auto-collect on overlap, blink then despawn after 20s.

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
| Alt fire (Fireball) | RMB | Button | LT |
| Dash | Space | Button | A |
| Pause | Esc | Button (top right) | Start |

Touch (`TouchSource`): floating twin sticks. A touch starting in the left half spawns the move stick, the right half the
aim stick (radius ~50 game px at 640x360, scaled with screen). Dash and Alt fire buttons sit on the right edge above the
aim zone; touches starting on them (or the fullscreen button) never spawn a stick. Controls show only after a touch and
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
  (`tools/mapThemes.ts`: tile palette, cover, encounters) and `LayoutPreset`s (`logic/layoutPresets.ts`; pure layout in
  `logic/dungeonLayout.ts`). Ruins: serpentine 4x2 grid, start room, 5 combat rooms, boss arena; desert: 5x2 grid, 6 larger rooms; straight 3-wide corridors with a door at each end). Layers: `ground`, `walls`
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
- Stone Guardian (`entities/Boss.ts`, brain in `logic/bossBrain.ts`): Lv5, base HP 380 (760 effective), scale 2.5, no knockback.
  Phase 1: chase, slam (0.8s red telegraph, r=60, every 3.5s), 8-bolt burst every 4s. Phase 2 (<=50%): x1.5 speed, slam every 2.4s,
  12-bolt burst every 3.5s, 2 bats every 8s. A Lv4 player with the staff needs ~70s at 50% uptime. Drops 4 loot rolls plus the reward;
  +100 XP bonus.
- Reward pickup -> `completeLevel()` (banks coins, grants+equips Broken Wand, marks cleared) -> `LevelCompleteScene` -> level select.
- Music: ruins loop (vol 0.4) crossfades to boss track when the arena locks; stops on leave. M toggles mute (saved in `settings.muted`).

## 10. Level 2 flow (M5)

- Desert uses the same RoomFlow as the ruins: 6 rooms, monster levels 5 to 9 (1/2/2/2/3/3 waves), then the Sand Wyrm. Music `desert.mp3`
  (Arpeggio), boss reuses `boss.mp3`; `LevelConfig.music` / `bossMusic` drive `MusicPlayer`, `PreloadScene` loads whatever the levels declare.
- Enemies (`content/enemies.ts`): scorpion (behaviour `charger`, `logic/charge.ts`: windup 0.6s with red lane, dash, recover), bandit (`ranged`
  with `spread` 3 bolts / 0.5 rad), mummy (80 base HP, speed 24), vulture (tinted erratic bat). Loot tables pay more coins (piles, 10-coin gold piles) and
  >=15% potions.
- Bosses are data-driven: `logic/bossBrain.ts` takes a `BossBrainConfig` (`content/bosses.ts`), an attack list per phase of slam, burrow,
  burst, spit and summon. Sequenced attacks (slam, burrow) own the boss; timed ones pause while it is hidden. Sand Wyrm: base HP 860 (2795 at Lv10),
  a Lv8-9 player with the broken wand needs ~78-93s at 50% uptime.
- Fireball (`logic/fireball.ts`, `systems/FireballSystem.ts`): cooldown 2.5s, radius 40, damage 3x a bolt, falloff to 0.4 at the edge. Needs `castsPowers`
  (broken wand). Status is published in the registry for the HUD bar (bottom-left) and the touch button (hidden when locked, greyed with a pie when cooling).
- Quicksand: `hazard` objects become slow zones (50% speed, `logic/hazards.ts`) drawn as dark sand pits.
- Save v3 adds `powers.unlocked`; `LevelCompleteScene` shows a reward line ("Fireball unlocked!" / "Broken Wand acquired!") from `content/rewards.ts`.
