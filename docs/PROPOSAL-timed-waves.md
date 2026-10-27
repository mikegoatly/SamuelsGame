# Proposal: timed, trickling waves

Status: **built 2026-10-27**

## Today

- Entering a room seals the doors and calls `planWave` for wave 1; **every monster of the wave spawns in the same frame**
  (`RoomFlowSystem.startWave`, `SpawnSystem.startWave` for the arena).
- The next wave only starts **1.5 s after the previous one is fully dead** (`ClearWatch` → `onWaveCleared`).
- Positions come from `pickRoleSpawn`: tanks near the player, shooters far away, never closer than 90 px.
- Result: rooms are a sequence of separate "pop-in, clean up, pause" fights. No pressure to be quick; nothing ever
  comes from behind.

## Goal

Monsters arrive over time, from any side (including behind the player as they walk in), and later waves start
before you've finished the last one — so killing fast matters, and dawdling means the room fills up.
Must stay fair for a young player: every arrival is telegraphed, and there is a ceiling on how bad it gets.

## Proposed design

### 1. Trickle within a wave
A wave's planned spawns are released one group at a time, every **~0.6 s** (jittered), instead of all at once.
Pure logic: `scheduleWave(spawns, rng) → { atMs, spawn }[]` in `src/logic/`.

### 2. Spawn telegraph (fairness)
Each arrival is preceded by a **~0.8 s marker** on the floor (pulsing ring / dust puff + soft sound). The monster
appears when the marker finishes and **cannot act or deal damage for a short grace period**. Markers never appear
within the min spawn distance of the player; if the player walks onto one, it relocates.

### 3. Timed next wave ("reinforcements")
The next wave starts at whichever comes **first**:
- the wave timer runs out (e.g. **12 s** after the previous wave finished trickling in, shortening per room), or
- the room is nearly clear (living ≤ ~1–2 monsters) — so fast players aren't left waiting.

The room clears when **all waves have spawned and everyone is dead** (ClearWatch semantics unchanged:
splitters, raised dead, statues still count).

### 4. Overwhelm cap
A **max-alive budget** per room (curve-driven, e.g. 8 → 14 slots). When the room is at the cap, the trickle and the
wave timer **pause**. This is the safety valve: slow play is punished with a full room, not an impossible one.

### 5. Where they come from
New spawn mode alongside the existing roles:
- `behind`: biased to the half of the room opposite the player's facing/move direction (or the doorway they came in by
  for wave 1). Used for a share of each wave (e.g. 1 in 3 groups), never for the room's featured new monster.
- Existing `front`/`back` roles still apply to the rest.

### 6. Escalation ("more monsters over time")
Two levers, both in `LevelCurve` (no special cases):
- **Per wave growth** — already exists (`size.perWave`); with overlap it now stacks pressure.
- **Overtime trickle (optional)** — once the planned waves are all out, if the room isn't cleared within N seconds,
  extra single monsters keep trickling in (still under the cap) until it is.

### 7. HUD
A small "next wave" bar/pip under the room counter so the timer is visible, plus "Wave 2!" float text. Hidden in the
last wave. Text via `gameText`.

### 8. Arena mode
Same scheduler; the arena becomes "endless reinforcements" with the cap rising per wave.

## Curve changes (sketch)
```ts
interface LevelCurve {
  // existing: intro, waves, size, elite
  timing?: {
    trickleMs: number;        // gap between groups in a wave (~600)
    waveGapMs: [first: number, min: number]; // timer for next wave, shrinking per room (12000 → 7000)
    earlyAt: number;          // start next wave early when living ≤ this
    cap: { base: number; perRoom: number; max: number }; // max alive slots
    behindShare: number;      // fraction of groups that use the 'behind' role (~0.33)
    overtimeMs?: number;      // optional overtime trickle
  };
}
```
Defaults in `DEFAULT_CURVE`; levels tune their own.

## Balance
Overlap raises damage per room. `tests/balanceModel.ts` needs a term for overlap (expected concurrent monsters given
kill speed vs. arrival rate, clipped by the cap). Likely need to trim `size` slightly so the existing bands still
pass. Elites unchanged.

## Work split (two Sonnet builders, parallel)
- **A — logic + balance:** `src/logic/waveSchedule.ts` (trickle schedule, next-wave decision, cap, behind role
  picking) with `it.each` tests; `LevelCurve.timing` + defaults + level tuning; balance model update.
- **B — runtime + feel:** `RoomFlowSystem` / `SpawnSystem` driven by the schedule on `GameClock`; spawn marker +
  grace period; HUD wave bar; respects `feel.isLocked`, reduce-flashes, run end/death.

## Open questions
1. Next wave trigger: timer-or-nearly-clear (recommended), timer only, or keep clear-only and just trickle?
2. Overtime trickle after the last wave: yes or no?
3. Behind spawns: how often (none / ~1 in 3 / ~half)?
4. Apply to arena mode too?

## Decisions
All recommended options taken (2026-10-27):
1. Next wave: **timer or nearly clear**, whichever first; timer shortens in later rooms.
2. Overtime trickle: **yes**, single stragglers, always under the max-alive cap.
3. Behind spawns: **~1 in 3** groups, always telegraphed; never the featured monster.
4. Arena: **yes**, same scheduler, endless reinforcements with a rising cap.

Made during review (coordinator):
- The cap counts a group by its expected size; a group only releases if it fits (or the room is empty).
- Packs stay together on one marker; pack markers are wider and groups of 4+ spawn 60 px further away.
- New-spawn grace (500 ms) rides the existing fade-in tween rather than `GameClock`: pause- and hit-stop-safe.
- Palace room 4 gets 3 waves (`[2,2,2,3,3,3]`) to keep the time floor and room-to-room step bands.
