# Proposal: The Sewer (hidden level) and a hidden hero

Status: **ideas, waiting for decisions** (2026-10-27)

## 1. Finding it: the grate room

What we have today: random maps (played once a level is cleared) put a dead-end side room with a treasure chest on
~60% of seeds (`layout.sideRoom`, `treasure` object, `logic/treasure.ts`).

Proposal:
1. **Grate rooms are a kind of side room, Lost Desert only.** Same placement code; the map exports a `grate` point
   instead of a `treasure` point. The grate is a floor sprite (dark bars, two glowing eyes blinking underneath,
   a drip sound and a little green mist so it reads as "something's down there" from the corridor).
2. **How often:** while the sewer is undiscovered, a desert side room is a grate **50%** of the time (about 1 run in
   3). **Pity rule:** after 3 random desert runs without a grate, the next desert run has a grate room for sure. Once
   discovered, the grate still shows up sometimes (25% of side rooms) as a shortcut in.
3. **Walking onto it** opens a small `MenuList` prompt (pauses the run): *"A rusty grate. Climb down into the
   sewer?"* — **Climb down** / **Not now**.
   - Either way: "Sewer discovered!" notice, the sewer card appears in Level Select, the hidden hero unlocks
     (reveal shown via `heroReveal`).
   - **Climb down** ends the desert run like a quit (gold banked, nothing lost) and starts the sewer with the same
     hero and loadout.
   - **Not now** carries on with the desert; the grate stays there, so you can still change your mind.
