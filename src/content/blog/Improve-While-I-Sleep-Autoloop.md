---
title: "Improve While I Sleep: Autoloop, an Autonomous Claude Mesh That Never Touches Main"
date: 2026-07-08T04:00:00.000Z
---

# Improve While I Sleep

Point it at a git repo and walk away. A mesh of Claude subagents finds real work, fixes it on an isolated branch, adversarially verifies the fix, and stops for you to promote. It never runs `claude -p`, never spends into paid overage, and never touches `main` on its own.

That's the whole pitch for autoloop, and it's also the whole difficulty. Anyone can write a `while true` loop that asks an LLM to "improve the codebase." What you get back is a machine that hallucinates bugs, lands plausible-but-wrong changes onto your main branch, and — if you're on a metered plan — bills you three hundred dollars while you sleep. Autoloop is what's left after you spend a month killing every one of those failure modes with actual code. It's about 5,455 lines of engine, 16 test files, and 94 commits of hard-won paranoia. This is the long field note on how it works and, more usefully, on everything that went wrong on the way there.

Fair warning: this is a 60-minute read with real code in it. It's the deepest thing I've built this year, and it deserves the length. Grab coffee.

## The take, first

The two things that wreck a naive autonomous agent loop are **runaway cost** and **plausible-but-wrong changes landing unreviewed**. Every interesting design decision in autoloop is a dedicated organ for fighting one of those two enemies.

Cost is fenced by a spend guard that reads your Claude usage cache at the top of every iteration and freezes the instant paid overage appears — the prime directive, checked even on stale data. Correctness is fenced by a verification spine whose governing law is **green is not correct**: a change is `confirmed` only when the real test gate passes with no regressions, *and* an adversarial skeptic argues the change is genuinely valid, *and* the diff is lean, *and* there's a measured before/after delta. Everything the loop produces lands on reviewable `auto/*` branches in an isolated worktree. Your one job, the only thing a human must do, is promote to `main` in batches you've read.

Hold those two ideas — the guard and the spine — and the rest of this is commentary.

## The mental model

The unit of work is a **window**: one iteration, one `/loop` wake. The `/loop` skill re-fires the *same* prompt file every tick, so each window is a fresh Claude session with no memory of the last one. That's not a limitation I worked around; it's the design. Statelessness is what makes the thing robust — there's no long-lived context to rot, no conversation to drift. The only continuity is what's written to disk.

From the driver prompt itself:

> Each iteration is **stateless w.r.t. the conversation**. Do NOT rely on anything you "remember" from a prior tick — the repo + the `$AUTOLOOP_DIR/` files (handoff, iteration-log, dead-ends, value-ledger, immune-rules, GOALS) are the SOLE continuity. `handoff.md` is a **read-then-delete** baton: read it in step 2, `rm` it immediately (it is consumed), and write a fresh one in step 4.

A read-then-delete baton. Each window inherits exactly one handoff note from the last, consumes it, and writes a new one for the next. If a window crashes, the baton it already consumed is gone and the one it would have written never appears — so a crash can never leave a half-written instruction that a later window misreads as fresh. The continuity is deliberately thin because thin continuity is auditable.

A single window does this, in order: check the guard → sync the integration branch → run one mesh (which fans out subagents via the Workflow tool) → persist ledgers → check convergence → schedule the next wake. And the crucial part: **the delay between windows is the guard's decision, not the LLM's.** The model doesn't get to decide it's tired and sleep for an hour. The guard hands it an exact number and the driver uses it verbatim.

That's the skeleton. Now the organs.

## How a stateless loop remembers

If every window is a fresh session with no conversational memory, an obvious question falls out: how does the loop learn anything? How does it avoid re-proposing the fix it made an hour ago, or re-walking a dead end it already explored three times? The answer is a small set of plain-markdown ledgers in `.autoloop/`, and they are the *entire* memory of the system. No database, no vector store — just files a human can open and read.

- **`iteration-log.md`** — an append-only diary of every window: what it looked at, what it found, what landed. On claude-sync's own loop this file is 111 kilobytes. A fresh window orients itself by reading the tail: here's where the last few windows left off. It's slow-growing institutional memory in the most literal sense.
- **`dead-ends.md`** — every path that didn't pan out, each with an `attempts=N` counter. A window consults it *before* proposing anything, so the loop stops rediscovering the same non-fix. This is also what the bounded-persistence retry reads: a retryable failure with fewer than two attempts becomes the next window's primary objective, with the failure evidence embedded; a second failure parks the item on a human instead of grinding forever.
- **`value-ledger.md`** — the running tally of what actually shipped and confirmed. The loop's résumé.
- **`immune-rules.md`** — the antibody file, which deserves its own paragraph.

The **immune gate** is defense-in-depth against the loop wasting a window re-proposing something already killed. Immune rules and done-titles get injected into both deciding stages of the mesh *and* into the trial's evidence blocks, matched by symptom and root-cause. But — and this is a lesson the docs label IR-4 — antibodies are *tiered*. A **verified** antibody (a documented, confirmed dead end) hard-drops a matching candidate outright. An unverified or advisory one is only a *hint* — it gets weighed, but it can never on its own hard-drop a correct, gate-passing candidate. The reason is subtle and I got it wrong first: an over-eager antibody that hard-drops on mere resemblance will suppress a *genuine* fix that happens to look like a past failure. The immune system has to be able to tell "we proved this doesn't work" from "this pattern-matches something that once didn't work," because those are wildly different levels of evidence, and only the first earns a veto.

Notice the shape of all of this: the loop's memory is a pile of human-readable markdown, and every "smart" behavior — don't repeat yourself, back off after two tries, don't chase a known dead end — is a mechanical read of a file, not a thing the model is trusted to remember. Statelessness plus a few ledgers beats a long-lived context that quietly rots.

## The spend guard: never over-bill, full stop

