# QA loop runbook

This is the process behind the phrase "run the QA loop" — established
2026-08-26 per Eric's explicit direction on how this should work. Read
this alongside `CLAUDE.md` (the standing rulebook this loop checks
against) and `docs/08-USABILITY-AUDIT-AND-ROADMAP.md` (Part 3 for
personas, Part 4 for the roadmap this loop should keep nudging forward).

## The loop, in one paragraph

Run the scripted checks (`tools/audit/run-full-qa.sh`), then do the
manual-judgment review these scripts can't do on their own (persona
walkthrough, soft-goals gut-check, interactive-feature playtesting).
Compile everything into a single findings summary and report it to
Eric — **do not fix, change, or commit anything found during a QA pass
without his explicit go-ahead on which items to act on.** Once he says
which findings to act on, implement those specific items using the
normal edit → verify → document → commit loop (see `CLAUDE.md`'s own QA
& self-review workflow for that half), then re-run this loop to confirm
the fix actually resolved the finding and didn't introduce a new one.

This is deliberately a **report-then-approve** loop, not an autonomous
fix-it loop. A QA pass surfacing "23 findings" and then silently fixing
all 23 is exactly the failure mode Eric is trying to avoid — he wants
visibility into what's found and a say in what's worth acting on before
anything changes, every time.

## When to run it

On demand only, right now — triggered by Eric asking for it directly
("run the QA loop," "do a QA pass," similar). There is no standing
schedule yet. If a recurring cadence gets set up later (e.g. via
Cowork's scheduled-tasks feature), it still reports findings only, per
the same approval gate above — automating *when* the loop runs doesn't
change *what* it's allowed to do without review.

## Step 1: scripted checks

```
bash tools/audit/setup.sh      # once per fresh environment
bash tools/audit/run-full-qa.sh
```

Runs, in one pass:

1. **Contrast audit** (`collect.js` + `analyze.py`) — pixel-verified
   WCAG AAA (7:1 normal text, 4.5:1 large text) against every real text
   node on every real page. See `tools/audit/README.md` for the method.
2. **Container-width consistency** (`width-check.js`) — flags any
   section whose rendered edges don't match the page's shared
   `.container`/`--safe-x` system (CLAUDE.md core rule 6), against the
   documented exception list (currently just `.hero-stage`).
3. **Console/error smoke test** (`console-check.js`) — loads every page,
   scrolls all the way through it, and fails on any console error,
   uncaught exception, or failed request.
4. **Screenshot capture** (`screenshot-all.js`) — every page at mobile
   (~390px), tablet (~800px), and desktop (~1400px), written to
   `tools/audit/out/screenshots/`, for step 2 below.

Findings land in `tools/audit/out/*.json` and the script's own stdout.
None of this writes to any site file — it only ever reads/measures.

## Step 2: manual-judgment review

These can't be fully scripted — they need real visual/contextual
judgment against the screenshots `run-full-qa.sh` just captured.

**Persona walkthrough.** Read `docs/08-USABILITY-AUDIT-AND-ROADMAP.md`
Part 3 (Jaden, Priya, Marcus, Devonte, Grace, Alex). For each persona,
look at the fresh screenshots (all 3 breakpoints, all 5 pages) and ask:
would this specific person, landing here today, run into friction,
confusion, or a missed opportunity to feel wowed/seen/accepted? Note
anything concrete and checkable — a specific line, a specific section —
not a vague vibe. This is the step that surfaces usability suggestions a
pixel-contrast script or a width-measurement script structurally cannot
find.

**Soft-goals gut-check.** CLAUDE.md core rule 9 and the "Soft goals"
section: does anything in the current screenshots read as *less*
wowed/seen/accepted than it should? Same bar as the persona walkthrough
but page-level rather than persona-level — e.g. a flourish that's
started fighting its own content, a section that's gone stale, copy that
reads as generic where something specific and real would land better.

**Interactive-feature playtesting.** CLAUDE.md core rule 7: the absence
of console errors (already checked in step 1) is not sufficient on its
own for anything playable/operable. Actually drive the hero mini-game
(`assets/js/techno-hero.js`) and the Plan-Your-Visit calendar
(`assets/js/calendar.js`) with simulated real input over several real
seconds — held keys, a full arrow-key navigation pass, tap/click — and
confirm the *behavior*, not just that nothing threw. There isn't a
checked-in script for this yet (each interactive feature is bespoke
enough that a shared harness hasn't been worth building); drive it
directly via Puppeteer the way earlier sessions did (see git history on
`assets/js/techno-hero.js` for a working example of the input-simulation
pattern), or note in the findings that this step was skipped and why.

**Keyboard accessibility spot-check.** CLAUDE.md core rule 8: for any
custom interactive element touched recently, confirm Tab reaches it (or
deliberately doesn't, per the `.game-list li`/`.review-card` roving/
opt-out pattern — see CLAUDE.md's "Keyboard accessibility" section),
that a focus ring is actually visible against this site's dark
backgrounds, and that Enter/Space/arrow keys behave as expected.

**Roadmap alignment check.** Skim `docs/08-USABILITY-AUDIT-AND-ROADMAP.md`
Part 4. Does anything found this pass touch or unblock a roadmap item?
Note it in the findings even if it's not being acted on this round, so
it doesn't get lost.

## Step 3: report findings

Present everything found — from both steps — as a single structured
summary, grouped so Eric can act on it quickly:

- **Rule violations** (objective — a script or an explicit CLAUDE.md
  rule flagged it): contrast failures, width-consistency drift, console
  errors, broken keyboard access.
- **Persona/usability suggestions** (judgment-based): what a specific
  persona would trip on, and why.
- **Soft-goals notes**: anything that reads as less wowed/seen/accepted
  than it should.
- **Roadmap-relevant items**: anything touching Part 4.

For each item: what it is, where (file/section/page), and — for rule
violations — what the fix would look like, without actually making the
change. Then stop and wait. Eric decides what's worth acting on this
round; nothing here is a queue that auto-drains.

## Step 4: act on what's approved

Once Eric says which findings to act on, treat each one as a normal
task: implement → verify against the specific rule(s) it touches →
document (CLAUDE.md for new standing rules, the roadmap doc's changelog
for what shipped) → commit → push, following `CLAUDE.md`'s own QA &
self-review workflow for that half of the loop. Then re-run
`tools/audit/run-full-qa.sh` (at minimum) to confirm the fix actually
resolved the finding and didn't introduce a new one, before considering
that round of the loop closed.

## The loop terminates every time — it never chains into another round on its own

Added 2026-08-28, per Eric's explicit instruction after the first real
run of this loop: **finishing Step 4 is not license to go find more
things and start Step 1 again unprompted.** Every complete cycle —
whether it ended in "nothing found," "found things, none approved," or
"fixed what was approved and re-verified" — ends with a check-in to
Eric, not a silent restart. That check-in should include real questions,
not just a status recap: what's still open and ambiguous, what a next
round could focus on, what decision only he can make (tone, priority,
scope, anything closer to a design call than a rule violation).

This applies just as much to a single request that implies "keep going"
(e.g. "see what else you notice," "keep digging") as it does to an
open-ended standing loop — treat that as "run one more focused pass,
then check in again," not as blanket permission to iterate
indefinitely. The failure mode this rule exists to prevent: a QA pass
that surfaces N findings, gets approval for one, fixes it, then treats
that as momentum to go looking for N+1 without Eric ever being asked
whether that's what he wants right now.
