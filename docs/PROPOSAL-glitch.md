# Proposal: Glitch (third hidden level)

Status: **G1 and G2 built** (2026-11-21); G3 (Glitch the Glitcher, Glitch weapon, polish) next

Decided by the user:
- The player sprite **never glitches** (readability).
- RGB split and screen tear are **intermittent**, on about **25%** of the time, not constant.
- **All non-boss monsters** from every level are fair game; Glitch gets its **own new boss**.
- **Unlock:** once **Heroic is cleared on Ruins, Desert and Palace**, the **next fresh run of any map is guaranteed**
  a glitch tile; after discovery it appears **1 in 5** runs.
- **Boss:** option A, the Missing Texture.
- **Hidden hero:** **Glitch the Glitcher**, a blue robot whose passive lets projectiles pass through him after a
  projectile hit (section 5a).
- **First Normal clear:** a Glitch weapon.

A broken copy of the game: monsters from every level mixed together, the screen tearing and the HUD lying to you.
Endgame, post-Heroic content.

## 1. Finding it: the glitch tile

1. **Eligible:** only after `levels.heroic.cleared` contains `ruins`, `desert` and `palace` (same trio as the Heroic
   Survival rule). Before that it can never appear.
2. **Where:** generated (random-layout) maps of any level that has them, Normal or Heroic. Never on classic `.tmj`
   maps, Survival, or Glitch itself. One tile per map at most, placed on a floor tile in a combat room away from spawn
   (reuse `spawnAvoid`).
3. **Chance:** while undiscovered, the **first eligible fresh run is guaranteed** a tile (not retries, not dev), and
   so is every eligible run after it until the player finds it. After discovery it appears **20%** of fresh runs as a
   shortcut. No pity counter needed.
4. **Look:** a single floor tile showing the magenta/black "missing texture" checker, flickering between itself and
   a normal tile, with a faint buzz sound when nearby. Unmistakably wrong, but one tile, so it's easy to miss.
5. **Stepping on it** opens a `MenuList` prompt (pauses): *"The floor is... broken? Fall through?"* — **Fall in** /
   **Not now**. Same rules as the grate and Nab's gate:
   - **Fall in** ends the run like a quit (gold banked) and starts Glitch on Normal, same hero and loadout.
   - Either answer: "Glitch discovered!" notice and the Glitch card appears in Level Select.
   - **Not now** leaves the tile there.
6. Completely hidden until found (no "???" card). `?debug=glitch` forces the tile (DEV only).

## 2. The level

- **Tier:** endgame, scaling with the hero like Heroic: monster levels `heroLevel` to `heroLevel + 2` (minimum 15),
  boss at `heroLevel + 3`. Heroic version and crown like other levels.
- **Layout:** a generated map from a **mixed theme**: each room borrows the floor/wall set of a different level
  (ruins room, desert room, sewer room...), with hard seams where they meet. New `GLITCH_THEME` in
  `tools/mapThemes.ts`; 6 combat rooms + boss room.
- **Hazards:** each room keeps one hazard from the level it borrowed (quicksand, sludge, minecarts...), so the room's
  look tells you what to expect.
- **Monsters:** each room's wave pool is drawn from **every non-boss monster in the game** (`content/monsters.ts`),
  weighted so early rooms favour simple ones and later rooms mix in the trickier ones (Hookjaw Spider, Rock Mole),
  via a `fromRoom` tier on pool entries. Spawn-only monsters (e.g. Little Blob) are excluded. Balance through
  `waveMix` weights, not special cases.
- **Bursts** are capped: a requested burst is skipped if one ended under 2.5s ago (busy rooms otherwise ran ~42%).
  Split and tear drop to zero while paused so the pause menu doesn't look broken.
- **Monster glitch behaviours** (visual first, gameplay light):
  - palette swap every few seconds (tint cycle);
  - occasional 2px jitter and a ghost-trail frame;
  - rare **short teleport** (~48px), always telegraphed by a 0.5s flicker at the destination first.
  - No species swapping mid-fight: stats and attacks stay what they look like, so the player can read them.

## 3. Visual treatment

| Layer | When | Reduce flashes on |
|---|---|---|
| Scanlines | always | kept (static) |
| RGB split | ~25% of the time, in bursts of 1-3s | smaller offset |
| Screen tear (bands slide sideways) | during the same bursts | off |
| Corrupt tiles (magenta checker pops onto floor) | a few at a time, fade out | fewer, no pop |
| Monster palette swap / jitter | always | slower swap, no jitter |
| Text corruption (title, HUD letters, XP shows `NaN`) | rare, ~0.2s | kept (no flashing) |
| Player sprite and player projectiles | **never** | — |

- **Bursts as telegraphs:** a burst starts ~0.5s before a wave spawns or a monster teleports, so the chaos means
  something.
- **Implementation:** one custom Phaser `PostFXPipeline` on the game camera (RGB split + tear + scanlines, one
  intensity uniform). The player is drawn on a layer that the effect skips. Burst timing as pure logic
  (`logic/glitchBursts.ts`) on the `GameClock`, so pause stops it. HUD scene is unaffected except the text gag.
- Extra tiles (checker, seam) go in a generated sheet under `public/assets/extra/`.

## 4. The boss: the Missing Texture (G2)