`claude-guard.mjs` is 180 lines and it is the reason I can run this thing unattended and actually sleep. It's called at the top of every iteration and again before each expensive mesh phase. It returns one of three actions, and its own header says it best:

> `stop` — halt the loop entirely (MASTER off, STOP flag, converged, OR an extra_usage rise = we've spilled into paid money → freeze NOW)
> `idle` — don't spend this iteration; ScheduleWakeup to the window reset (5h or 7d ceiling hit).
> `go` — safe to run a bounded mesh window; includes live headroom

The whole model rests on one fact about Claude Max: you get an interactive 5-hour and 7-day usage window, and past it you *can* spill into paid extra-usage. So the guard reads `~/.claude/.usage-cache.json`, and it stays well under the ceilings on purpose:

```js
const DEFAULT_5H_CEILING = 85;
const DEFAULT_7D_CEILING = 90;
```

Eighty-five and ninety percent. Not a hundred. The gap is the safety margin — you never want to be the loop that pushed the window from 99% to 101% at 3am. Before it looks at any of that, though, it checks the three hard stops:

```js
if (control.MASTER !== 'ON') return { ...out, action: 'stop', reason: 'master_off' };
if (existsSync(path.join(autoloopDir, 'STOP'))) return { ...out, action: 'stop', reason: 'stop_flag' };
if (existsSync(path.join(autoloopDir, 'GOALS-MET.md'))) return { ...out, action: 'stop', reason: 'converged' };
```

`MASTER: OFF` in a control file, a `STOP` file you can `touch` from your normal checkout, or a `GOALS-MET.md` the loop wrote itself when it converged. Any of those and it halts. These live in the *main checkout's* `.autoloop/` directory, not in the loop's worktree, which is the entire point — you can kill the loop from the repo you're actually sitting in, instantly, without hunting down a tmux session.

Then the prime directive. This is the single most important safety line in the system, and I want you to read the comment as much as the code:

```js
// PRIME DIRECTIVE: any rise in paid extra-usage → freeze immediately. Checked
// even on stale data: if the last-known value ALREADY shows a rise, stop now.
const base = ensureBaseline(autoloopDir, cache);
if (typeof v.extra_usage_used_credits === 'number' && typeof base?.extra_usage_used_credits === 'number'
    && v.extra_usage_used_credits > base.extra_usage_used_credits) {
  return { ...out, action: 'stop', reason: 'overage_detected',
    delta_credits: v.extra_usage_used_credits - base.extra_usage_used_credits, telemetry: out.telemetry };
}
```

It snapshots a baseline of your paid credit usage when the loop arms. If that number ever rises — by a single credit — it freezes. Not "slows down," not "warns." Stops. And notice *checked even on stale data*: if the most recent reading it has, however old, already shows a rise, it doesn't wait for a fresh confirmation to stop spending. The bias is entirely one direction. A false "you're spending money" that halts a healthy loop costs me nothing but a restart. A missed real one costs me actual dollars. So it fails toward stopping.

### The stale-data war story, fixed in code

Here's where it gets subtle, and where I got burned. The usage endpoint rate-limits — `last_error: http_429` is sitting in my live cache *right now*, as I write this. And the fetcher that refreshes the cache had a bug: on a failed refresh it zeroed the `fetched_at` timestamp while preserving the last-known percentages. So "how old is this data" became unanswerable from the timestamp alone, and the loop once cheerfully believed it was at "7d 79%" — a stale number from a rate-limited read — and kept right on spending.

The fix is its own little clock:

```js
// FRESHNESS via OUR OWN last-good record. The fetcher zeroes fetched_at on any
// failed refresh (e.g. http_429) while preserving the prior pcts, so fetched_at
// can't measure true age. We persist every successful read to usage-last-good
// and measure age from THAT... Trusting stale numbers as live was the bug that let us claim
// "7d 79%" off a rate-limited cache. Fail-safe, in service of never-over-bill.
```

Every *successful* read gets written to `usage-last-good.json`, and freshness is measured from that, not from a field the fetcher can lie about. If it can't confirm the numbers are fresh, it doesn't spend — it idles and tries again later. Trading progress for safety, which is the correct trade every single time when the downside is a surprise bill.

When a ceiling *is* hit, it doesn't stop — it idles until the window resets, and it computes exactly how long that is:

```js
if (typeof v.seven_day_pct === 'number' && v.seven_day_pct >= c7) {
  return { ...out, action: 'idle', reason: `7d_window_tight(${v.seven_day_pct}%>=${c7})`,
    sleepSeconds: Math.max(300, secsUntil(v.seven_day_resets_at)), telemetry: out.telemetry };
}
```

Sleep until the seven-day window rolls over, then wake and resume. The loop parks itself against the calendar and comes back when there's headroom.

### Cadence is deterministic, not vibes

The last thing the guard does on a `go` is hand back the exact delay before the next window:

```js
// Authoritative next-window delay. The driver uses this VERBATIM — it is not
// a suggestion. While `go`, the window is by definition below both ceilings,
// so a dense cadence is safe: if it ever tightens, the very next evaluate()
// returns `idle` with sleepSeconds instead. This is what kills long idle gaps.
out.nextDelaySeconds = Math.max(30, Number(control.CADENCE_SECONDS ?? opts.cadenceSeconds ?? DEFAULT_CADENCE_SECONDS));
```

Default cadence is 120 seconds. And the driver prompt is blunt about who's in charge: *"Use the guard's number verbatim — never invent a longer delay."* I learned this the hard way too — an LLM asked to "schedule the next wake" will happily decide to sleep for twenty minutes for no reason, and your overnight loop does four windows instead of forty. Pacing is a numeric decision with real money attached. That's exactly the kind of decision you take away from the model and put in code.

## The verification spine: green is not correct

If the guard is the organ that fights runaway cost, the verification spine is the organ that fights plausible-but-wrong changes. And it starts from a claim that took me a while to fully believe, quoted here from the header of `confirm.mjs`:

> a patch that passes the bug's test is merely PLAUSIBLE; semantic correctness ("VALID") is a separate, strictly-lower number (78%→62% SAN, 25.6%→17.9% human). GREEN IS NOT CORRECT — so a window's change is only `confirmed` when the gate is green AND an adversarial skeptic asserts the change is genuinely VALID (semantically correct, tests meaningful) WITH a concrete rationale. A green gate alone (plausible) does not confirm.

Read that gap again: a patch that makes the failing test pass is *valid* only 62% of the time by an automated judge, and 18% of the time by a human. Passing the test is table stakes. It is not evidence the change is correct — the model could have written a test that passes for the wrong reason, or "fixed" the symptom by weakening an assertion. So a green gate, on its own, confirms nothing.

The `confirmed` boolean stacks three independent layers, and all three must hold.

**Layer one is the confirm predicate**, versions 1.1 through 1.4:

```js
export function isConfirmed(r = {}) {
  const { test, skeptic, fix } = r;
  const gateGreen = test?.ok === true;
  const passToPass = test?.passToPass === true;   // pre-existing suite stayed green
  const failToPass = test?.failToPass === true || (typeof test?.failToPass === 'string' && hasRationale(test.failToPass));  // new test red→green
  const valid = skeptic?.valid === true;
  const rationale = hasRationale(skeptic?.validityRationale);
  const delta = hasRationale(fix?.delta);         // measured improvement gate
  return gateGreen && passToPass && failToPass && valid && rationale && delta;
}
```

Six conjuncts. The gate is green (`gateGreen`). The pre-existing suite stayed green — you didn't fix one thing and break three (`passToPass`). There's a *new* test that went red-before, green-after, proving the change actually does something (`failToPass`). A skeptic asserted validity (`valid`) *with a rationale, not just a boolean* (`rationale`). And there's a measured delta — a concrete before/after improvement (`delta`). Miss any one and the change is not confirmed, which means it does not land.

**Layer two is leanness.** Correctness and bloat are different concerns, so they get composed separately: `confirmed = isConfirmed(...) && isLean(ponytail)`.

```js
export function isLean(p = {}) {
  return p?.lean === true && hasRationale(p?.leanRationale);
}
```

A Sonnet "ponytail reviewer" checks that the change is as small as it can be. A correct-but-bloated change — the classic LLM move of refactoring four unrelated files while fixing one bug — cannot land. It's correct, and it still fails the gate, because landing sprawl unreviewed is its own failure mode.

**Layer three is the interesting one: the verdict-on-trial.** Every advancing judgment in the system — "keep this candidate," "pick this one to execute," "yes this change is valid" — was originally a single model self-attesting. And a single read has a fatal property, described in `verdict-trial.mjs`:

> every seam it guards (audit keep, synth pick, skeptic valid) was a SINGLE model self-attesting an advancing verdict. A single read can only confirm its own first instinct; the plausible-but-wrong verdict survives. The trial makes the adversarial reads THE way the verdict is reached — they can SET the verdict, not just veto it — while a plurality fast-path keeps the cost down.

So each advancing verdict goes on trial: a snap call, a cheap challenge, then three *blind* prongs (defend it, prove it should advance, argue the hardest case that it shouldn't) that never see the snap's reasoning, then a strong blind-spot pass, then a plurality vote. The adversarial reads don't just veto — they *set* the verdict. Here's the decision:

```js
export function decideTrial({ snapVerdict, cracked = false, prongs = [], blindspotMissed = false, deadReads = false, safeVerdict }) {
  const dissent = (Array.isArray(prongs) ? prongs : []).filter((p) => p && p.clearedBar).map((p) => p.verdict);
  const votes = [snapVerdict, ...dissent];
  const winner = cracked ? null : plurality(votes);
  const contested = cracked || winner === null || blindspotMissed || deadReads;
  if (!contested) return { verdict: winner, contested: false };
  return { verdict: safeVerdict, contested: true };
}
```

Two details worth pausing on. First, `deadReads`: if one of the adversarial prongs *died* — a rate-limit outage, a crashed agent — the verdict is contested and falls to the safe outcome. A dead challenge is not a passed challenge. Treating a crashed skeptic as a silent yes is exactly how an outage rubber-stamps a bad change, so it fails closed.

Second, the cost asymmetry that keeps this affordable: the trial only ever runs on an *advancing* snap. If the snap says "drop it" or "abstain" or "invalid" — the conservative outcome — there's no trial, because a wrong NO is only opportunity cost while a wrong YES is expensive. You spend adversarial compute only where a mistake actually costs you. A clean dry window, where the loop finds nothing worth doing, is a *correct and valued* outcome, not a failure to be avoided.

### The hallucination war: verification, not amputation

This is my favorite story in the whole project because it's a lesson I had to learn twice, in the wrong direction first.

Cheap discovery scanners — Haiku, low effort — hallucinate. They'll confidently report a bug at `foo.ts:412` that doesn't exist, citing a function that was renamed a year ago. My first instinct was to amputate the risky behavior: no speculative bug-hunting, only work off an explicit checklist. Safe, right?

Here's what actually happened, from the architecture notes: a repo with green docs *"converged after four windows having hunted nothing — zero bugs sought, zero optimizations, tokens spent re-reading planning MDs."* The loop had been so thoroughly forbidden from looking for defects that it groomed a checklist, found the checklist done, and declared victory on a codebase it had never actually inspected for bugs. I'd traded hallucination for blindness. That's not a fix. That's a different failure wearing a safety vest.

The ruling, and it's the epistemic core of the entire system: **the cure for hallucination is verification, never amputation.** Keep the scanners wide. Then ground everything they say. The auditor now has teeth — from the actual discovery prompt:

> GROUND FIRST (mechanical, before any judgment): for each candidate, verify every file it cites actually exists in this repo (ls / test -f) and that the claimed code is really there (Read the lines). A candidate citing a nonexistent file, line, or symbol is keep=false immediately — scanner leaves are cheap and DO hallucinate; you are the first tooth against that.

A hallucinated citation gets refuted *mechanically* — the file isn't there, `ls` says so, done — no matter how plausible the prose around it was. And for genuine defect-hunting, the bar is an evidence contract:

> Find ONE real, demonstrable defect by READING the code at a hotspot... EVIDENCE CONTRACT (all required): (1) exact file+lines quoted from THIS repo, (2) the concrete failure scenario — what inputs/state make it misbehave and what a user/caller actually observes, (3) the reproducing test you will write; the gate is that test RED on current code → GREEN after the fix. If you cannot state who hits it and what breaks, it is NOT a bug — no textbook/defensive-coding hypotheticals, no style nits.

If you can't name who hits it and what breaks, it isn't a bug. That one sentence kills 90% of the "defensive coding" noise an LLM will generate if you let it. And the bug-hunt runs at a higher tier deliberately — Sonnet at high effort, because, as the commit says, *"haiku/low hunts are what hallucinated."* You keep discovery cheap and wide, but you spend real reasoning on the reading that has to be true.

## The mesh: fanning out without a metered API

The work itself happens in a mesh of subagents, and here's the trick that makes it billing-safe: it runs entirely *in-session* via the Workflow tool, never as a metered `claude -p` subprocess. Each `agent()` call is a subagent inside the same Max-window session; `parallel()` and `pipeline()` structure the fan-out. The Workflow sandbox is restricted — no filesystem, no Node API, and no `import` — which is why the two big workflow files carry inline *twins* of the confirm and verdict-trial logic, pinned equal to the canonical modules by drift-guard tests. Not elegant. Correct.

The flow is four phases:

```
//   Discover  : parallel Haiku leaves scan areas → pipeline Sonnet boolean-audit
//   Synthesize: Opus ranks survivors, picks ONE low-risk autonomous item
//   Execute   : Opus executor in an isolated worktree writes fix + tests, commits, pushes branch
//   Verify    : Sonnet tester summarizes gate result; Opus skeptic adversarially checks
```

The discovery fan-out is the heart of it — one cheap leaf per work-class, each `pipeline`d straight into a stricter Sonnet audit:

```js
phase('Discover')
const audited = await pipeline(
  CLASSES,
  (c) => agent(
    [
      `You are a read-only discovery leaf in an autonomous improvement loop for this repo.`,
      `Find up to 3 concrete improvements of EXACTLY this work-class:`,
      `  class "${c.key}": ${c.desc}`,
      `TARGET THE HOTSPOTS — the highest defect-density files (change-frequency × size)...`,
      HOTLIST,
      `Each candidate MUST be autonomous (code/tests/docs/deps — NO Apple, hardware, deploy, secrets, CI/.github, Dockerfile, tsconfig, vitest.config, package.json), low-risk, and have an OBJECTIVE VERIFICATION GATE it can pass: a test that goes red→green, a measurable coverage gain on a hotspot, or a build/lint that newly passes. If you cannot name the gate, do not propose it.`,
      `Do NOT propose anything already done:\n${DONE}`,
      `Avoid known dead-ends / honor these antibodies:\n${IMMUNE}`,
    ].join('\n'),
    { ...EP(c.key === 'bug-hunt' || c.key === 'perf-win' ? 'hunt' : 'scan'), phase: 'Discover', label: `scan:${c.key}`, schema: CAND },
  ),
  (found, c) => agent(
    [
      `You are a strict auditor for work-class "${c.key}". Candidates:`,
      JSON.stringify(found.candidates || []),
      `If you cannot confirm the verification gate, keep=false — ABSTAIN. A clean dry window is a CORRECT, valued outcome; reviewer attention is scarce, so NEVER pass a weak candidate just to keep volume up.`,
      `DECOMPOSE-BEFORE-KEEP: agents land simpler tasks far more reliably (arXiv:2410.12468). If the best candidate is an epic... keep instead its SMALLEST independently-verifiable sub-task.`,
    ].join('\n'),
    { ...EP('audit'), phase: 'Discover', label: `audit:${c.key}`, schema: VERDICT },
  ),
)
```

A few things I'd point at. Every candidate must name its own verification gate — *"if you cannot name the gate, do not propose it."* No gate, no candidate. The forbidden list is explicit: no touching Apple projects, hardware, deploy, secrets, CI, Dockerfiles, build configs. The autonomous zone is deliberately small and safe. And **decompose-before-keep** — if the best idea is an epic, the auditor keeps its smallest independently-verifiable sub-task instead, because agents land small tasks far more reliably than big ones. That's not a vibe; there's a paper number behind it, cited inline.

Which class wins when several survive? Not a blended score — a strict ladder:

```js
['signal-fix', 'bug-hunt', 'perf-win', 'mechanical', 'gated-test', 'devex', 'dep-hygiene', 'objective']
```

Lexicographic. The highest-priority class that has a survivor wins outright. A real signal-fix always beats a nice-to-have devex tweak, no matter how the numbers shake out. Ordered priorities beat weighted sums when the priorities genuinely dominate each other.

### Who's good at what: the effort policy

Every agent call spreads an `EP(role)` — an effort policy that pins a `{model, effort}` per role instead of letting everything inherit the driver's default. The baked defaults are the best "who's good at what" table I've got:

```js
export const DEFAULTS = {
  derived_at: '2026-07-05',
  source: 'baked: DeepSWE + FrontierCode via plan-router routing-table.md',
  roles: {
    scan:         { model: 'haiku',  effort: 'low' },    // pure pattern-match
    hunt:         { model: 'sonnet', effort: 'high' },   // reads code for real defects; cheap hunts hallucinate
    audit:        { model: 'sonnet', effort: 'medium' }, // sonnet is the floor for judgment
    trial_cheap:  { model: 'sonnet', effort: 'medium' },
    trial_strong: { model: 'opus',   effort: 'high' },
    synth:        { model: 'opus',   effort: 'high' },
    executor:     { model: 'opus',   effort: 'xhigh' },  // the one step worth top effort
    tester:       { model: 'sonnet', effort: 'low' },    // runs a gate, summarizes
    ponytail:     { model: 'sonnet', effort: 'low' },
    skeptic:      { model: 'opus',   effort: 'high' },
  },
};
```

Pattern-matching is Haiku on low. Judgment has a floor of Sonnet. The executor — the one step where a wrong move writes bad code — is the only role worth Opus at max effort. The economic principle behind the whole table: *the cost curve climbs faster than the correctness curve, so middle tiers win.* The pre-policy failure mode was every stage silently inheriting the driver's `xhigh` default, which meant Haiku pattern-scans were running at maximum reasoning — paying Opus prices for Haiku work. And the policy isn't a hardcode; when it goes stale (14 days), the driver re-derives it with a single web search over current benchmarks and writes it back. No scraper — *"leaderboard HTML is brittle, a model reading benchmarks is not."*

## Worktrees, the integration branch, and the trust model

Now the git architecture, which exists to solve two problems the first live run surfaced immediately:

> 1. **Rediscovery churn** — the loop re-finds and re-fixes the same issue because its fix lives on an unmerged branch, so a fresh scan of live `main` still sees it.
> 2. **Shared-tree contention** — the loop's driver running in the same working tree as the user's interactive sessions; concurrent commits move `HEAD` under it and `git` operations race.

The fix for contention is **worktree isolation**: the loop never runs in your `main` checkout. `start-loop.sh` creates a dedicated git worktree — `<repo>-loopwt` — on an integration branch, and launches the tmux Claude session there. Your interactive work on `main` and the loop's work never share a `HEAD` or an index. And the mesh executor nests *another* worktree inside that for per-agent isolation.

The fix for rediscovery is the **integration branch**. The loop works on `auto/<name>/integration`, which is `main` plus every confirmed-but-unmerged fix. Each window merges `main` down into it (absorbing your work and the device-sync autocommits), discovers against the *cumulative fixed* state, and merges confirmed feature branches up into it. So a fix made an hour ago is no longer a "live issue" to rediscover. Work compounds instead of churning.

And `main` stays a human gate. From the architecture doc, on why it never auto-merges:

> `main` is a deliberate human gate. The integration branch preserves it while removing the loop's bottleneck: the loop accumulates verified work so it never stalls or re-churns, and the human promotes to `main` in reviewed batches.

Your entire job is one command: review `auto/integration` at your leisure, then `git checkout main && git merge auto/integration`. The loop never stalls waiting for you, and you never wake up to unreviewed changes on your main branch. That's the trust model in one sentence — the machine proposes, verified and isolated; the human disposes, in batches.

### The 9.5-gigabyte leak

Isolation has a cost, and I paid it before I noticed. Every mesh executor spins up an `isolation:'worktree'` checkout, and the Workflow runtime does *not* reclaim it once the executor commits. So without cleanup, the loop leaks one full checkout of your repo per window. The historical peak, flagged in the feature-mode docs: **78 checkouts, 9.5 gigabytes.** An overnight run quietly ate ten gigs of disk in throwaway worktrees.

The fix is `reap-worktrees.mjs`, run every window by the driver and again as a crash-net by the external re-kicker. And there was a nastier sibling bug — INFRA-1, from July 6th: *only* the executor was getting an isolated worktree, but the auditor, skeptic, and ponytail agents also have Bash and Edit tools, and they were leaking ungated edits straight into the driver's integration worktree. The fix was to give *every* mesh agent a throwaway worktree, so a stray edit from an agent that was only supposed to be *reading* dies unmerged instead of contaminating the branch. "Isolate every agent, not just the one you thought could write" is a lesson this codebase learned the way it learns most things — after it went wrong.

## Concurrency: one account, many loops, one window

You can run autoloop on several projects at once — I've had loops on the emerald server, the Apple app, and claude-sync itself going simultaneously. Each is fully siloed: its own `.autoloop/` state, its own tmux session, its own `auto/<name>/*` branches. That parallel-loops shape is lifted from ralph-loop (more on ralph later).

But there's a catch ralph never had to deal with: all those loops share *one* Claude account window. The usage cache is aggregate, so every loop already sees the true combined usage and shares the ceilings fairly. The only real failure mode is the inter-read burst — N loops all read "room to go" in the same instant and all fire heavy iterations at once, overshooting together. That's what the arbiter bounds, and it does it with a lease, not by lowering ceilings:

```js
export function computeHeadroom(cache, c5, c7) {
  const f5 = typeof cache?.five_hour_pct === 'number' ? c5 - cache.five_hour_pct : Infinity;
  const f7 = typeof cache?.seven_day_pct === 'number' ? c7 - cache.seven_day_pct : Infinity;
  const h = Math.min(f5, f7);
  return Number.isFinite(h) ? h : 0;
}
export function computeAllowedParallel(headroom, estBurst = EST_BURST_PCT, maxParallel = MAX_PARALLEL) {
  if (!(headroom > 0)) return 0;
  return Math.max(0, Math.min(maxParallel, Math.floor(headroom / Math.max(0.0001, estBurst))));
}
```

Headroom is how far you are below the tighter ceiling; the number of heavy iterations allowed *at once* is `floor(headroom / estimated-burst-per-iteration)`, capped at four. With a 3% burst estimate, worst-case overshoot is bounded to 3% times the number of allowed slots. It's FIFO among waiters, and a crashed loop's lease frees on a TTL so it can't deadlock the fleet. And the fleet brake is the same prime directive, escalated: any loop that sees paid overage rise writes a `STOP-ALL` file, and every loop halts.

```js
if (stopAllTripped()) return { action: 'stop', reason: 'stop_all' };
if (fleetOverageRisen(cache)) { tripStopAll('overage_detected'); return { action: 'stop', reason: 'overage_detected_fleet' }; }
```

One loop noticing money is being spent stops all of them. That's the right blast radius when the downside is a bill.

There's a genuinely fiddly invariant hiding here that took a bug to find: the lease TTL (2400s) *must* be strictly greater than the iteration TTL (1800s). If a lease could expire and re-issue mid-window, you'd get more than N heavy iterations running at once and the whole bound would be defeated. Two timers that must stand in a strict inequality — miss the relationship and the safety property silently evaporates. This codebase is full of those, and they're all scar tissue.

### One window at a time

There's a smaller concurrency hazard that lives *inside* a single loop, not across the fleet. Remember that the in-session `ScheduleWakeup` timer and the external re-kicker can both fire — and if your scheduled wake and the rekicker's nudge land at the same moment, you get two mesh windows running at once against the same branch. That happened, and it cost about 700,000 tokens in a single duplicate burn before I caught it.

The fix is a single-flight lock in the global `~/.claude/autoloop/locks/` directory — global, because it has to be honored by both the in-session driver *and* the launchd rekick sweep, and under macOS TCC the rekicker can only read that global dir. The acquire is a create-exclusive dance:

```js
const tryExclusive = () => {
  try { writeFileSync(lockPath(name), payload, { flag: 'wx' }); return true; }
  catch (e) { if (e.code === 'EEXIST') return false; throw e; }
};
if (tryExclusive()) return true;
if (isRunning(name)) return false;             // live holder → busy
try { unlinkSync(lockPath(name)); } catch { }  // stale/scheduled residue → reclaim
return tryExclusive();                         // lost the reclaim race → busy (correct)
```

The `'wx'` flag is the whole trick — write, but fail if it exists, atomically at the filesystem level. If the lock is already held by a *live* process, you're busy: end the window silently, run nothing, don't even schedule a wake, because the holder owns continuity. If the lock is stale residue from a dead process, reclaim it — and if you lose the reclaim race to another waiter, you're busy again, which is the correct outcome. The driver prompt spells out the consequence bluntly: if the lock prints `busy`, *"end this wake silently: run NOTHING, do NOT ScheduleWakeup."* Two half-loops fighting over one branch is worse than one loop, so the loser doesn't sulk or retry — it just disappears and lets the winner drive.

## Self-improvement mode: the loop that edits its own engine

Here's where it gets a little vertiginous. Autoloop can run on *itself* — a self-improvement mode where the target repo is its own engine code. A loop that edits its own running code while it's running is the highest-runaway-risk thing in the whole design, and it gets two extra fences that a normal loop doesn't.

The first is `self-cap.mjs`, a code-enforced batch limit:

> A self-improving loop must not run open-ended — you gauge a SMALL batch of changes, then it HALTS for review before doing more. This is a CODE-enforced cap... when the cap is reached it writes a review report, trips STOP, and flips MASTER: OFF — so the loop stops even if the driver misbehaves (defense in depth).

Three confirmed improvements, or six windows, whichever comes first — then it stops itself and waits for a human. And it *fails closed* if it can't count:

```js
// FAIL CLOSED: if the baseline SHA is unreachable (rebase/gc/force-push), rev-list errors
// were swallowed to '0' and the cap silently disabled itself — the self-improver ran
// unbounded. An unaccountable batch stops instead.
if (!git(['rev-parse', '--verify', '--quiet', `${baseline}^{commit}`])) {
  out({ action: 'stop', reason: 'baseline_unreachable', ... });
}
```

That comment is another bruise. The cap counts confirmed commits since a baseline SHA; if that SHA became unreachable — a rebase, a gc — the count errored out, got swallowed to zero, and the cap silently disabled *itself*. A safety limit that turns off when it gets confused is worse than no limit, because you think you're protected. Now an uncountable batch stops instead of running free.

The second fence is `engine-gate.mjs`, the never-brick invariant. If the loop edits its own engine and the edit doesn't parse, the *next* window loads a broken engine and the loop bricks itself forever. So before any engine edit lands, it has to parse — but you can't just `node --check` a Workflow script, because those use top-level `await` and `return` that a plain syntax check false-fails. So it validates each file the way it's actually loaded:

```js
if (isWorkflowScript(src)) {
  // Parse the way the Workflow runtime wraps it: an async fn with the
  // sandbox globals in scope. `new Function` parses without executing.
  const body = src.replace(/^export\s+const\s+meta/m, 'const meta');
  new Function(`return (async function(${SANDBOX_GLOBALS.join(',')}){\n${body}\n})`);
} else {
  execFileSync('node', ['--check', f], { stdio: 'pipe' });
}
```

`new Function` parses the body without executing it, wrapped exactly the way the Workflow runtime wraps it. And it fails closed on an empty check set, because *"a gate that verifies nothing must not pass."* The loop has, in fact, reviewed and improved its own engine — one merge in the history reads *"269 gated loop commits; engine-gate resolved."* A machine grinding on its own source, fenced well enough that I let it.

## Staying alive across a closed laptop lid

One more organ, and it's the least glamorous and most necessary. The in-session `ScheduleWakeup` timer is reliable while the Mac is awake — but macOS *sleep* suspends it, and a missed wake never re-fires. So a loop that was napping when I closed the lid stays parked at its prompt forever. For a fire-and-forget system, "dies silently when the laptop sleeps" is disqualifying.

The fix is an external re-kicker: `rekick.mjs`, run every 180 seconds by a launchd agent. launchd coalesces a missed interval and runs it right after wake, which is the recovery path — the machine wakes, launchd fires the rekicker, the rekicker nudges the parked loop back into its cycle. And it's safe by construction:

> only sends input when the pane is POSITIVELY idle (no 'esc to interrupt'), so it can never inject text into a turn mid-flight.

It reads the tmux pane and only acts when the loop is provably idle. It also distinguishes three pane states, which is a distinction I only learned I needed after a bug: `busy` (a turn is running — leave it alone), `idle` (ready and empty — safe to replay the kickoff), and `stranded` (idle, but an unsubmitted prompt is sitting in the input box — a lost Enter). That middle failure — *"a keystroke is not a submission"* — is one of my favorites. A `tmux send-keys Enter` doesn't *guarantee* the prompt submitted; sometimes the Enter got eaten and the prompt just sat there, wedging the loop while looking perfectly healthy. The fix was to verify submission against the actual input line, and to teach the rekicker that a stranded prompt needs a gentle Enter, not a full kickoff replay.

There's a macOS tax buried in here too. A launchd-spawned process is denied read access to a project's `.autoloop/` under macOS TCC without Full Disk Access — so *all* the state the rekicker needs to see lives in `~/.claude/autoloop/`, which it can read, rather than in the project directory, which it can't. A whole chunk of the state layout exists to route around a sandboxing rule.

## Knowing when to stop

An autonomous loop that never stops is a bug, not a feature. At some point the repo is as good as this loop is going to make it, and the correct move is to converge — declare done, write a report, and halt. Getting *that* right is harder than it sounds, because "I couldn't find anything to do" and "I did the work" look identical from the outside, and an LLM asked "are we done?" will happily say yes to end the turn.

So convergence is a contract, not a judgment call. From the driver prompt:

> Convergence is a CONTRACT, not a vibe. Declare it ONLY when ALL THREE hold:
> 1. The last **two** windows were dry — and at least one of the two was `nothing_to_do` (candidate exhaustion). Back-to-back `trial_abstained`/`off_objective` rejections are the loop failing to pick well, NOT the work being done ... **Error windows count for NOTHING**: a thrown mesh error / failed worktree / aborted window leaves the dry count unchanged — an error is not evidence of convergence and must never fake it.

Two things there matter enormously. First, a dry window has to be *candidate exhaustion* — the loop genuinely found nothing to propose — not the loop repeatedly proposing junk that the trial rejects. Those feel similar and mean opposite things: one is "the work is done," the other is "the loop is bad at picking work." Second, and this is the one that bites: **error windows count for nothing.** A crashed mesh, a failed worktree checkout, an aborted window — none of those advance the dry count. Because the seductive failure is a loop that hits an error, calls the error a "dry window," hits another error, and declares victory on a codebase it never touched. An error is not evidence of anything except an error.

To keep convergence from being pure prose, there's a measured twin. `metrics.mjs` has every window append one JSONL line — a queryable record next to the human-readable ledgers — and it computes two numbers that matter: resolve-rate and cost-per-confirmed. A `trend` command emits a diminishing-returns signal — `green`, `flattening`, or `exhausted` — and the convergence check consults it as *supporting* evidence. Supporting, never deciding: the trend can suggest the loop is running out of high-value work, but it can't override the contract. Measured, not asserted; and the measurement informs the decision without replacing it.

When a loop does converge, its very last act is a gift to the human: a self-contained HTML run-report, built from its own ledgers, published via the Artifact tool, and linked at the top of `GOALS-MET.md`. You can set the voice per repo — `engineer` for the full ledger, `exec` for plain-language outcomes, `off` to skip it. After a night of work you get one page that says what changed and why, instead of a diff archaeology assignment.

And there's a beautiful little bug lurking in exactly this mechanism. `GOALS-MET.md` does double duty — it's the human's record of a converged run *and* it's the guard's hard-stop signal (`reason: converged`). That's correct *within* a run. But nothing reconciled it on the *next* launch, so a month-old convergence silently killed every future `start` until someone hand-moved the file out of the way. The fix reads like the war story it is:

```js
// A converged run leaves GOALS-MET.md, which the guard (claude-guard.mjs) reads
// as a PERMANENT terminal stop (`reason: converged`). That is correct WITHIN a
// run — but nothing reconciled it on the NEXT launch, so a month-old convergence
// silently killed every future `start` until someone hand-moved the file into an
// ad-hoc `archive-<date>-runN/` dir. That manual dance was the mess.
//
// Launching a run is explicit intent to supersede any prior convergence.
```

So `start` now owns the reconciliation: launching a run is treated as explicit intent to supersede any prior convergence, so it rolls the previous run's terminal artifacts into a single timestamped `history/` directory and clears the single-run locks a dead session left behind — but it never yanks a *live* session's lock, and it clears the deliberate `STOP` flag only when you're actually re-arming. A signal that means "stop" in one context and "this launch is stale" in another needs someone to decide which context it's in, and that someone is `start`, in code, not a human remembering to delete a file.

## The war stories, collected

Half of what makes this system what it is lives in the commit log, so here are the sharpest lessons in one place. Every one of these is a bug I shipped and then fixed.

**Split-brain (July 5).** A `stop`/`start` without an explicit `--project` defaulted the loop's home to the tooling repo, so a `STOP` meant for one project landed in the wrong one — it clobbered the claude-sync loop once. The fix: refuse to touch any `.autoloop` when the project is ambiguous; kill only the tmux session and tell the human to name the project. Two pieces of state that should have been one.

**Never trust stale usage data (May 31).** Covered above — the "7d 79% off a rate-limited cache" bug. The freshness gate with its own last-good clock.

**Grounded trials, not amputation (July 5).** Covered above, and the single best encapsulation of the whole worldview: the cure for hallucination is verification, never cutting off the ability to look.

**Orphan-kickoff GC (July 6).** A stopped loop's stale kickoff file could be replayed by the rekicker, resurrecting a loop I'd deliberately killed. Nothing quite like a dead process climbing out of its grave at 4am. The fix garbage-collects kickoff files whose loop is no longer registered.

**The arbiter's three-commit arc (May 31).** Added, then *removed* to keep the core purely siloed, then re-added as a cleanly separable add-on layer the guard calls once and skips entirely when disabled. The arc is the story: restraint about what belongs in the core versus what earns its place as an opt-in.

**Bounded persistence — the ralph adoption (July 6).** The owner challenge to myself was "we're missing value from the autoloop-vs-ralph divide," and it was right. Ralph's core virtue — persistent fresh-context retry with prior work durable on disk — was absent. A single bad executor roll discarded a whole window's discovery-audit-trial-synth spend. So I adopted three bounded, evidence-fed retries: an in-window executor retry (gate-red only, one attempt, the failure fed back as evidence), a cross-window attempts ledger that parks an item on the human after two failures, and a stop-hook continuity net. What I explicitly did *not* adopt was ralph's self-attested convergence — trials and gates stay the only authority that can confirm a change. Borrow the persistence, keep the spine.

**The phantom gate (July 4).** The old default verification gate pointed at a script path that existed nowhere in the live repos — so a driver that mis-keyed the gate argument got a *phantom* gate, and either every window failed or, worse, the tester quietly improvised an unaudited substitute gate and graded the work against it. A verification system whose verifier can be silently replaced by the thing being verified is not a verification system. The fix: no fallback gate, ever. A missing gate is a misconfiguration and surfaces as a hard red. The gate you can't find is not a gate you pass.

**The self-benchmark that clobbered its own target (July 5).** To measure whether the loop is actually any good, `eval-seed` reverts a known-good commit to manufacture a red→green target — fix the thing we know how to fix, see if the loop finds it. But a naive parent-checkout clobbered intervening edits, and reverting on a shared branch broke the entire test target when one revert removed a symbol another test referenced. The fix was surgical: `git apply -R --3way` on *only* the target commit's source hunks, one isolated branch per objective. Even the loop's report card had to be built carefully enough not to lie.

**The loop reviewing its own engine.** Not a bug, but the moment that still gives me pause: one merge in the history reads *"269 gated loop commits; engine-gate resolved."* That's the self-improvement loop having reviewed and improved its own engine across hundreds of commits, every one of them through the parse gate and the verification spine, none of them touching `main` without me. A machine grinding on its own source code, fenced tightly enough that I slept through it.

## What's honestly still fragile

I'd be violating the entire ethos of this thing if I pretended it were finished. The real limitations:

**It's Max-plan-only, by design.** The whole safety model reads `~/.claude/.usage-cache.json`. No Max, no guard, and the docs say plainly: *"do not run it."* There is no metered-API path, on purpose — a metered path is exactly the surface that produces surprise bills.

**It's full of macOS-isms.** The sleep-recovery rekicker is a launchd agent; Linux just does without it. The TCC constraint that forces state into `~/.claude/autoloop/` is a genuine architectural tax paid to Apple's sandbox.

**Hallucination is a permanent adversary, not a solved problem.** The grounded trials and evidence contracts are live defenses against a failure mode that keeps resurfacing. I litigated "keep scanners wide, verify hard" versus "amputate discovery" twice and I expect to litigate it again.

**There's a whole class of split-brain bugs.** They all share one root — two pieces of state that should be one, or two timers that must stand in a strict inequality. The lease TTL greater than the iteration TTL. A keystroke versus a submission. A loop's project versus the tooling repo. `fetched_at` versus true age. The codebase keeps re-learning "isolate every X," and I don't think that lesson is done teaching me.

**Feature mode trades the human gate for the skeptic.** There's a sibling mode that promotes straight to `main`, and it's only sound because each objective is pre-vetted and the adversarial skeptic is load-bearing — in its first live run it rejected a fabricated-schema feature, an inert never-called helper, and an arbitrary magic-number config. When the skeptic is the only thing between an agent and your main branch, you had better trust the skeptic.

## Where it sits in the ecosystem

Three pieces of infrastructure make autoloop possible, and it's worth naming what each contributes. `/loop` is the harness — it re-fires the driver prompt on a schedule inside a tmux session; autoloop supplies the prompt and scaffolding, `/loop` supplies the heartbeat. The Workflow tool is how the mesh fans out in-session subagents without ever shelling out to a metered `claude -p`; the sandbox's restrictions are why the confirm and trial logic exist as drift-pinned inline twins. And ralph-loop is the intellectual ancestor: the keyed-directory parallel-loops shape, the refuse-to-overwrite-without-force discipline, the human ask-and-park primitive reshaped so nothing ever blocks, and the bounded-persistence retry. Autoloop deliberately did *not* take ralph's self-attested convergence or its ungoverned iteration — here, the guard fronts every window and the trials are the only confirm authority.

## The honest summary

Autoloop is one thesis — *point it at a repo and it improves the code while you sleep* — defended against two enemies with real code. Cost dies at the spend guard, which freezes on the first paid credit and never trusts stale data. Wrong-but-plausible changes die at the verification spine, where green is not correct and every advancing verdict survives a blind adversarial trial or it doesn't land. Everything ships to `auto/*` branches you review; `main` stays yours.

I built most of it during paternity leave, in the strange margins of newborn time, which is fitting — the whole point of the thing is that it works while you're not watching. That's also the part I'd want you to sit with, past all the code. The hard problem was never getting an LLM to write a patch. The hard problem was building enough machinery around the LLM that I could *trust the patch I didn't watch it write* — that a change landing on a branch at 3am had cleared a gate, survived a skeptic, proved a red-to-green test, and stayed lean, all without me. The model is the easy part. The judgment you have to convert into code so the model can't skip it — that's the whole job. Ninety-four commits of it, and counting.

Cheers,
Chris
