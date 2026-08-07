---
title: 'The Docs Said Yes, the Code Said No: Building Evergreen as a Reflex, Not a Scanner'
date: 2026-06-24T04:00:00.000Z
---

# The Docs Said Yes, the Code Said No

Your README was true the day you wrote it. Then a flag got renamed, a file moved, a function started returning something else — and the docs stayed exactly where they were. That's how documentation lies. Not by being wrong when written. By being left behind.

I built a thing to catch that, and the first version was wrong in an instructive way. I spent a full day writing a real documentation scanner — parsers, tests, the works — and then deleted all of it the same day, because I'd built the wrong kind of thing. What replaced it is 213 lines of bash and a prompt. This is the field note on Evergreen, and on the lesson that the model *is* the engine, so stop building the engine.

## The take, first

Evergreen is a reflex, not a tool. When an AI coding agent touches your code, Evergreen makes it re-read the affected docs against the source and surface only what it can *prove* has gone false — pointing at the exact line that makes the doc wrong. It rewrites nothing on its own. It doesn't nag about style. It has one creed, and everything else falls out of it: **prove it or drop it.**

If it can't cite the code that makes a doc claim false, it isn't a finding. A checker that cries wolf gets muted, so this one never cries wolf. That constraint — the refusal to flag anything it can't nail to a line — is the whole design. Most doc-linters fail because they're annoying. Evergreen's entire architecture is organized around not being annoying.

The tagline I kept coming back to: *the docs said yes, the code said no, and only one of them gets to be true.* Code is truth. The doc is the claim under test.

## The great deletion

Let me get the embarrassing part out of the way, because it's the most useful thing in here.

Day one — a Wednesday in late June — I built Evergreen as a deterministic bash engine. And I mean I *built* it. The scanner, `bin/evergreen-scan`, was 679 lines. It had an 868-line test suite that reached 72 tests. It had doc-comment coverage parsers for four languages — Python through the `ast` module, JS and TS through `deno doc`, Go through `go/ast`, Rust through `syn`. It emitted SARIF. It kept a JSONL audit log. It computed a freshness score, maintained SHA-pinned source-to-doc manifests, printed coverage badges, and shipped a `--fix-prose` engine with three deterministic gates in front of the LLM so it couldn't hallucinate a fix.

It was, by any normal measure, a real piece of software. And I ripped every line of it out the same day, in a commit titled — I'm quoting it exactly — *"pivot: evergreen is a SKILL, not a scanner — delete the deterministic engine, tests, CI, parsers."* The diff was 238 insertions and 2,189 deletions across 16 files. The 679-line scanner: gone. The 868-line test suite: gone.

Here's why, and it's written into the design doc so I don't forget it: I had surveyed a few hundred documentation-drift tools to learn how they work, and then I built the *infrastructure* those tools use — the parsers, the manifests, the coverage math — when the goal was to mine their *ideas* for a prompt. I'd copied the machinery when I should have stolen the insights.

Because the thing consuming Evergreen isn't a CI runner that needs a parser. It's a language model that already has `read`, `grep`, and `diff`, and can reason about whether prose matches code better than any AST-walker I could write. The intelligence was already sitting there in the agent. Building a parser to feed it was like installing a second engine in a car that already runs. So I deleted the car's second engine and kept the map.

That's the lesson I'd hand anyone building agent tooling right now: **do not rebuild the model's own capabilities in bash.** Figure out the smallest amount of scaffolding that points the model's existing intelligence at the right thing, and write only that. For Evergreen, "only that" turned out to be about 213 lines.

## The freshness ladder

The central idea is a ladder the agent walks when code changes, cheapest rung first, stopping at the first thing that catches:

1. **A doc names a file that's gone?** Grep for it, confirm it vanished, flag it. (A vanished path — pure mechanical fact.)
2. **A documented flag, env var, or route that no longer exists?** Grep the code, flag it. (A dead contract.)
3. **A shown code snippet that's drifted from the source?** Read both, compare. (A drifted snippet or signature.)
4. **Does the prose still tell the truth?** Only *then*, when the cheap checks pass, spend the expensive semantic reasoning.