4. **Level Select:** the sewer card sits after the desert. Before discovery it is **not shown at all** (no "???" card,
   so it's a real secret). A gentle hint could appear after the desert is cleared, e.g. on the desert card tagline:
   *"Something drips beneath the sand..."*.

Alternative: no prompt, walking on the grate just drops you in. Simpler, but a child could lose a good desert run by
accident; I'd keep the prompt.

## 2. The level: Sunken Sewer

- **Tier:** between desert and palace. Monster levels **8-11**, recommended level 9. Heroic version and crown like
  every other level (the crown list grows by one; Heroic Survival unlock rule stays Ruins + Desert + Palace).
- **Look:** dark stone brick walls, wet flagstone floor (tinted), green sludge channels, pipes on the walls, a
  slightly darker vignette (through `feel`, honours reduce-flashes). Music from the pack (candidates: "Layered
  Synth" or "Idle" slowed feel; needs listening).
- **Layout preset:** long tunnels feel. Rooms are **junction chambers**; each combat room has a **sludge channel**
  running through it with 1-2 bridges (channel = slow zone like quicksand, 50% speed, so bridges matter). Generated
  through `tools/mapThemes.ts` + a `SEWER_PRESET`, 6 combat rooms + boss chamber, random maps from the start of
  the second run, same as the others.
- **Hazards** (mostly reusing `logic/hazard/*`):
  - Sludge channels (new slow-zone look, quicksand rules).
  - **Gas pipes** (reuse gas vents): puff green gas on a cycle with the usual warning.
  - **Flush** (new, the signature hazard): every ~12s a drain gurgles (1s telegraph: rising sound, arrows on the
    channel), then the channel pushes everything in it downstream for 2s (reuse wind push: `Player.windPush`,
    `Enemy.nudge`). Not damage, just shoves you; enemies get pushed too, which is fun to use.

### Monsters (one new monster per room, ordered easy to hard)

| # | Monster | What it does | Reuses |
|---|---|---|---|
| 1 | **Sewer Rat** pack | Rats scatter-swarm, tinted grey-green | `rat` / `ratSwarm` (new tint/levels) |
| 2 | **Sludge Blob** | Slow chaser, splits into 2 small blobs on death, leaves a short slow puddle trail | slime split + `logic/trail` |
| 3 | **Pipe Spitter** | Sits in a wall pipe, lobs a sludge glob; landing spot shown as a circle first | `turret` + lobbed shot (new arc) |
| 4 | **Bloat Toad** | Hops towards you, puffs up (red flash), pops into a small poison cloud | `bomb` beetle + cloud DoT |
| 5 | **Sewer Gator** | Swims hidden in the channel (only eyes showing), lunges out when you're near the bank | `shark` (channel = its "sand") |
| 6 | **Mold Shroom** | Stays back, heals/shields nearby monsters until you kill it first | `support` |

Sprites: Tiny Dungeon frames where they fit (rat, slime, frog-ish), extras generated into
`public/assets/extra/monsters-extra.png` by `tools/add_monster_frames.py`.

### Boss options

**A. The Rat King (recommended).** A huge crowned rat on a throne of junk.
- Phase 1: chases, **tail sweep** (red arc telegraph), **summons** 4-6 rats every ~15s, a **cheese-bomb** lob
  (telegraphed circle, small gas cloud).
- Phase 2 (<=50%): **dives into a drain** and pops up from another grate in the arena with a shockwave (reuse
  `burrow` + teleport arrival ring), summons more often, adds an 8-bolt "junk burst".
- Why: funny and readable for a child, fits the rats already in the level, almost all attacks exist in
  `bossBrain` (slam, burrow, burst, summon, spit).

**B. Mother Sludge.** A giant slime that splits into two at 66% and four at 33%; the pieces try to merge back if
left alone. Very different fight, but a new "split boss" system and harder to make clear for a child.

**C. Old Snapjaw.** A giant gator that submerges in the arena moat and lunges; tail swipe; spit. Strong, but very
close to the Sand Rat's burrow fight.

### Reward (normal clear)

- **Option 1 (recommended): a new weapon, the Sludge Slinger.** Lobs a slow blob that bursts into a small puddle
  which slows monsters. A crowd-control basic attack we don't have yet. Upgrades/twist like other weapons
  (twist: puddles also poison).
- Option 2: gems + gold only (it's a bonus level).
- Option 3: an accessory (e.g. "Rat King's Cape" in a new back slot). Fun, but needs a new slot.

## 3. The hidden hero

Unlocked the moment the grate is found (not on clearing), so the discovery itself is the reward. Locked card hint:
*"Some friends live where the light doesn't reach."*

| Option | Idea | Stats (HP / speed / attack) | Passive | Signature weapon |
|---|---|---|---|---|
| **A. Squeak, the Rat Prince** (recommended) | The Rat King's runaway son, he knows the way down | low / high / high | **Rat Pack:** 2 little rats follow him and nibble nearby enemies (more rats on kills, max 4) | Twin Daggers |
| B. Gloop the Slime | A friendly sewer slime | high / low / mid | **Sticky:** leaves a trail that slows monsters; once per level, a killing hit splits him instead (saves him at 30% HP) | Sludge Slinger |
| C. Rusty the Plumber-Knight | Sewer warden in a bucket helmet | high / mid / low | **Flush:** dashing shoves monsters away in a wave | Hammer |

Why Squeak: ties the hero to the boss (a bit of story for a child: "go and beat your dad"), and the rat-pack
passive reuses the ally code (`SpiritWolfCaster` with an `AllyLook`, like the Necromancer's skeletons). A special
line on the results screen when Squeak beats the Rat King would be a nice touch.

## 4. Build notes

- Save bump with tolerant migration: `secrets.sewerFound` (bool), `secrets.desertRunsWithoutGrate` (pity
  counter), new hero id. Tests for the migration.
- Pure logic in `src/logic`: grate chance + pity (`logic/grate.ts`), level visibility rule (hidden until found),
  flush cycle, lobbed-shot arc, any new boss attacks.
- The `.tmj` classic desert map is untouched (grates only on random maps, which is also why the sewer can only be
  found after clearing the desert once — deliberate but achievable).
- Dev: `?debug=grate` to force a grate room (DEV only).
- Balance: sewer gets bands in `tests/balanceModel.test.ts` between desert and palace.

Suggested phases: **S1** grate room + discovery + hero unlock (with a stub card); **S2** sewer map, hazards and
monsters; **S3** boss, reward, Heroic + crown, balance.

## 5. Decisions needed

1. Prompt on the grate (Climb down / Not now) or drop straight in?
2. How rare: 50% of desert side rooms + pity after 3 runs, or something else?
3. Boss: Rat King, Mother Sludge or Old Snapjaw?
4. Reward: Sludge Slinger weapon, gems only, or an accessory?
5. Hero: Squeak, Gloop or Rusty?
6. Hidden card (no sign until found) or a "???" card with a hint?
