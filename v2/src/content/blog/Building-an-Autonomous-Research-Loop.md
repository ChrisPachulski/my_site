---
title: 'Building an Autonomous Research Loop: The Stack, The Rationale, and What I Borrowed From Karpathy and Feynman'
date: 2026-01-27T05:00:00.000Z
---

# Building an Autonomous Research Loop

This is the longest post I've written, by a wide margin. Apologies in advance. The thing it describes took six weeks of iterative building, and I don't know how to shrink the explanation without losing the parts that make it actually work.

The short version: I built an autonomous research loop for econometric analysis that runs inside Claude Code. It takes an analysis script and a research question, iterates until a set of convergence criteria are met, calls out to a literature consultation skill that talks to my Zotero library, subjects every iteration's output to a referee-style audit with an adversarial devil's-advocate pass, and refuses to declare victory until a blind replication agent signs off. Around that core are a validator skill, a documentation-forcing hook system, a domain-agnostic generalization of the pattern, and — this is the part I'll keep coming back to — a small plugin called `cli-anything` that quietly made the whole literature piece possible.

When I started building this, neither Karpathy's AutoResearch nor Feynman had been published. Both came out while my version was already in use. I read both carefully when they landed, pulled the best ideas I could into my stack, and will call those out explicitly below. The point of this post isn't to pretend mine is better — it's to document what I built, why I built it the way I did, and how it has evolved as better published work has appeared.

There are three reasons I'm writing this up now.

First, the loop has stabilized. For the last week or two I haven't had to tune its core mechanics, only occasionally adjust its calling context. That's the moment to write a thing up — after it works and before you forget how it came to work.

Second, the stack has too many pieces to explain casually when someone asks me "what's this research loop thing I keep hearing you mention." Skills calling skills, agents spawning agents, hooks gating sessions, a package wrapping a CLI, a plugin wrapping a tool. This post is the document I want to be able to hand people.

Third, I think the general shape of the pattern is right, and I want it on record before the field converges on its own version and makes mine look obvious in retrospect.

## The problem it solves

Serious econometric analysis is iterative. You fit a model, read the residuals, notice something wrong, fix it, refit, notice something else, fix it, refit. Repeat. Anyone who has taken an applied econometrics class has done this; anyone who has done it for a living knows that the iteration cost compounds in two subtle ways.

**Cognitive exhaustion.** By iteration five, you are tired. By iteration ten, you are cutting corners. By iteration twenty, you are stopping at "good enough" on a specification you wouldn't have accepted fresh. The iteration cost isn't the minutes per iteration — it's the degradation of your own quality criteria over a long run. Any methodology that relies on a human maintaining identical standards across twenty iterations is a methodology that silently drifts.

**Confirmation bias.** The specification that produced the headline result, the one you'd hoped to find, is the specification you'll defend. Not because you're dishonest — because it's human. The robustness checks you choose are the ones that are likely to survive. The omitted variables you brainstorm are the ones that make your result look stronger. An adversarial pass after every iteration, in principle, is the fix; in practice, nobody does that to themselves consistently. Nobody has the energy.

The research loop exists to externalize both problems. The convergence criteria don't get tired. The devil's advocate pass runs every time. The blind replication agent hasn't seen the result it's replicating. The literature check happens whether or not I feel like digging through PDFs. None of the pieces are individually novel — most of them are the same things I was taught in methods classes, or versions of patterns the field has been reinventing for a decade. What's new, for me, is having them all wired together into a single loop that runs while I'm on a walk.

## The loop at a glance

The core orchestrator is a skill at `~/.claude/skills/research-loop/SKILL.md`. It doesn't run the loop — it generates a *prompt* that I hand to Ralph Loop, Claude Code's iteration runtime. The prompt tells Ralph what to do on each iteration, what to check before advancing, and when to declare convergence.

A single iteration is roughly:

1. Read the current state of the analysis script and the iteration log.
2. Identify the single weakest analytical link via a persistent Explore subagent.
3. Propose one change that addresses it.
4. Apply the change.
5. Re-run the analysis, capture coefficients and standard errors from the actual script output (not from memory, not from earlier text — from the live run).
6. Update the iteration log with what changed, what the numbers now are, and what the skeptic said.