The framing that makes this work: code is truth, the doc is the claim under test. A doc that promises something the code doesn't deliver is a failure. Code that does something the doc never mentions is merely *informational* — it's not drift, it's just undocumented. Evergreen only cares about docs that over-promise. That asymmetry is deliberate, and it's a place I disagree out loud with the peer tool in the space (which flags "code does more than the doc says" as an inconsistency). By my creed that's not a lie, so I don't flag it, and the benchmark reports those pairs separately instead of letting my "miss" on them drag down the score. Name the disagreement, don't hide it.

One subtlety that earns its keep: before calling a contract dead, Evergreen checks the diff for a *rename.* If `--workers` became `--concurrency` in the same change, that's a reconcile, not a vanished flag — the doc needs updating, but nothing is broken. That exact false positive is baked into the eval as a decoy, so the tool gets scored on not tripping over it.

## The hooks are supposed to be dumb

The whole plugin is four bash hooks, 213 lines total, and the most important design rule about them is that **none of them ever read or analyze doc content.** That's the model's job. The hooks just point it.

- **activate** (38 lines) runs at session start and injects a condensed 40-line digest of the skill — about a third of the tokens of the full version — so every session knows the reflex exists without paying for the whole manual up front. The full skill loads on demand.
- **mode-tracker** (41 lines) is the *sole* writer of the intensity state. It watches your prompt for "set evergreen to strict," ignores negated requests like "don't stop evergreen," and writes `off`, `light`, or `strict` to a per-repo file. One writer means one place state can change, which means no races.
- **stop** (52 lines) fires after a turn, notices "you changed code in a repo that has docs," and nudges the agent to run the pass. It does no analysis itself — it's a reminder with four git guards in front of it, not a detector.
- **guard** (82 lines) is the only hook that can *block* a commit. Before a `git commit`, it inspects the staged set and refuses secrets (`.env`, `*.pem`, `id_rsa`), OS cruft, AI-slop reports (those `AUDIT-SOMETHING.md` and `*_SUMMARY.md` files agents love to leave lying around), and build artifacts. There's an escape hatch, because a guard with no override is a guard you rip out in a rage at the worst possible moment.

Default mode is `light` — it walks rungs 1 through 3, the mechanical stuff. `strict` adds the semantic rung-4 reasoning pass. You turn it up when you're doing something where stale docs would actually hurt, and leave it quiet otherwise.

## Putting the verdict on trial

Rungs 1 and 2 are mechanical — a grep either finds the flag or it doesn't, and that's not a judgment call, so it ships straight through. But rungs 3 and 4 involve the model deciding whether prose is *still true*, and a model's first instinct on a judgment call is exactly where cry-wolf lives. So those verdicts go on trial before they count:

1. **Snap call** — the first-instinct verdict, stated with its reasoning. But it's a vote, not the verdict.
2. **Challenge** — argue the hardest case that the snap is *wrong*, whichever way it leaned.
3. **Three independent blind reads** — three separate looks that never see the snap or each other. Blindness is the entire point. A reviewer who's already seen the first verdict can only rubber-stamp it.
4. **Blind-spot pass** — one more look asking "what did everyone miss?" It raises concerns; it never decides.
5. **Decide by weighing, not veto** — and a tie counts *against* the flag, because the default has to be silence.

Mechanical facts skip all of this. You don't put a grep result on trial. But a "this paragraph no longer describes what the function does" verdict has to survive the trial to reach you. The same harness is reused verbatim when Evergreen certifies a doc rewrite as done, or decides a file is slop worth deleting — one adversarial engine, three jobs.

There's also a rung-4 move I'm fond of for claims that reading can't settle. If a doc says "retries three times" or "returns empty on a miss," Evergreen (in strict mode) writes the smallest test that claim implies and *runs it*. Fails, and the drift is proven by execution, not opinion. Passes, and the claim is certified. Won't compile, and it's inconclusive — never reported as drift. That test is scratch: shown to you, never committed. It's the one rung that executes; every other rung only reads.

## The benchmark, and killing my own perfect score

