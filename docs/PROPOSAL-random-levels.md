# Proposal: randomly generated levels

Status: **decided, building option B** (2026-10-26).

## Decisions (2026-10-26)

1. **Option B.** Random route, room shape variants, optional side treasure room. Room count, encounters, monster
   levels and curves unchanged per level.
2. **Random by default, classic first.** Until a level has been cleared once, it plays the committed classic `.tmj`
   (the tested first experience). After that every run gets a new seed. **Retry** after death keeps the same seed (learn
   the map); starting from Level Select rolls a new one. Dev `?seed=<n>` forces a random map with that seed.
3. **Side treasure rooms: yes,** 0-1 per run, a chest with coins and a potion, never a fight. Its corridor door belongs
   to the combat room it hangs off, so it closes during that fight.
4. **Arena unchanged.**

Classic maps keep the existing algorithm untouched (`mapGeneration.test.ts` still regenerates them byte for byte); the
random generator is a new path alongside it. The seed is shown in small text on the results screen.

## Where we are

Maps are already procedural, just frozen at build time:

- `tools/generate-maps.ts` calls `buildTmj(theme)` (`tools/mapBuilder.ts`) with a fixed `MapTheme.seed` and writes
  `public/assets/maps/*.tmj`. `PreloadScene` loads those files.
- `mapBuilder.ts` only imports pure code from `src/logic/**` (`generateLayout`, `placeHazards`, `placeSpikeTraps`,
  `placeActiveHazards`, `mulberry32`). Only `generate-maps.ts` touches `node:fs`.
- What a seed changes today: room sizes within each `CellPlan` range, cover, quicksand/spikes, active hazards.
  What it does **not** change: the route through the grid (fixed serpentine per `LayoutPreset`), room count, room
  order, corridor shape, boss arena position.

So "generate at runtime with a new seed each run" is cheap, but on its own the levels would feel *similar*:
same path, same number of rooms, slightly different sizes and cover.

## Options

### A. New seed per run (small)
Move `mapBuilder.ts` + `mapThemes.ts` into `src/` (pure, no Phaser), build the map in `GameScene` with a fresh seed and
add it to Phaser's tilemap cache (`cache.tilemap.add`). Keep the `.tmj` files for tests/fallback.
- Variety: low-medium (sizes, cover, hazards). Effort: ~1 builder pass.

### B. A + random route and room shapes (recommended)
On top of A, make the layout itself vary:
1. **Random route** through a bigger grid (e.g. 5x3): a seeded self-avoiding walk from start to boss instead of the
   fixed serpentine, so turns and direction change each run.
2. **Room shape variants** per combat room: plain, L-shape, pillared hall, two-part room joined by a gap. Picked by
   seed from a per-theme list (palace keeps symmetric shapes only).
3. **Optional side room** (0-1 per run): a small dead-end treasure/shrine room off the path with a chest. A reason to
   explore, no extra fight required.
4. Room *count* and monster curve stay fixed per level, so balance bands, encounters and unlock rules don't move.
- Variety: high. Effort: 2 builders in parallel (layout logic / runtime + content), plus QA.

### C. B + modifiers / daily seed (later)
Per-run twists ("Dark room", "Double hazards", "Elite room") and a shareable seed or "daily dungeon". Only worth it
after B proves fun.

## Guard rails (all options)

- **Always solvable:** property tests over ~200 seeds per theme: every room reachable, doors on both corridor ends,
  hazards never seal a pocket, spawn points inside rooms, boss arena big enough for the boss.
- **Balance:** `balanceModel` bands stay; room area per slot is clamped to the same ranges as today, so a run is never
  much harder than the current fixed map.
- **Determinism:** seed stored on the run (shown on the results screen in small text) so a bug report can be replayed;
  dev hook `?seed=123`.
- **Best times:** still per level; a random map makes them a bit noisier. Fine for a kid, mention it.
- Tests that pin the committed `.tmj` files keep working (the fixed seed still generates those maps).

## Decisions needed

1. Option A, B or C? (recommend **B**)
2. Random for every run, or a toggle ("Classic map" / "Random map") on Level Select? (recommend random by default,
   classic map kept as the first-ever run of each level so the first experience is the tested one)
3. Side treasure rooms: yes / no? (recommend yes, 0-1 per run, coins/potion only)
4. Should the Arena change too? (recommend no for now)
