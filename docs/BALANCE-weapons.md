# Weapon balance — measurement and tuning proposal

Status: **sword and hammer tuned** (2026-10-29). Staff, slinger and wand aim unchanged.

## Why

Play-test: with the Broken Wand, level 2 (desert) rooms are a slog and the waves pile up. The Golden Sword (Sir Brandt)
kills in a couple of swipes, knocks everything back and swats bullets, so the player feels invulnerable.

The balance model (`tests/balanceModel.ts`) only simulated the wand: damage × fire rate × accuracy against one target.
It could not see multi-hit, knockback, bolt swatting or the cost of walking into melee reach.

## What the model now measures

`tests/weaponProfile.ts` derives a profile per weapon, relative to the wand (the wand is exactly neutral, so every
existing balance test is unchanged):

| factor | assumption |
|---|---|
| accuracy | melee +0.2 (0.8 vs the wand's 0.6): a cone forgives aim |
| targets per hit | cone: 1 + 0.4 × arc (radians); pierce: +0.25 per extra pierce; full only with 4+ alive |
| contact hits avoided | melee: 0.1 × knockback (max 0.5); ranged: kiting from range vs the wand (±0.3) |
| bolts blocked | one bolt per swing: 0.175 × swings/s, capped at 0.6 (sword 0.35, daggers and fists 0.6) |
| walk-in cost | melee takes up to +40% threat and loses half that in attack time, by how short reach is |

These constants are judgement, not playtest data. They are single named constants and easy to change. The sword's
conclusion does not depend on them (see the ablation).

`tests/weaponBalance.test.ts` runs the ruins → desert → palace campaign with each weapon at level 1 and requires
**room damage and clear time within ±25% of the wand**. Weapons that fail today are `it.fails` with a
`TODO(balance)` pointing here.

## Results (weapon level 1, hero passives ignored)

| weapon | hero | raw DPS | room damage vs wand | clear time vs wand | |
|---|---|---|---|---|---|
| Broken Wand | — | 40 | 1.00 | 1.00 | baseline |
| Golden Sword | Knight | 44 (was 62.9) | 0.78 (was 0.56) | 0.85 (was 0.70) | ok, tuned |
| Hammer | Dwarf | 35.6 (was 64.3) | 0.81 (was 0.47) | 0.95 (was 0.68) | ok, tuned |
| Twin Daggers | Rogue | 41.7 | 0.95 | 0.89 | ok |
| Fists | Monk | 40.6 | 0.85 | 0.90 | ok |
| Bow | Ranger | 44 | 0.82 | 0.91 | ok |
| Javelin | — | 28.6 | 1.17 | 1.23 | ok (edge) |
| Crystal Scepter | Nab | 40 | 1.03 | 1.00 | ok (shatter averaged; freeze and spray not modelled) |
| Sludge Slinger | Gloop | 25 | **1.84** | **1.44** | too weak* |
| Apprentice Staff | Wizard, Necromancer | 18.8 | **3.10** | **2.02** | too weak* |

Hero attack-rate stats are not modelled: QA measured the Knight's real cadence at about 590ms (500 / 0.85), so the in-game sword is slightly weaker than the table shows, and Shield Wall offsets that.

\* Their heroes' skills and the slinger's slowing puddle are not modelled, so these may be partly intended.

### Golden sword: what made it strong (one factor off at a time, before tuning)

| variant | damage | clear |
|---|---|---|
| as now | 0.56 | 0.70 |
| single target | 0.64 | 0.72 |
| no knockback | 0.64 | 0.70 |
| no bolt swatting | 0.59 | 0.70 |
| no melee accuracy bonus | 0.68 | 0.81 |
| raw DPS cut to the wand's 40 | 0.78 | 0.90 |

**Raw damage is the main cause** (63 vs 40 DPS). Multi-hit and knockback come next. Bolt swatting matters least in the
numbers, but it is what makes the sword *feel* invulnerable, because a whole volley disappears in one swing.

### Does the wand feel weak because of aim?

Same model, but with the wand at 45% accuracy instead of 60%: room damage ×1.39, clear time ×1.25, and the worst
desert room costs **72% of health** (the cap is 65%). The model's imagined player aims better than a young play-tester,
which explains "level 2 is very tough with the wand".

## Candidate sword tunings (run through the model)

| swing ms | knockback | bolts swatted | damage | clear | worst desert room |
|---|---|---|---|---|---|
| 350 (now) | 2.4 | all | 0.56 | 0.70 | 20% |
| 420 | 1.6 | one per swing | 0.68 | 0.76 | 26% |
| 480 | 1.6 | one per swing | 0.76 | 0.82 | 30% |
| 550 | 1.6 | one per swing | 0.86 | 0.90 | 35% |
| 350, damage 16 | 1.6 | one per swing | 0.76 | 0.83 | 30% |

("One per swing" is modelled as blocking 35% of bolts instead of 60%.)

## Options and recommendation

**Sword**
- **A (recommended): swing 350 → 500ms, knockback 2.4 → 1.6, swats only the first bolt per swing.** It still kills in
  two or three swipes, but it feels heavier and timing matters. Bullets are blockable but not erasable. Expected about
  0.78 damage / 0.85 clear.
- B: damage 22 → 16, keep the fast swing. Same numbers, but more swipes per kill, which loses the "big hit" feel.
- C (your option 1): no swatting until level 5. Its level 5 twist is already the slash wave, so this needs a twist
  rework, and by the numbers swatting is the smallest factor.
- D (your option 2): the arc grows with level, e.g. 80° at level 1 to 100° at level 5. This is nice flavour, but it
  only works with a narrower starting arc. It can be added on top of A.

**Hammer:** same treatment (slower, less knockback, one bolt per swing). Even at 1000ms with knockback 3 it is still at
0.66, so it also needs about 20% less damage. Exact numbers get tuned until the parity test passes.

**Staff / Sludge Slinger:** first model the Wizard's, Necromancer's and Gloop's skills and the puddle's slow. If they're
still far off, buff the base damage (staff 6 → about 11, slinger 15 → about 22 brings both into the band).

**Wand / aim:** a separate question. Options: a light aim assist for ranged weapons on touch/gamepad, or soften the
worst desert rooms. Decide after the sword change, which already removes the "easy mode" comparison.

## Decisions

- **2026-10-29 — Sword: option A.** Swing 350 → 500ms, knockback 2.4 → 1.6.
- **Every melee weapon swats at most one enemy bolt per swing.** Fast weapons (daggers, fists) still block nearly
  everything. Slow, heavy ones (sword, hammer) have to time it. In the model, bolts blocked comes from swings per second.
- **Hammer (built):** swing 700 → 900ms, knockback 4.5 → 3.0, damage 45 → 32. Model: room damage 0.81, clear 0.95. Still the slowest and heaviest melee weapon, with the same 140 degree cone, shake and shove.
- Staff, slinger and wand aim stay unchanged for now. Revisit after this lands.