Here's where I have to be careful, because this is the part where it would be easy to lie by omission.

At one point Evergreen reported 1.00 precision and 1.00 recall. A perfect score. And I wrote a whole planning doc titled *"kill the vanity 1.00,"* explaining with citations why that number was garbage and could not be the headline. Two reasons, both quantified. First, it was measured on 14 test pairs I wrote *myself* — an exam I set for myself and then aced, which compares to nothing because nobody else takes it. Second, balanced test sets inflate precision massively: a peer tool in the literature shows precision collapsing from 0.88 on a balanced set to 0.39 on the natural 10-to-90 drift ratio you'd actually see in a real repo. A perfect score on a self-made balanced exam is not a result. It's a mirror.

So I threw it out and re-ran on a real external corpus — 332 validated Python pairs, 9 genuine drifts hiding among 323 true claims. The honest numbers:

- **Recall 0.89** — it caught 8 of the 9 real drifts.
- **Specificity 0.95** — of 323 true docs, it stayed quiet on 307 and false-flagged 16. That's the cry-wolf rate, and it's the number I actually care about.
- **Precision** depends entirely on how common drift is, so I report it at three prevalence levels instead of cherry-picking: 0.33 on the raw corpus, 0.57 at a 10/90 ratio, 0.89 balanced.

And the line I made myself write: at the matched flag rate, the peer tool DocPrism hits 0.62 precision and Evergreen hits **0.57.** It trails. I could have found a slice where mine looks better and led with that. Instead the benchmark leads with the confusion matrix and states the loss flatly, because a documentation-honesty tool that fudges its own numbers is a joke that isn't funny.

I'll add the limitations without being asked, because that's the point. Precision here rests on just 9 positives, which makes it the soft, noisy axis — recall and specificity are the solid ground. The multi-language numbers (TypeScript, Rust, Go all around 0.8) were measured on an older version of the judge and are explicitly marked *unproven* on the current one. My inter-annotator agreement is a Fleiss' kappa of 0.660, below the 0.8 I wanted, reported with the caveat that the annotators were all LLMs. None of that is buried. It's in the README.

Every idea in Evergreen was mined from a survey of 309 real repositories — 79 of them with zero stars, the clever-but-unknown longtail — and every borrowed idea is credited inline to the repo it came from. The "sticky staleness" rule that editing a doc for a typo must *not* reset its freshness (only a check against code clears it), the insight that rot lives in old comments rather than new lines so you read the file at HEAD instead of just the diff — those aren't mine, and the docs say whose they are. I even evaluated staleness-by-age and *rejected* it: age is a weak proxy, and Evergreen only flags what it can prove against the code.

## The tool caught itself lying, twice

Two more that I enjoy.

Early on, Evergreen maintained its *own* README from source, to prove it could self-maintain — and in the very same commit it caught two stale claims in its own docs: a comment saying "4 signals" when the code had 6, and a README line saying "two gates" when there were three. The tool's first real catch was itself.

And the guard hook, the one that blocks commits containing slop, had a beautiful bug: when you make a commit that *removes* slop, those slop files show up in the staged set — as deletions. So the guard was blocking the cleanup commits it existed to encourage. The fix was one flag to exclude staged deletions, and the code comment is appropriately sheepish about it: *without this it blocks the exact deletions it exists to enforce.*

## Where it lives

Evergreen ships three ways, because I didn't want it locked to one agent. It's a Claude Code plugin you add from a marketplace. It's a paste-anywhere `SKILL.md` you can drop into any project. And it's a flat-prose `AGENTS.md` ruleset that Codex, Copilot, Gemini, or anything that reads `AGENTS.md` will pick up. There's also a GitHub Action that runs the pass on the docs a PR's code touched and posts findings as a single upserted comment — comment-only, guarded so a hiccup can never fail your build.

The whole thing is about nine days of work, 114 commits, 18 pull requests. Most of that was not writing code. Most of it was deleting code, killing a flattering number, and arguing with myself about whether a verdict was actually true. Which, now that I write it down, is exactly what the tool does. Prove it or drop it. I just had to do it to myself first.

Cheers,
Chris
