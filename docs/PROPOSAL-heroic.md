# Proposal: Heroic levels, crowns and Heroic Survival

Status: **H1 + H2 built 2026-10-27**

## Problem
Monster levels are fixed per level (ruins 1–4, desert 5–9, palace 10–12, ultimate 16–20, arena 1–4) while the hero
climbs to 50. Weapon damage grows +12%/level with no cap, and out-levelling monsters adds up to +20% damage dealt and
−30% damage taken (`src/logic/damage.ts`). A high-level hero flattens every level.

Direction: keep normal levels as they are (stomping old levels is fun) and add an opt-in **Heroic** version of each
level whose monsters match the hero.

## Phase H1 — Heroic levels + crowns
1. **Unlock:** a level's Heroic version unlocks once its normal version is cleared.
2. **Picking it:** the level card gets a Normal / Heroic switch (left/right on keyboard & gamepad, tap on touch),
   remembered per level. Heroic cards look distinct (gold border + crown icon once earned).
3. **Monster levels** (fixed when the run starts, hero level `P`): the level's room ranges shift up so the level's top
   = `P + 1`, keeping the room-to-room climb, never below normal; boss = `max(normal boss, P + 2)`. Room curves
   unchanged. Pure logic in `src/logic/heroic.ts`.
4. **Rewards:** XP and gold already scale with monster level. **First Heroic clear** of a level awards gems and that
   level's **crown** (each level a different crown). Separate Heroic best time.
5. **Accessories:** new `head` slot on the Loadout screen; any hero can wear any owned crown; drawn on the hero in
   game. Built as a general accessory system (`src/content/accessories.ts`) so more items/slots can come later.
   Crown art is generated into `public/assets/extra/accessories-extra.png` by a `tools/` script.
6. **Save:** version 8 → 9 with tolerant migration: `levels.heroic { cleared, bestTimes }`, `levels.mode`
   (remembered Normal/Heroic per level), `accessories { owned, worn }`.
7. **Hero unlocks:** a Heroic clear counts as a clear of that level for the hero unlock rules.
8. **Balance:** balance model gets Heroic cases (hero at 15 / 25 / 40) with a "real but fair" band.

## Phase H2 — Heroic Survival (after H1 ships)
Unlocked by clearing Ruins, Desert and Palace on **Heroic** (Ultimate joins the list once built). A time-trial arena:
"how long can you survive?". Monsters start around the hero's level and get progressively tougher (level), more varied
(pool widens across all levels' monsters) and more frequent until the hero dies. Best survival time saved and shown.
Doubles as an engine stress test: measure FPS as the alive count climbs and set the cap from the measurement.

## Decisions (user, 2026-10-27)
- Toughness: around the hero's level (rooms top out at P+1, boss P+2).
- Arena: the existing arena stays as is; instead a new **Heroic Survival** arena (Phase H2).
- Survival unlock: Ruins, Desert and Palace all cleared on Heroic.
- Reward: gems + a crown per level, **wearable**; build it as an accessory system for future items.
- Where to wear: a Head slot on the Loadout screen.

Made during H1 review (coordinator):
- Heroic room ranges are floored at hero − 1 (only when the level is shifted) to remove a too-easy start then spike.
- Heroic is only offered for levels with rooms (`offersHeroic`); the old arena never gets it.
- First-clear gems: 3 of each colour (`HEROIC_CLEAR_GEMS`).
- `save.ts` reads `src/content/accessories.ts` (pure data) to validate accessory ids.

Made during H2 (coordinator):
- Stages every 45 s; tuned so the reference hero survives ~5.5–7.5 min (hero 40 / 20) with a gentle first 90 s; every run ends by 15 min.
- `SURVIVAL_PERF_CAP` = 40 alive: no frame drops measured up to 220 alive on desktop, so 40 leaves headroom for tablets/phones.
- Early stages leave out groups bigger than the alive cap (a swarm would otherwise stall the waves).
- Quitting from pause records the time survived; level-up/item cards pause the run; XP/gold from kills are kept.
- Music: the boss track.
