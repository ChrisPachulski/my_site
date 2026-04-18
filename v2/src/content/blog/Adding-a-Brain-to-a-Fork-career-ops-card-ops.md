---
title: 'Adding a Brain to a Fork: career-ops, card-ops, and the Compiled-Context Pattern'
date: 2026-04-14T04:00:00.000Z
---

# Adding a Brain to a Fork

> **Quick note up front.** I'm happy where I am — this post isn't a soft launch of a job search. I forked [career-ops](https://github.com/santifer/career-ops) because watching a well-built multi-agent system do real work is genuinely fun, and the brain-layer addition was the kind of side project I can't help making. Same reason I built [card-ops](https://github.com/ChrisPachulski/card-ops) as a second application of the pattern. Same reason the next one on my list is `mortgage-ops` — my family is shopping for a house, and I'd rather have a structured AI-assisted evaluator in the loop than a spreadsheet and a gut feel. Game sees game, and I love seeing what AI can actually do when it's pointed at a real personal decision.

Two tools this post is about.

The first is [**career-ops**](https://github.com/santifer/career-ops), a multi-agent job-search pipeline built by [santifer](https://x.com/santifer). It ingests job descriptions, scores them against your CV, generates ATS-optimized PDFs, scans portals, and tracks an entire application pipeline in a single source of truth. It's a good piece of software. I forked it.

The second is **card-ops**, a credit-card evaluation and portfolio-optimization system I built from scratch that shamelessly copies career-ops's architecture. Different domain, same shape. Credit card offers in, scored report out; evaluate against your existing portfolio, track applications, reconcile statements against earn rates.

The reason they share this post is that they share a pattern that I think is the interesting part of both. Each tool, as-shipped or as-designed, reloaded a bunch of scattered context every time it ran an evaluation. Each tool got noticeably better once that context was compiled into a single file — a *brain*, to borrow the naming I've landed on — that the evaluator reads first and treats as ground truth.

This post is about the brain pattern: why it exists, what's in it, when to regenerate it, and what it teaches about composing AI-assisted tools on top of each other.

## Why I forked career-ops instead of building my own

A small aside up front: I am, by reflex, a builder rather than a forker. My default when I see a tool that's 80% of what I want is to build my own 100%. That default is usually wrong, and career-ops is the most explicit example I have of why.

santifer had already solved the hard parts. The Playwright portal scanner that handles Greenhouse, Ashby, Lever, Wellfound, and the long tail of careers pages. The six-block evaluation structure with explicit role summary, CV-match table, level strategy, comp research, customization plan, and interview prep. The ATS-optimized PDF generator with Space Grotesk and DM Sans as drop-in fonts. The batch-processing pipeline with `claude -p` workers running in parallel. The negotiation scripts. The STAR+R interview-story accumulator. The tracker reconciliation and integrity checks. All working. All tested. All well-factored.

I was going to rebuild that from scratch, in the shape of my internal tooling conventions, because that's what I do. I stopped myself. The marginal value of "my shape" over "santifer's shape" was close to zero; the cost of rebuilding would have been several weeks. Forking saved me the weeks and gave me a system that was better than what I would have written solo. That trade is the right one to make more often, and I'm documenting it here because I notice myself failing to make it more often than I should.

Credit where it's due. [santifer/career-ops](https://github.com/santifer/career-ops) is the real work. This post is about the one additional thing I put on top.

## The context-cost problem

The base system reads per-evaluation context from five places: `cv.md` (the candidate's CV), `modes/_shared.md` (scoring rules and card types), `modes/_profile.md` (personal preferences and overrides), `config/profile.yml` (structured profile data), and `modes/evaluate.md` (the evaluation workflow itself). For the first ten evaluations, that's fine. For the fortieth, the wear starts to show.

The wear is not that context is lost — it isn't, because every session loads it fresh. The wear is that the evaluator spends a nontrivial fraction of its conversation reconstructing who I am before it can reason about the role. I am the same person at evaluation forty as at evaluation ten. Loading the same identity, the same comp floor, the same archetype preferences, and the same proof-point catalog from five separate files on every run is a waste of the only resource that's genuinely scarce inside a Claude Code session: usable context.

The other wear is subtler and more interesting. As the evaluation corpus grows, patterns emerge. Some companies are consistently frozen. Some salary bands are realistic for my level, some aren't. Some proof points work reliably for one archetype and don't translate to another. That accumulated learning, extracted from forty or ninety evaluations, is cheaper for the evaluator to read once from a compiled summary than to re-derive by re-reading the whole corpus.

Both of these failure modes — scattered identity context and uncompiled meta-learning — point at the same fix. One file. Compiled. Read first.

## The brain, in six sections

The file lives at `career-ops-brain.md`. It has six sections, each with a specific job. I'll describe each in shape, not in content — mine is personal, yours would be different.

**1. Candidate identity.** Name, location, comp floor, walk-away number, exit narrative. The exit narrative is the one that pays off most in evaluations: a one-paragraph story explaining why the candidate is looking, what's missing in the current role, and what pattern of opportunities matches. The evaluator uses this to flag when a JD triggers the narrative's key words and when it doesn't.

**2. Proof points.** A metrics-only table: project name, hero metric, archetype relevance. No narrative, no storytelling — that goes in the evaluation output. The brain stores the facts. One row per project. Twelve rows is plenty; fifty is too many. Every evaluation will draw three to five of them depending on the role.

**3. Archetypes and framing.** The target role types, what each one is actually buying, and which proof points to cite for each. "Staff Analytics Engineer buys X; cite projects A, B, C. Head of Applied AI buys Y; cite projects D, E, F." This table is what lets the evaluator translate "this job says it wants someone who can X" into "here are the specific pieces of my history that are evidence of X."

**4. Scoring rules.** The weighted dimensions with specific thresholds, and the blocker-gate rules. Six dimensions with weights summing to 100%. Threshold bands per dimension ("at or above comp target = 5.0, 1-14% below = 4.0, 15-29% = 3.0, 30%+ = 2.0"). Blocker gates that cap the global score when hard gaps are present — credentials the candidate lacks, citizenship/clearance requirements, experience-year gaps below a threshold, domain lock-ins. These rules live here rather than in the evaluator's prompt because they evolve over time; writing them in the brain lets them be versioned with the rest of the compiled context.

**5. Evaluation format.** The exact block structure the output must follow. Letter-labeled blocks (A, B, C, D, E, F, G in my case). File-naming conventions for the evaluation reports. TSV columns for the pipeline tracker. A paragraph saying *deliver all blocks for every evaluation, no optional sections*. This section exists to prevent the evaluator from drifting into its own preferred output shape over time; tying the format to the brain keeps every evaluation structurally comparable.

**6. Current intelligence.** A live status table per target company: Active / Mixed / Frozen / Stale / Dead, with dates, comp ranges, and key signals. "Company X: Active, $Y-$Z comp range, recent layoff signal in [date]." "Company W: Stale, all postings churned, revisit in 90 days." This is the section that benefits most from periodic regeneration; it drifts fastest.

## Regenerating the brain

The brain is not handwritten from scratch. It is compiled from the evaluation corpus. The compilation is a separate pass that reads recent evaluations, extracts the emerging patterns, and updates the brain's sections accordingly. In practice, regeneration happens every twenty evaluations or so, triggered by me manually when I notice the current brain diverging from what the evaluations are actually surfacing.

The compile pass uses the same Claude Code surface the evaluator uses. It reads the last N evaluation reports, the current brain, and produces a diff-like update: add this proof point because three recent evaluations referenced it, change this company's status because its postings disappeared, shift this scoring threshold because the comp floor feedback has moved. The brain's revision history lives in the repo; looking at the delta between revision five and revision eight is itself useful — it's a compressed summary of what I've learned by running the evaluator.

The pattern generalizes. Any system whose ground-truth context evolves over time — personal profiles, company intelligence, market conditions, scoring thresholds — benefits from a compiled brain that lags the living data by weeks rather than rebuilding from zero per session.

## card-ops: the same shape, a different domain

After career-ops had been running for a while, I wanted something equivalent for evaluating credit card offers. The problem is structurally identical:

- A CV-like personal profile (credit score, income, existing cards, spending patterns).
- A scoring framework with weighted dimensions (welcome bonus value, earn-rate match to actual spending, annual fee vs. ongoing value, portfolio fit, application timing).
- A pipeline of offers to evaluate, with a tracker, dedup, reconciliation.
- Statement PDFs that need to be parsed to map actual spending to card earn rates.
- Reference docs that accumulate (issuer rules, points valuations, bonus strategies).

I built card-ops from scratch, deliberately, in the same shape as career-ops — `modes/`, `config/`, `data/`, `reports/`, `statements/`, `batch/`, `templates/`, `docs/`. Same architectural pattern. Same mjs-based pipeline scripts for merge and dedup. Same brain-first evaluator.

The brain for card-ops has the same six sections adapted to the domain:

1. **Applicant identity** — credit score range, income, citizenship/age gates, household structure.
2. **Proof points for the portfolio** — current cards, their earn rates, their anniversary dates, their sign-up dates (for 5/24 and Chase velocity rules).
3. **Archetypes and framing** — card types I target (travel, cashback, hotel-cobrand, business) and what each is optimizing for.
4. **Scoring rules** — the weighted dimensions specific to card evaluation (welcome-bonus value, earn-rate match, annual fee economics, churn rules).
5. **Evaluation format** — the same block structure, adapted to card evaluation.
6. **Current intelligence** — live card offers, their public/targeted bonuses, and issuer rule changes.

The card-ops brain isn't as long as the career-ops one, because the domain has less nuance, but it does the same thing. Claude reads the brain first. Every evaluation starts with "this is who you're evaluating for" rather than "read these six files and try to assemble a picture of the user."

I won't belabor card-ops further here; if you want to see the details, [the repo is public](https://github.com/ChrisPachulski/card-ops) and the README walks through the structure. The thing worth writing down is that the shape transferred. A pipeline pattern that worked for job evaluations worked for card evaluations. The brain layer, in particular, transferred without modification — same six sections, same "regenerate from the corpus" discipline, same compile-lag logic.

## The meta-insight: compiled context beats scattered context

The deeper takeaway from this pattern is about how we compose AI tools.

The default shape of a Claude Code integration is "point the agent at the right markdown files and let it figure things out." This works. It scales to a certain volume of work. Past that volume, the reconstruction cost starts to dominate. Every session re-reads the same files, re-derives the same understanding, re-climbs the same initial ramp.

A compiled brain changes the shape. Instead of *"figure me out from these five files each time,"* it becomes *"here is the already-figured-out version, go evaluate."* The agent's job shifts from inference-over-context to reasoning-over-compressed-context. The compression happens once per compilation cycle, not once per session. The quality of every evaluation goes up because the starting condition is richer.

This is why the pattern showed up in two different domains in my setup within a month of each other. Job evaluation and card evaluation look different on the surface. Both are *"evaluate an offer against my persistent context, score it, produce a structured report."* Both benefit from the persistent context being compiled rather than scattered. Both have ground-truth data that drifts slowly enough that a compile-and-regenerate-every-few-weeks rhythm is right.

I suspect this generalizes beyond the two tools I've built. Any repeated-evaluation workflow — code review against a style guide, RFP evaluation against selection criteria, partnership-deal evaluation against strategic fit — has the same shape. Compiled brain, read first, regenerate periodically. Pipeline underneath. Output structured.

## Credit and links

- career-ops upstream: [github.com/santifer/career-ops](https://github.com/santifer/career-ops) and the [case study](https://santifer.io/career-ops-system). My fork lives at [github.com/ChrisPachulski/career-ops](https://github.com/ChrisPachulski/career-ops) with the brain-layer README explaining what I added.
- card-ops: [github.com/ChrisPachulski/card-ops](https://github.com/ChrisPachulski/card-ops). Built from scratch in the career-ops shape because the pattern deserved a second application.

If you pull either repo, the thing worth stealing is the brain layer. Six sections. One file. Read first. Regenerate on a rhythm. Your evaluator becomes a better one the moment you stop making it reconstruct you every session.

## The one-line takeaway

Fork before you build. Compile your context into a brain file before you scale. Apply the pattern to a second domain before you convince yourself it only worked once. Three disciplines, three separate improvements in output quality, and they compose cleanly — which is how I ended up with two different evaluation tools that share a shape and a brain pattern, and a persistent reminder that the most useful engineering move in the AI-assisted era is often *compress what you already know so the agent can reason instead of reconstruct*.