Chosen over a Corrupted Hero mirror and an "Error 404" pop-up window. A big magenta/black checker cube with a face.
*Lesson: watch which boss it is copying, and find the real one.* Level: hero + 3 (min 18), as the stand-in.

**Phase 1 (100-50%): copy cycle.**
- It **copies a real boss** for 8s at a time, using that boss's own phase-1 attacks and wearing its colour (tint):
  Stone Guardian (slam + burst), Sand Rat (burrow + spit), Mad King (lunge + spiral), Mother Sludge (hop + spit).
  Bert is not copied (his fight is its own entity). **No summons** at any point: the fight is about the boss.
- **Switching** (~1s): it stops, flickers between checker and the next colour, a banner above it reads
  "COPYING: SAND RAT..." and a glitch burst fires. No attacks during the switch (a breather). Never the same copy
  twice in a row. A switch waits for the current attack to finish, so no telegraph is ever left hanging.

**Phase 2 (50-20%): three of it.**
- Splits into **3**: the real one (face, frame 3/4) and **two fakes** (hollow checker outline, no face, frame 5), all
  wearing the current copy's colour. The copy cycle carries on, 6s per copy.
- The real one and the fakes still use each copy's **phase-1** attacks here; phase-2 sets wait for phase 3.
- Fakes only use the copy's **projectile** attacks (burst, spit, spiral, seek) at **half damage**; no slams, lunges,
  burrows or hops. Player shots pass through fakes with a small pixel puff ("miss").
- Hitting the real one **3 times** pops both fakes (pixel shatter). They re-form 12s later while still in phase 2.

**Phase 3 (below 20%): the floor breaks.**
- Fakes gone for good. The arena floor glitches: every ~4s a **band** (a row or column of tiles, 2 tiles thick)
  turns into flickering checker for **1.2s** (the warning), then drops out for **2.5s** and re-forms.
- Falling in: 10% of max HP and a push to the nearest safe floor (like the cracked floor). At most ~40% of the
  arena is ever out at once, and the safe floor always stays connected. A band never drops under the player without
  the full warning.
- The copy cycle continues (6s per copy, phase-2 attack sets).

**Death:** it shatters into a cloud of pixels, and "ERROR: BOSS NOT FOUND" floats up. Normal reward drop (the Glitch
weapon arrives in G3).

**Reduce flashes:** steady colour change on switch instead of flicker, fewer shatter pixels, the warning band is a
steady checker instead of flickering.

**Balance:** boss fight inside the `balanceModel` boss band for Glitch (5-120s), tuned through its HP and copy timing.

## 5. Rewards

- Normal first clear: a **Glitch weapon** whose shots randomly get a twist from another weapon.
- Heroic: crown like other levels.

### 5a. Hidden hero (blue)

**Glitch the Glitcher** (class Robot), unlocked by finding Glitch (reveal via `heroReveal`, like Gloop and Nab).
Chosen by the user from two concepts (2026-11-21).

- **Art:** frame 1 of `public/assets/extra/glitch-extra.png` (`tools/add_glitch_frames.py`); frame 0 is the
  unused Patch concept, to be removed when G1 lays out the sheet. Small robot in muted
  denim blue, screen face with cyan eyes and smile, cyan-topped antenna, cyan chest light, steel hands and feet.
  Same proportions as the Knight.
- **Bio:** "A tiny robot that survived the crash. Beep!"
- **Stats:** HP high, speed low, attack mid, damage 1.1 (`mods(high, low, mid, 1.1)`).
- **Passive, Phase Glitch:** when an enemy **projectile** hits him, he glitches and enemy projectiles **pass straight
  through him for 1.2s** (shown by his sprite flickering with a brief RGB split: the one deliberate exception to the
  "player never glitches" rule, short and meaningful). Melee and hazards still hurt after the normal 0.6s.
  - Why not 200ms: every hit already gives 0.6s of full invulnerability (`PLAYER_IFRAMES_MS`), so 200ms would
    never be felt. 1.2s doubles the window against projectiles only, which reads clearly in bullet-heavy rooms.
  - Shots pass through and keep flying rather than vanishing, so the player sees the glitch happen.
  - Pure logic: a projectile-only immunity timer on `PlayerTimers` / a small `logic/phaseGlitch.ts`, on the
    `GameClock`; flicker goes through `feel` (reduce flashes: a steady tint instead of flicker).
- **Signature weapon, Pixel Pulse:** square pixel bolts that pierce every enemy in a line (Javelin-like, no burn),
  about 18 damage every 600ms.
- The first Normal clear of the level still gives the separate **Glitch weapon**.

## 6. Music

"Cool Blast" (Kevin MacLeod, Jazz folder of the music pack), copied via `tools/copy-assets.ts` to
`music/glitch.mp3`. Decided by the user.

## 7. Build phases

- **G1:** unlock rule, glitch tile, prompt, save field (`secrets.glitchFound`; save v14 with migration tests), level
  card, mixed-theme map, monster pool, music, post-FX pipeline and monster glitch behaviours. Until G2 the boss room
  uses a random standard boss (Stone Guardian, Sand Rat or Mad King) as a placeholder. Borrowed per-room hazards move
  to G3.
- **G2:** the boss.
- **G3:** rewards, hero (if any), polish and balance pass.
