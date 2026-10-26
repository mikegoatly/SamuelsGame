# Samuel's Game — working agreement

Top-down twin-stick action game. Phaser 3.90 + TypeScript (strict) + Vite + Vitest.
Runs in the browser on desktop, tablet and phone; keyboard/mouse, gamepad and touch are all first-class.

- Design docs: `docs/DESIGN.md` (what exists) and `docs/PROPOSAL-v2.md` (v2 plan, decisions, phase status).
- Run / scripts / controls / adding a level: see `README.md`.
- The main play-tester is the user's son (a child). Design for him: readable text, clear telegraphs and
  feedback, forgiving but not trivial difficulty, unlock rules that are deliberate but achievable.

## How we work

### Roles
- **Main session = coordinator.** It owns design decisions, briefs, review triage, verification, commits.
  It does not write feature code itself except small, obvious fixes.
- **Delegate to cheaper models:** Sonnet for building, reviewing and in-game QA; Haiku for surveys and
  read-only lookups (asset packs, file listings).
- Big or ambiguous work: write a short proposal (options + recommendation) in `docs/`, ask the user to
  decide, record the decisions in the doc, then build. Ask before any major refactor.

### The loop for each milestone / phase
1. **Brief** a Sonnet builder with: files to read first, scope as a numbered list, file ownership, rules
   below, how to verify, where to save screenshots, and a short report format.
   Split large phases across 2 builders **in parallel with strict file ownership** (each brief names the
   files the other agent owns and must not edit; shared hooks kept to tiny, reported edits).
2. **Verify independently, in parallel:**
   - a Sonnet **reviewer** on `git diff HEAD --ignore-cr-at-eol`, with a list of specific risk areas, 
     max ~12 findings;
   - a Sonnet **live QA** agent that is **report-only** (edits no files), plays through the real menus
     with Playwright, and reports PASS/FAIL with evidence and repro steps.
1. **Triage** both reports in one batch: make the design calls (state them to the user), split fixes by
   owner, send them back to the original builder (it has the context) via SendMessage.
2. **Check** the main session itself: `npx tsc --noEmit`, `npm test`, `npm run build`, spot-check key
   screenshots. Don't trust agent reports blindly.
3. **Commit** one commit per milestone/phase (descriptive message, why not just what). **Push** to
   `origin main` only when the user has asked to.
4. Report to the user in plain language: what changed, what was verified, what was *not* verified, any
   decisions made on their behalf, and what's next.

If a usage limit or stall interrupts an agent, resume it with SendMessage rather than starting fresh. If an
agent is stuck, check whether its work already landed, stop it, and finish the remainder.

## Rules for every builder (include in briefs)
- **Tests first** for pure logic: write the failing test, see it fail, then implement. Add a test for every
  bug fixed. Reuse `tests/builders.ts`; use table-driven `it.each`.
- Keep game logic in `src/logic/**` as **pure TypeScript with no Phaser imports** so it is unit-testable.
- Small files, minimal comments, strict TS; match surrounding style. Big entities grow via modules
  (e.g. `src/entities/behaviours/*`), not by bloating one file.
- **All text** via `gameText` (Kenney Pixel only renders crisply at multiples of 16px).
- **All gameplay timers** on the pause-safe `GameClock` (`player.now` / `clock.now`), never `scene.time.now`.
- Respect `feel.isLocked` / run-ending and player death: nothing deals damage, awards XP or spends items
  after a run ends.
- Respect the "reduce shake / flashes" setting (go through `feel`).
- Any new input must work on keyboard/mouse, gamepad and touch; latch key presses (`KeyLatch`) so taps
  aren't lost; menus use `MenuList` and ignore key repeat for purchases.
- **Save changes** bump the save version with a tolerant migration and migration tests; never lose data.
- **Assets:** copy from the Kenney pack / music pack only via `tools/copy-assets.ts`. Never modify Kenney's
  `tilemap_packed.png`; put extra art in generated sheets under `public/assets/extra/`.
- **Maps** are generated: change `tools/mapThemes.ts` / layout presets and run `npm run gen-maps`; map tests
  guard geometry. Never hand-edit `.tmj` files.
- **Balance:** keep `tests/balanceModel.test.ts` bands passing; tune via content/curves, not special cases.
- Debug hooks (`?debug=godmode`, `window.__game`, `window.__spawn`) must be gated on `import.meta.env.DEV`.
- Don't run git commands (the coordinator commits).

### Dev servers and browsers
- **Port 5173 is the user's dev server — never touch it.** Agents use 5174 / 5175 / 5176, start their own
  `npx vite --port <n> --strictPort`, and kill **only their own PID** (never kill node/vite broadly).
- Agents use their own Playwright browser context (isolated localStorage) and delete `.playwright-mcp`
  when done. Screenshots go to the session scratchpad, not the repo.

### Git
- `main` branch, remote `origin` (github.com/mikegoatly/samuelsgame). `.gitattributes` normalises to LF;
  CRLF warnings on Windows are expected and harmless.
- Commit messages end with the Co-Authored-By line from the current session's instructions.