At iteration 1, a `diagnostics` gate is mandatory: you cannot commit to an estimation method until a foundational diagnostic pass has classified the data, surfaced method-selection constraints, and documented them. This single rule prevents about half the mistakes that accumulate later.

At iteration 5, a parallel investigation gate fires: three independent agents run simultaneously. One proposes an alternative estimation strategy. One designs a falsification test. One constructs the strongest objection to the current approach. Their outputs are reconciled into the log, and the loop either adapts or moves on with the objection documented.

Starting around iteration 3 and roughly every two iterations thereafter, a `referee-report` skill pass audits the analysis across eight categories. Around iteration 6, a pre-convergence deep skeptic reviews the full iteration log for dropped concerns, verification gaps, and anchoring bias.

Convergence, when it happens, requires ten criteria to all be true. I'll get to those. First, the component parts.

## The skill layer: research-loop

The `research-loop` skill is a prompt factory. It takes a reference to a target analysis script and produces a ralph_prompt.md customized to that script. The customization comes from a small analysis pass (`analyze_script` in the research_loop package) that parses the script's section headers, identifies functions defined, surfaces data objects, and extracts the stated research question.

The generated prompt is large — it has to be, because it's the operating manual for many dozens of iterations. It contains:

- The research question, repeated verbatim at the top.
- The convergence criteria (ten of them, which I'll cover below).
- The iteration template: read-log → identify-weakness → propose → apply → rerun → log.
- The gate triggers and their thresholds (diagnostics at 1, parallel investigation at 5, referee every 2 from 3, deep skeptic at 6).
- References to the dependent skills — how to invoke them, what they expect, what they return.

The prompt is deliberately explicit. Ralph Loop's runtime executes whatever prompt it receives, and anything that's ambiguous in the prompt becomes ambiguous in the execution. "Run `/diagnostics` before committing to a method" works. "Make sure you've thought about diagnostics" does not.

The skill itself is small. The heavy lifting is in the prompt template plus the dependency skills it calls out to. Getting the prompt right took the full six weeks; the skill metadata took an afternoon.

## The skill layer: dependencies

The research-loop skill depends on five other skills, each of which is independently useful and could be written up on its own. Here they are in order of appearance in a typical loop.

**`diagnostics`.** The foundational gate. Reads the analysis script, detects the estimation method, and maps four tiers of required diagnostics: data understanding (Tier 0), method selection (Tier 1), specification validation (Tier 2), sensitivity (Tier 3). It then greps the script for evidence of each diagnostic — function calls, output statements, specific comments — and produces a compliance report listing PRESENT, ABSENT, and AMBIGUOUS diagnostics plus any sequencing violations.

The single rule that diagnostics enforces above all others: when both a fixed-differenced specification and a TWFE specification are present and give materially different results, a Wooldridge AR(1) test on the **TWFE level residuals** is the test that decides between them. Not the test on FD residuals — differencing mechanically induces negative AR(1) in residuals, so that test is non-informative. If both specs are present and no AR(1) test has been run on the TWFE levels, the diagnostics skill flags it as a MAJOR sequencing violation. That one rule has saved me from shipping the wrong estimator more times than I am comfortable admitting.

**`referee-report`.** An eight-category audit that runs as a three-phase pipeline. Phase 1 dispatches a triage subagent to read the project context, score literature sources for relevance, and produce a methods brief. Phase 2 launches `literature-reader` agents in parallel — one per qualifying source — to extract findings with page citations, then synthesizes their reviews across six themes (effect-size benchmarks, methodological assessment, identification threats, theoretical framing, gaps, source table) and runs two `devils-advocate` passes over the synthesis. Phase 3 reads the full script in 2,000-line chunks if it's long, audits across all eight categories, and produces a severity-rated report.

The eight categories are: identification and causal claims, effect-size plausibility, specification sensitivity, omitted-variable brainstorm, power and precision, missing diagnostics, data quality and pipeline integrity, and rhetoric versus evidence. The last category enforces the ASA's ATOM rules: no use of "statistically significant," continuous p-values not dichotomized, every point estimate paired with uncertainty, no conflation of correlation and causation. This has been, in practice, the most stable quality gate in the entire stack.

**`devils-advocate`.** Structured adversarial review across eight attack angles: identification threats, external validity, effect-size versus precision, omitted literature, citation accuracy, alternative explanations, logical leaps, framing bias. Each challenge gets a verdict — sustained, noted, or dismissed — and the response gets revised with inline `[revised]` markers so the delta is visible.

Devils-advocate runs in two modes. Standalone, it dispatches two parallel subagents — one verifies citations against full PDFs, one scans the inventory for uncited-but-relevant sources. Pipeline mode, inside the referee-report Phase 2 subagent where the Agent tool isn't available, it works from already-read material. The two-mode split was necessary because sub-agents inside sub-agents hit limits; the pipeline mode is the degraded-but-functional path.

**`literature-consultation`.** This is the skill that does the library work. I'm going to give this one its own section below, because its implementation depends on Zotero, and the Zotero side of the story is where the `cli-anything` plugin enters.

**`statistical-reporting`.** The ASA ATOM rules as a skill. Referenced by the referee-report's Phase 3 Category 8 audit. Short, declarative, opinionated. "Never say statistically significant." "Never asterisks." "Always pair estimates with uncertainty." "Interpret through effect size and practical importance, not through dichotomization." The skill exists partly as a reusable reference and partly so that when Claude is about to write something that violates an ATOM rule, there's an authority to point back to.

## The agent layer

Two agents are spawned directly by the research loop's skill machinery. Both are deliberately isolated.

**`literature-reader`.** A parallel PDF extraction agent. Dispatched by `literature-consultation` (Step 3) and `referee-report` (Step 2). Each instance reads 4-6 assigned PDFs per batch, extracts to a fixed output format (key findings, benchmarks, identification concerns, theoretical framework, caveats, bottom line) with page citations, and returns structured markdown. The instances run in parallel, not serially, which is what makes a literature pass over 15 sources take minutes rather than hours.

**`blind-analyst`.** The structural hero of the validator. Dispatched by `research-loop-validator` in Phase 2. Receives the research question and data dictionary only — no access to the existing script, no iteration log, no results. Its tool access is restricted at the agent-definition level to exclude Python file reading. Produces a seven-section independent plan: identification strategy, primary specification, diagnostic sequencing, 10+ robustness specifications, 5+ ranked identification threats, alternative estimation strategies, confidence criteria.

The comparison between what the blind analyst proposes and what the loop actually ran is the validator's most useful output. If the blind analyst independently proposes the same identification strategy and a similar robustness set, the convergence is real. If the blind analyst proposes something materially different, the loop needs to address why — either it considered and rejected the blind analyst's path (in which case the rejection should be documented) or it never considered that path (in which case the convergence is fragile).

The isolation is enforced through tool restrictions, not just instructions. Telling an agent "don't read the script" and then giving it read access to the script is a guarantee it reads the script. Removing the tool is the only enforcement that works.

## The Zotero detour (and how cli-anything made it possible)

The literature piece is where this stack earns its weight. An econometric result is worth roughly nothing until you've compared it to published work. Does the elasticity you just estimated fall inside the range in the published literature? If not, what's the reason? If so, whose estimates does it sit closest to, and what identification strategy did they use? These questions are answerable only if your workflow can reach your library programmatically, and historically that's been the step where every analytical pipeline I've seen breaks down.

Zotero is a fine reference manager. Zotero has a fine API. Zotero does not have a production-quality CLI, which is the step between "I have an API" and "my Claude Code skill can call it without me setting up a Python environment from scratch."

This is where `cli-anything` enters. `cli-anything` is a plugin that wraps arbitrary open-source projects into production CLIs. Its methodology is a seven-phase pipeline — source acquisition, codebase analysis, CLI architecture design, Click-based implementation with REPL and `--json` output, test planning, test implementation, PyPI publishing — producing a namespace-packaged CLI in a standard shape. The output for any wrapped project lives under `cli-anything/<software>/`, exposes `cli-anything-<software>` as a console entry point, and follows a uniform SOP for how an agent should call it.

I ran `cli-anything` on Zotero. Out came `zotero_cli`, a 1,500-line harness organized into six phases: configuration (env-var or `~/.zotero_cli.json`), core API, search (keyword, author, by-method), export (BibTeX, RIS, CSL-JSON), methodology tagging (a 12-category taxonomy covering synthetic control, IV, DiD, RDD, panel data, event study, propensity score, Bayesian, ML, meta-analysis, survival analysis, time series), and management (CRUD, collections, attachments, PDF import).

That harness is what `literature-consultation` actually depends on. When the skill acquires a web-discovered PDF, it splits the file into 20-page parts for indexing, saves them locally, appends to an inventory manifest, and then — if `ZOTERO_API_KEY` and `ZOTERO_LIBRARY_ID` are set — registers the document in Zotero: `create_client`, dedupe via `search_items`, `create_item`, `import_pdf` per part, `auto_tag_item` against the methodology taxonomy. The graceful-degradation path matters: if the env vars aren't set, the skill skips Zotero registration but still produces the synthesis. The library is a nice-to-have, not a requirement.

The reason `cli-anything` matters for this post is that without it, the literature piece would be either (a) a Python script I'd have to maintain by hand every time Zotero changed its API, or (b) absent entirely. `cli-anything` turned "write a Zotero CLI from scratch" into "run a plugin." That's the difference between the literature step existing and not existing. I've since run `cli-anything` on several other tools — DBeaver, Gephi, QGIS, Quarto, Tableau — and the pattern generalizes. Any open-source tool with an API or a stable UI can be wrapped this way. Most of them should be.

## The hooks: documentation as a forcing function

The research loop produces a lot of output, iteration by iteration. Log entries, referee reports, diagnostic reports, literature syntheses. The question is how to make sure that output gets captured before the cognitive haze of iteration thirteen makes you forget what iteration ten concluded.

The answer is hooks. Two of them, specifically, running at the session boundary.

**`timeline-gate.sh`** is a Stop hook. It fires when Claude attempts to exit the session. It checks whether any work was done today — any commits since midnight local, any uncommitted changes to tracked files — and then checks whether `TIMELINE.md` was modified today. If work was done and the timeline wasn't updated, the hook blocks the stop with a system message that reads, in part: "session has changes but no timeline entry today. You MUST add today's entry to TIMELINE.md before stopping."

**`readme-check.sh`** is a PreToolUse hook on `git commit`. It scans the staged file list; for every staged directory matching `projects/*` or `libs/*`, it requires a README.md to either already exist or be staged alongside the changes. Commits without README coverage get blocked with a message naming the specific directory that needs documentation.

Together, these two hooks enforce an invariant that the research loop by itself cannot enforce: work done in a session that isn't documented doesn't leave the session. You can't commit a new project without a README explaining what it is. You can't close a day of work without a timeline entry summarizing it. The research loop produces the work; the hooks make sure the work gets written down before you stop thinking about it.

There's a subtler third hook — `timeline-reminder.sh`, a non-blocking UserPromptSubmit hook throttled once per hour — that surfaces a gentle nudge if the timeline hasn't been updated that session. It's a suggestion rather than a wall. The wall is the Stop hook. The suggestion exists so the wall doesn't have to do all the work.

When I said at the top of this post that the hook and the research loop work in beautiful synchronicity, this is what I meant. The loop runs for hours. The loop produces knowledge. The hooks force the knowledge into a human-readable shape before the session can end. No iteration's findings get lost. No new project escapes without a README. The invariants are enforced at the hook layer so the loop doesn't have to enforce them itself.

## Convergence: ten criteria and a skeptic

The loop doesn't stop when it runs out of ideas. It stops when ten criteria are simultaneously true:

1. At least five iterations have been completed.
2. Every referee-report finding has been either resolved or explicitly documented as out-of-scope.
3. The headline numbers — primary coefficient, primary standard error, N — have been stable across the last two iterations.
4. Literature saturation: every referee-flagged literature gap has been either filled or documented as unfillable.
5. Output grounding: every coefficient and standard error quoted in the synthesis has been pulled from the most recent live script run, not remembered or summarized.
6. The parallel investigation gate at iteration 5 has fired and its outputs have been reconciled.
7. The pre-convergence deep skeptic has fired and every sustained challenge has been addressed.
8. The diagnostics compliance report shows no ABSENT Tier 0 or Tier 1 items.
9. At least one sensitivity specification (Tier 3) has been run and logged.
10. The skeptic's most recent pass cleared — no major flag raised in the last iteration.

If any of those are false, the loop continues. If all ten are true, the loop declares convergence and exits with a synthesis. A declared convergence does not mean the analysis is correct. It means the process has run to completion. The difference matters.

## research_loop: making it callable

The `research_loop` Python package is the thin CLI wrapper that turns "invoke this skill and generate a prompt" into "run a single command and get a runnable artifact." It exports a console entry point:

```bash
research-loop go path/to/analysis_script.py
```

The `go` subcommand runs preflight checks (Python version, expected section headers in the script, presence of required files), invokes `analyze_script` to parse the target, fills the prompt template via `generate_prompt`, and prints the resulting `ralph_prompt.md` for a human to review before handing it to Ralph Loop.

The package is small — under 1,000 lines — and deliberately thin. The intelligence is in the prompt template; the package is a shell that reduces friction. The one thing it does well is the preflight: it refuses to generate a prompt if the target script is missing the `###############` section headers the skill expects, because a prompt generated against an unparseable script will produce an iteration loop that thrashes on cosmetic issues rather than analytical ones.

## The validator: catching what the loop missed

Every research loop run is followed, after convergence, by a `research-loop-validator` pass. This is a separate skill, a separate invocation, and — importantly — a separate author in spirit. The validator's job is to assume the loop got things wrong and then try to prove it.

Three phases, run in parallel:

**Phase 1: assumption extraction.** A subagent reads the iteration log and the final script, and extracts every identifying assumption, every functional-form choice, every statistical assumption, every sample-selection decision, and every diagnostic-sequencing choice. The output is a table with a blank `YOUR JUSTIFICATION` column next to each assumption. Blank columns are the point. An assumption with no written justification is an assumption that hasn't been reviewed. The document is designed so that anyone reading it immediately knows what still needs human attention.

**Phase 2: blind replication.** The `blind-analyst` agent, with its tool restrictions, designs an independent analysis plan from the research question and data dictionary. A comparison table ranks the blind agent's proposals against what the loop actually did. Where they diverge, the validator flags the divergence for human review.

**Phase 3: counter-narrative construction.** A subagent takes each headline finding and constructs 2-4 alternative interpretations — same numbers, different causal story. Each alternative gets a fragility rating (LOW, MEDIUM, HIGH). A HIGH rating means the alternative interpretation is hard to distinguish from the loop's preferred interpretation; LOW means the alternative is ruled out by the data.

All three phases run at the same time. Their outputs are reconciled into a single audit document. A loop output with a validator audit attached is an analysis I trust. A loop output without one is an analysis I'd still revise.

## The agnostic-research-loop: generalizing the pattern

Somewhere around week four, I noticed that the research loop was solving a general problem, not an econometric one. The general problem is: *iterate on an artifact toward a quality rubric, with convergence criteria, until the rubric is satisfied and a skeptic has cleared the result*. The artifact could be an analysis script; it could also be a prompt, a config, a methodology document, code in any language. The machinery — rubric, iteration, skeptic, convergence — is the same.

`agnostic-research-loop` is the generalization. It takes an artifact target and produces the same shape of iterative improvement loop, but with three material differences from the econometric version.

**A domain-specific quality rubric instead of fixed convergence criteria.** Step 1 of the agnostic loop asks the user to build a 5-7 dimension rubric scored 1-5 on each dimension. Convergence requires all dimensions scoring 4 or higher for two consecutive iterations. The rubric is the whole game — a bad rubric produces a bad convergence. Examples: for a CLI wrapper, dimensions might be API-completeness, error-handling, test-coverage, documentation, performance, ergonomics, cross-platform. For a methodology document: clarity, actionability, completeness, internal-consistency, compliance with external standards.

**Team-based iteration instead of single-agent iteration.** Each iteration dispatches a small team in parallel: three researchers with different research angles, one drafter, and one live skeptic who challenges the design while it's being drafted rather than after. The team's outputs are reconciled into a single artifact modification per iteration.

**Verification labels, not just citations.** Every change introduced in an iteration gets labeled: `VERIFIED` (tested), `SYNTAX-CHECKED` (ran through the appropriate parser), `WEB-CONFIRMED` (validated against current documentation), `CONTEXT7-SOURCED` (pulled from context7 library docs), or `INFERRED` (reasoning from training knowledge, unverified). `INFERRED` changes trigger mandatory skeptic verification before the iteration can close. Web-research results must include dates; sources more than 12 months old are flagged `STALE`.

The agnostic loop also has a deep-skeptic pre-convergence step that fires once and reviews the full iteration log for dropped concerns, verification gaps, and anchoring bias. This is the same pattern as the econometric loop's pre-convergence deep skeptic, but stricter — the agnostic version has a specific checklist of anti-patterns to scan for.

I use the agnostic loop now for writing things. This post went through one. Several of my Claude skills have been through one. It is a different kind of tool from the econometric loop — slower per iteration, lighter on domain mechanics, heavier on rubric design — and the two coexist in my workflow without either replacing the other.

## What I borrowed from Karpathy and Feynman

When I started building the research loop, neither Karpathy's AutoResearch nor Feynman had been published. I was working from first principles and from the econometrics methods literature — specifically the research-transparency work, the DiD-method wars of the last five years, and a long-running personal frustration with the iteration-fatigue problem described earlier.

Karpathy's AutoResearch came out while I was in the middle of rewriting the referee-report skill. I read it carefully. The core pattern was recognizable — iterative improvement with skeptical passes — but the specific mechanisms were cleaner than mine in a few places. The parallel-team iteration pattern in the agnostic-research-loop owes a clear debt to that work. So does the verification-label discipline: I had been doing something similar informally, but seeing it laid out as a formal taxonomy in Karpathy's writeup pushed me to codify the labels and enforce them as a verification protocol rather than a convention. I made no attempt to mimic the entire system. What I pulled were the bits that solved problems I was already having.

Feynman came later, after the loop was substantially in place. I pulled less directly from Feynman than I did from Karpathy, mostly because the econometric core of my loop was already mature by the time Feynman landed. Where Feynman influenced my work was in the validator layer — the structural separation between the loop and the audit, and specifically the choice to enforce isolation through tool restrictions rather than prompt instructions. The blind-analyst agent's tool whitelist is a direct response to reading Feynman's framing of audit isolation and realizing my earlier instruction-only isolation was insufficient.

The things I still haven't borrowed, for what it's worth: neither system's approach to long-horizon memory feels right for my workload — I use a separate memory consolidation pipeline (see my previous post) that's integrated with Claude Code's MCP memory server rather than built into the loop itself. I also haven't adopted either system's evaluation harness. I don't have rigorous offline evals for my loop's outputs; the quality measurement is through the validator and through use, not through a benchmark suite. That's a gap.

## Six weeks in

Things I expected to be hard that were easy:

- Skill composition. Once the ralph_prompt.md template stabilized, adding new skills to the dependency graph was cheap. Each one slotted in with a few lines in the prompt.
- The Zotero integration. `cli-anything` turned what I'd feared would be a two-week integration into an overnight one.
- Hook design. `timeline-gate` and `readme-check` are short shell scripts. The work was in deciding to write them, not in writing them.

Things I expected to be easy that were hard:

- The convergence criteria. Getting from "stop when it feels done" to ten criteria that actually capture "done" took longer than I will admit in a public post. Early versions stopped too early; a period of overcorrection stopped never; the current set is a tuned middle ground.
- The adversarial passes. Every iteration of devils-advocate is a small negotiation between "challenging enough to catch real problems" and "challenging enough that the loop never converges because every analysis has at least one angle of attack." The severity taxonomy (sustained / noted / dismissed) is the knob that made this tractable.
- The blind-analyst isolation. Telling an agent not to read a file and then leaving read access open to that file is not isolation. Tool restriction is. The lesson cost me several wasted loops before it landed.

Things I would do differently:

- I would write the agnostic-research-loop first and derive the econometric version from it, rather than the other way around. The general pattern is cleaner; it would have saved me a chunk of duplicated effort.
- I would integrate offline evaluation from day one. The lack of a benchmark suite is the single biggest gap in the stack and the hardest one to close retroactively.
- I would build the documentation hooks before the loop, not after. The number of iteration logs I've had to reconstruct from memory because the hooks weren't in place yet is higher than zero.

## The one-line takeaway

An autonomous research loop doesn't replace judgment — it externalizes the parts of judgment that human iteration reliably degrades. Build a core loop with convergence criteria. Build dependency skills that enforce discipline the loop couldn't enforce on itself. Isolate the validator structurally, not just by instruction. Wrap the tools the skills depend on — Zotero, in my case — so their integration is a dependency rather than a chore. Gate documentation with hooks so the loop's output becomes a record. Accept that each published system (Karpathy's AutoResearch, Feynman) will teach you something; borrow the parts you need and keep building. Six weeks of this has produced an analysis workflow I trust more than my own unassisted one, which is not a claim I would have believed before I built it.
