# Samuel's Game

Top-down twin-stick action game (Phaser 3 + TypeScript + Vite). See `docs/DESIGN.md`.

## Monsters (v2 Phase 4)

Every level adds five monsters, each featured in one room (`curve.intro` in the level file) and mixed into later rooms:

| Level | Monsters |
|---|---|
| Ruins | Rat Swarm (6-9 flanking rats), Bomb Beetle (fuse flash, blast hurts monsters too), Skeleton Archer (shoots, retreats to cover), Wisp (orbits, then dives), Necromancer (raises each corpse once; kill first) |
| Desert | Fire Imp (fast, burning trail), Cactus Turret (rotating spine ring), Mummy Priest (heals and shields allies), Sand Shark (untargetable fin, leaps), Dust Devil (pulls you, bends bolts) |
| Palace | Jester (bouncing bombs, confetti teleport), Mirror Knight (throws back one bolt per 1.5s from the front, the rest hit its shield for half damage), Houndmaster (+2 hounds that flee when he dies), Gargoyle (dormant statue; wakes near you or when nothing else is left), Twin Mages (a beam joins them) |

From room 3 a monster may be an **elite** with a glow and name tag: Armoured (half damage until its bar breaks), Swift, Splitting, Vampiric or Volatile (telegraphed blast on death). Elites drop an extra roll and sometimes a gem.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/ (relative base: works from any static host or subfolder)
npm run preview    # serve dist/ locally (vite preview, http://localhost:4173)
npm test           # Vitest (pure logic in src/logic)
npm run typecheck
npm run favicon    # regenerate public/favicon.png from the wizard sprite (tools/make-favicon.ts)
npm run gen-maps   # regenerate public/assets/maps/*.tmj (ruins, desert, palace) from tools/mapThemes.ts (deterministic seeds)
```

## Features

Three levels (Ruins, Desert, Palace) with bosses, loot, gems and permanent saves; Apprentice Staff, Broken Wand, Golden Sword (plus each hero's own weapon) and ten skills (Fireball, Frost Nova, Chain Lightning, Boomerang Blade, Arcane Shield, Poison Cloud, Spirit Wolf, Blink Strike, Meteor, Gravity Well) chosen on a loadout screen;
keyboard/mouse, gamepad and touch; title screen, How to Play (highlights the device you used last) and Settings (music and effects volume
in 10% steps, master mute, "Reduce shake / flashes"); Kenney sound effects with random variants and pitch, menu music and a victory jingle;
hit-stop, budgeted screen shake, hurt and low-HP vignettes, death particles, dust and muzzle flashes; boss intro banners.

## Controls

| Action | Keyboard / mouse | Touch | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | Left half: floating stick | Left stick / D-pad |
| Aim | Mouse | Right half: floating stick (last-used device wins) | Right stick |
| Fire | Left mouse button | Right stick past ~50% | RT or right stick past ~50% |
| Skill 1 | Right mouse button or 1 | Button 1 (fans out left of Dash) | LT |
| Skill 2 | E or 2 | Button 2 | RB |
| Skill 3 | R or 3 | Button 3 | LB |
| Dash | Space | Arrow button, right edge | A |
| Drink potion | F | Potion button under Dash | Y |
| Pause | Esc | Pause button, top right | Start |
| Menus | Mouse / arrows or WASD + Enter, Esc = back | Tap | D-pad / left stick + A, B = back |
| Fullscreen | Top-right button | Top-right button | - |
| Mute | M (saved), or Sound in the pause menu | Pause menu | - |

Touch controls appear after the first touch and hide on mouse, keyboard or gamepad use. The canvas expands from a
640x360 base to fill the screen; portrait touch devices show a "Rotate your device" prompt.

## Assets

Kenney CC0 assets are committed in `public/assets`, so the game runs without any script.
The UI font `SamuelPixel.ttf` is built from Kenney Pixel with redrawn confusable glyphs (l, i, j, t, 0, 8...) by `python tools/make_font.py` (needs `pip install fonttools`).
To re-copy them from the Kenney collection:

```
npm run copy-assets
# or, from another location:
KENNEY_DIR="D:\path\to\Kenney Game Assets All-in-1 3.0.0" npm run copy-assets
```

Frame indices for the Tiny Dungeon sheet are documented in `src/content/assetKeys.ts`.
The bow, arrow and fist sprites are hand-drawn by `python tools/add_weapon_frames.py` (needs Pillow) into `public/assets/extra/weapons-extra.png` (committed); `PreloadScene` merges that strip into the Tiny Dungeon texture as frames 132-134, so Kenney's sheet stays untouched.

## Game flow, saves and loot

Main menu -> level select (cards: locked / cleared / red "Under-levelled!" when player level < recommended - 1) -> game.
Pause offers Resume or Quit to level select. Levels are data in `src/content/levels/`; `GameScene` starts from `{ levelId }`.
Progress (level, XP), gems, owned weapons and cleared levels are saved in `localStorage` (`samuels-game-save`, versioned,
tolerant parsing in `src/logic/save.ts`). Coins picked up in a run are banked on quit/clear and lost on death.
You start with the Apprentice Staff; Broken Wand is the Ruins reward. Enemies drop coins, potions and gems
(`src/content/lootTables.ts`). Save slots: main menu > Save slots switches between 3 games (slot 1 is `samuels-game-save`, slots 2-3 are `samuels-game-save-2/-3`, active slot in `samuels-game-slot`); settings are shared. To reset the active slot: `localStorage.removeItem('samuels-game-save')` (slot 1).

## Level 1: Broken Wand (Ruins)

`public/assets/maps/ruins.tmj` is a Tiled-compatible map (layers `ground`, `walls`, object layer `objects` with `playerStart`,
`room`, `door`, `bossArena`, `exit`) generated by `tools/generate-maps.ts` (theme `RUINS_THEME`) from `src/logic/dungeonLayout.ts`; it can be
hand-edited in Tiled afterwards (rooms carry `order`, `encounter`, `waves`, `minLevel`, `maxLevel`; doors carry `room`).
Five combat rooms (monster Lv 1 to 4) lead to the Stone Guardian arena. Stepping into a room seals its doors until every
wave is dead (HUD shows "Room N/5"). Ghosts keep their distance and shoot slow bolts. The Guardian (Lv 5) slams after a red
warning circle, fires radial bolt bursts and, below 50% HP, speeds up, fires 12 bolts and summons bats. Its drop completes
the level: Broken Wand granted and equipped, Lost Desert unlocked. Music (`public/assets/music`) is copied by `copy-assets`
from the royalty-free pack (`MUSIC_DIR` overrides the path).

Dev only: `npm run dev` then `?debug=godmode` makes the player invulnerable with 10x damage and exposes `window.__game`.

## Level 2: Lost Desert

`public/assets/maps/desert.tmj` is generated by the same `tools/mapBuilder.ts` as the ruins; each level is a `MapTheme` in
`tools/mapThemes.ts` (tile palette, cover tiles, encounter curve, quicksand count, seed) plus a layout preset in
`src/logic/layoutPresets.ts`. The desert has six larger, sparser combat rooms (monster Lv 5 to 9, `hazard` objects mark
quicksand that slows the player to 50%) and the Sand Rat arena. Enemies: scorpions (pause, red lane warning, straight dash),
bandits (3-bolt spread), mummies (slow tanks), vultures (erratic). The Sand Rat (Lv 10) burrows (untargetable, dust trail),
erupts under the player after a warning ring, spits bolt fans and, below 50% HP, calls scorpions. Its reward unlocks
the Fireball skill (see Skills below): a slow fireball that explodes on
impact or at max range (radius 40, falloff to 40% at the edge, 2.5s cooldown). Clearing the desert unlocks the Palace.

## Level 3: Killer Palace

`public/assets/maps/palace.tmj` (theme `PALACE_THEME`, preset `PALACE_PRESET`): six grand symmetric combat rooms (monster Lv 10 to 12) with mirrored statue cover,
timed spike traps (warning blink, then raised spikes hurt) and a throne room with a colonnade. Enemies: palace guards (shield blocks 55% from the front; get round the side),
royal archers (lead their shots), dark mages (blink away when you get close, then fire slow homing orbs) and assassins (nearly invisible until they strike).
### Hazards (v2 phase 4)

Every hazard is telegraphed, hurts monsters too (lure them in; bosses are immune) and gets busier by room number. Each wakes when you enter its room and goes calm when it is cleared (fire pits keep burning).

| Level | Hazards, in the order they appear |
|---|---|
| Ruins | Cracked floor (cracks 0.8s after a step, drops into a pit that hurts and ejects you, then re-forms), falling rubble (shadow circle for 1s), poison gas vents (hiss, then a damaging cloud) |
| Desert | Quicksand, fire pits (always burning), wind gusts (chevrons, then a push), sandstorm (rising dust, then fog closes in around you) |
| Palace | Spike traps, pressure-plate arrow walls (click, red lanes, volley), swinging pendulum blades (swept arc always shown), wall flame jets (glow, then fire) |

Boss arenas get one: rubble (Ruins), gentle wind (Desert), north-wall flame jets (Palace). Hazards stop when the run ends. Counts per room live in `MapTheme.hazards` (`tools/mapThemes.ts`).

The Mad King (Lv 15) lunges along a red lane, fires spinning blade rings, calls guards and, below 50% HP, teleports between thrones and fires spirals.
Reward: the Golden Sword, a melee weapon (~110 degree swing, hits everything in the arc once, knockback, swats one enemy bolt per swing). It also teaches Chain Lightning. After clearing the palace a locked "???" card teases the next chapter. Music: `palace.mp3` and `boss-palace.mp3` (copied by `copy-assets`).

## Skills and loadout (v2 phase 1)

Before each level the Loadout screen (between level select and the game) picks the basic weapon and three skills from what you own
(Start saves the choice, Skip plays with the last saved loadout). Skills work with any weapon and are data in `src/content/skills.ts`
(`cooldownMs` and `params` are per-level tables, level 1 for now). `SkillSystem` owns the slots and cooldowns on the pause-safe `GameClock`;
one caster per kind lives in `src/systems/skills/`.

| Skill | Effect (level 1) | Cooldown | How to get it |
|---|---|---|---|
| Fireball | Slow orb, 40px blast with falloff, 30 base damage | 2.5s | Lost Desert boss |
| Frost Nova | Ring (56px) around you, small damage, enemies slowed 50% for 3s | 8s | Skill scroll only |
| Chain Lightning | Nearest enemy in a 70 degree cone, then up to 4 jumps within 70px (line of sight, 15% falloff per jump) | 5s | Mad King (first clear) |
| Arcane Shield | 3s bubble: destroys enemy bolts, absorbs 40 damage | 12s | Stone Guardian (first clear) |
| Blink Strike | Teleport up to 90px toward the aim (stops at walls), damages enemies on the path, 0.4s i-frames | 7s | Skill scroll only |
| Boomerang Blade | Thrown 140px along the aim, returns to you; each enemy is cut once outbound and once on return, walls turn it back | 3.5s | Skill scroll only |
| Poison Cloud | 60px cloud 70px ahead for 4s; one refreshed poison per enemy ticking every 0.5s (no stacking) | 9s | Skill scroll only |
| Spirit Wolf | Ally wolf for 10s that paths to the nearest enemy and bites every 0.7s; takes no damage, not an enemy, ignores doors and pickups | 14s | Skill scroll only |
| Meteor | Marks a 44px circle up to 120px ahead, lands after 1s: 60 base damage with falloff, big shake | 12s | Skill scroll only |
| Gravity Well | 70px vortex 90px ahead for 2s: drags enemies in (bosses at 25%), small damage ticks | 11s | Skill scroll only |

Level 5 twists (the per-level tables carry a `twist` flag): Fireball splits into 3 mini fireballs; Frost Nova freezes non-boss enemies for 1s;
Chain Lightning leaves a static field at each jump; Boomerang throws two blades in a V; Arcane Shield bursts outward when it ends;
Poison Cloud follows you; Spirit Wolf summons two wolves; Blink Strike leaves a damaging afterimage; Meteor leaves burning ground; Gravity Well collapses with an explosion.
Lingering effects share `src/systems/skills/ZoneField.ts`; the pure maths is in `src/logic/{boomerang,dot,zone,gravityWell,aimPoint,spiritWolf}.ts`.

Skill scrolls drop rarely (0.5% per kill, 3% from bosses) for a skill you do not own. With a free slot it is equipped and an item card shows;
with all three slots full a swap prompt pauses the game: pick the slot to replace or keep the skill in the bag (it stays owned).
The save (v6) stores `skills.owned: {id, level}[]` and `loadout {weapon, slots}`; older saves migrate (unlocked fireball power becomes the level 1 skill in slot 1,
the equipped weapon becomes the loadout weapon, skill rewards of already cleared levels are granted).

## Heroes (v2 phase 3)

Level select leads to a hero screen (Continue, or Skip to reuse the last hero), then the loadout. Heroes change HP, speed, attack rate, damage and skill cooldown, have a passive, and deal +10% damage with their signature weapon.
Unlocking a hero also gives you its signature weapon (and starting skill). Locked heroes show a silhouette and a hint; try playing differently.

| Hero | Passive | Hint |
|---|---|---|
| Samuel the Wizard | Skills cool down 10% faster | (starting hero) |
| Sir Brandt (knight) | 20% less damage from the front | "A true warrior needs no tricks, from the first door to the last." |
| Vex (rogue) | A dash leaves a dagger trap where it ends (3s, two at once) | "The desert rewards the swift." |
| Borin (dwarf) | +25% gold, potions heal 50% more | "Gold calls to the mountain folk." |
| Wren (ranger) | Long-range basic hits crit (x1.5) | "Keep your distance, in the sand and the palace." |
| Kai (monk) | Every 5th basic hit stuns (not bosses) | "Discipline over comfort. Walk past the potions." |
| Morwen (necromancer) | Enemies you slay may rise as a skeleton ally for 8s (three at once; ally kills never raise more, but they count toward total kills) | "So many souls..." |
| The Wanderer (secret) | Rare drops 50% more often | "Many hands, one destiny." |

Unlock rules: knight = clear the Ruins without casting a skill; rogue = clear the Desert in under 5:00; dwarf = hold 800 gold at once; ranger = clear Desert or Palace taking at most 20 melee damage; monk = clear any level without drinking a potion (dashing is fine); necromancer = 600 monsters in total; wanderer = three bosses with three heroes.

### Balance (v2 phase 5)

`tests/balanceModel.ts` is a headless model of a reference player (on-level Broken Wand, 60% accuracy, skills worth +25%, dodges half of what a standing player would take). It plays whole levels from the wave planner, loot tables and monster stats and reports damage, time, XP, gold, gems and potions per room; `tests/balanceModel.test.ts` pins the bands (no spike between rooms, steady rise inside and across levels, XP arrival levels, economy). Change a curve or a monster and those tests say if a room became a spike. Hazard hits live in `src/logic/hazard/hits.ts`.

Save v8 adds `heroes` and `stats`; v7 saves migrate with the wizard only. Dev: unlock everything by editing `heroes.unlocked` in the save.

## Adding a new level

1. Theme: add a `MapTheme` to `tools/mapThemes.ts` (tiles, cover, encounter curve, seed) and a `LayoutPreset` in `src/logic/layoutPresets.ts`; run `npm run gen-maps`.
2. Config: add `src/content/levels/<id>.ts` (name, `mapKey`, music, enemy pool, monster levels, `bossId`, `bossLevel`, reward, `unlockedBy`) and register it in `levels/index.ts`; add the map key to `MapKey`/`Environment` and a tint in `ENVIRONMENT_TINT`.
3. Enemies and boss: new `EnemyDef`s in `src/content/enemies.ts` (plus a `DEATH_TINTS` colour and loot table), boss attacks as a `BossBrainConfig` in `src/content/bosses.ts`.
4. Music: add the files to `tools/copy-assets.ts` and `MUSIC_FILES`, then `npm run copy-assets`.
5. Tests: extend the content/layout tests and add balance checks in `tests/balance.test.ts`.

## Settings and audio

Volumes and the shake toggle live in the save (`settings`, save v4). Effects go through `playSfx(scene, id)` (`src/systems/sfx.ts`, definitions in
`src/content/sfxDefs.ts`); music through the game-wide `MusicPlayer` (`musicOf(game)`), which crossfades and follows the music volume.

## Economy and the Camp (v2 phase 2)

- **Gems** replace the old passive charms: red (Power), green (Swiftness), blue (Vitality). They are spent, never passive. Normal kills drop one ~5.6% of the time (`GEM_DROP_SCALE` 1.4)
  (colour leans to the level theme: ruins blue, desert green, palace red); bosses add a burst of 3-5. The first gem of each colour shows an item card.
- **Camp** (`CampScene`): Level Select has a Camp button and the results screen has Visit Camp. Tabs: Upgrades and Shop (left/right or tap), gold and gems on top, scrolling list (wheel, arrows, tap).
  - Upgrades: every owned weapon and skill goes level 1 to 5. Going from level L costs `round(60 * L^1.6 * tier)` gold (tier x1 / 1.25 / 1.5) plus L gems of the item colour
    (skills: offence red, utility green, defence and support blue; weapons red; mapping in `src/content/upgradeInfo.ts`). The preview reads the per-level tables, e.g. Fireball 1 to 2: Damage 30 -> 36, Cooldown 2.5s -> 2.35s.
  - Weapons gain +12% damage and +5% fire rate per level. Level 5 twists: staff bolts pierce one enemy, wand bolts split in two on hit (60% damage), Golden Sword swings send a short slash wave, the Iron Sword's stab becomes a wide swipe, Bone Staff kills may raise lesser skeletons. Skill twists are in `skills.ts`.
  - Shop: 3 unowned skills for 150 / 250 / 400 gold (tier 1 / 2 / 3), rotating after every level clear (seeded from the save); Health Potions (40 gold, carry 3, heal 40% HP); one Revive Token (300 gold).
- **Floor potions** no longer fly to you: gold and gems still magnetise, a potion is only drunk when you walk onto it. Coins are worth 2 / 12 / 24 gold (coin, pile, gold pile).
- **In a level**: F / gamepad Y / the touch potion button drinks a carried potion (only when hurt). With a Revive Token you rise once at 50% HP with 2s of i-frames; the token is consumed.
- Save v7: `gems`, `potions`, `revive`, `shop.rotation`, `weapons.levels`. v6 charms convert one to one (power to red, swiftness to green, vitality to blue) and seen card ids are renamed.
