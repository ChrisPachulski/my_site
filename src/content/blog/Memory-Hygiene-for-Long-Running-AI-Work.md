---
title: 'Memory Hygiene for Long-Running AI Work: Anti-Stickiness, Dreams, and Plan Clarity'
date: 2026-01-13T05:00:00.000Z
---

# Memory Hygiene for Long-Running AI Work

Six months ago, my agent memory was broken, and I didn't know yet.

A Claude Code session would start, and within the first few queries, the same three memories would surface no matter what I asked about. "What's in my memory about Salesforce?" surfaced them. "What's in my memory about R?" surfaced them. "What's in my memory about the weather?" surfaced them. They weren't particularly useful memories. They weren't particularly relevant to the queries. They had just been surfaced often enough, in the early days of the memory store, that the access-count boost had pushed them to the top of every recall.

This is a known failure mode of naive "retrieve top-K by similarity + boost on access" systems. The feedback loop is: a memory gets surfaced, its access count goes up, its composite score goes up, it gets surfaced more. Once a memory crosses the threshold where its boost dominates its cosine similarity to the query, it becomes permanent furniture. The system stops learning. The memory store becomes a three-item archive of whatever got surfaced first.

This post is about the three-layer system I built to fix that. One layer is the memory substrate itself, a DuckDB-backed vector store with a scoring function that includes an anti-stickiness term. One layer is the consolidation process that runs periodically and prunes, merges, and rebalances. One layer is the plan-directory hygiene that applies the same discipline to markdown files that accumulate the way memories do. Together they've cut my memory store by more than half, the plan directory by more than 80%, and the subjective quality of my agent's recall up considerably.

The argument, short version: for long-running AI-assisted work, pruning is not a cost. It's a feature. You need it the same way gardens need it. Left untended, the weeds win.

## The problem, concretely

The memory store started as a flat directory of markdown files. Every time Claude learned something useful about how I work, what I was building, or how to debug a specific class of issue, it would write a new file under `memory/` with YAML frontmatter (name, type, description) and a body. A sidecar `MEMORY.md` indexed them all. At recall time, the index was loaded into context.

This worked until it didn't. The index grew. Loading the whole thing into context was cheap at twenty memories, expensive at a hundred, pathological at two hundred. Indexing became its own context-cost problem, and the flat file model ran out of room.

The fix was obvious in outline: replace the flat index with a vector store, embed the memory contents, score by similarity plus some relevance signals, retrieve top-K. That's `memory_utils`. The details are where the design gets interesting.

## memory_utils: the substrate

The store itself is a single DuckDB file at `~/.agent_memory/memory.duckdb`. DuckDB rather than SQLite for native vector support, a single file that survives OneDrive syncing quirks, and the ability to run proper analytical queries against the memory store when I want to audit what's in there.

Memories are typed. Four types:

- `user`, stable facts about me. Role, tool preferences, domains I work in.
- `feedback`, guidance I've given to Claude. "Don't do X, do Y." "When you see pattern P, prefer approach A."
- `project`, context about specific ongoing work. Which project, what's in flight, who's involved.
- `reference`, pointers to external resources. "The oncall runbook lives at X." "The design doc is at URL Y."

Each memory carries the full record:

```python
class MemoryRecord(TypedDict):
    memory_id: str
    name: str
    memory_type: str          # user/feedback/project/reference
    description: str
    content: str
    importance: float          # 0.0-1.0, initial estimate
    access_count: int          # times surfaced in search
    reinforced_count: int      # times user confirmed useful
    last_accessed: str | None
    last_reinforced_at: str | None
    created_at: str
    updated_at: str
    cooldown_until: str | None # snoozed until this timestamp
```

The embedding backend is dual. OpenAI's `text-embedding-3-small` when `OPENAI_API_KEY` is set; a TF-IDF fallback when it isn't. The TF-IDF path lives inside the package and zero-pads to 1536 dimensions (the OpenAI model's output size) so the schema doesn't have to change depending on which backend was used. This matters because I don't always have an API key available, scratch VMs, offline demos, airports, and losing the memory store because my local environment can't embed is a failure mode I refuse to accept.

## The composite score: five factors, one formula

Here's the scoring function:

```python
composite = cosine_sim
          * importance
          * exp(-lambda * age_days)
          * (1 + 0.1 * min(access_count, 10))
          * 0.95 ** max(stickiness_ratio - 3.0, 0)
```

Five multiplicative factors. Each one does a specific job, and each one has a default that I've tuned after about six months of real use.

**Factor 1: cosine similarity.** The dominant signal. If the memory doesn't embed near the query, nothing else matters. Similarity is clamped to non-negative, so a memory that's orthogonally opposed to the query can't go negative and gain importance through sign flipping.

**Factor 2: importance.** A manual prior in `[0, 1]`. Starts at 0.5 by default. Gets bumped up by the boost-active consolidation and down by the decay-stale one. It's the thumb on the scale for memories that the system should weight more or less than their embedding alone suggests, usually because I know something the embedding doesn't, like "this user-type memory is foundational context that should outweigh any particular project writeup."

**Factor 3: age decay.** Exponential, with a λ that varies by memory type:

```python
type_decay_overrides = {
    "user":      0.0005,  # half-life ~3.8 years
    "reference": 0.001,   # half-life ~1.9 years
    "feedback":  0.002,   # half-life ~11 months
    "project":   0.01,    # half-life ~70 days
}
```

This is the insight that made user memories actually useful. In a single-rate decay, user memories (who I am, what I prefer) were treated like project memories (what I was working on two months ago) and decayed on the same curve. That's wrong. A fact about me doesn't lose relevance in ninety days; a fact about a project often does. The decoupled rates let user memories outlive the project scope they were created in.

**Factor 4: access boost.** A small bump that caps out:

```python
access_boost = 1.0 + 0.1 * min(access_count, 10)
# caps at 2x when access_count >= 10
```

Frequently-retrieved memories do get a leg up, but only up to 2×. This is deliberate. A boost of 10× would drown out similarity entirely. A boost of 1.2× would be pointless noise. 2× is enough to tip a tied score, not enough to dominate.

**Factor 5: the anti-stickiness decay.** The clever one.

```python
if access_count < 5:
    unreinforced_decay = 1.0
else:
    stickiness_ratio = access_count / max(reinforced_count, 1)
    penalty = max(stickiness_ratio - 3.0, 0.0)
    unreinforced_decay = 0.95 ** min(penalty, 30.0)
```

A memory that has been accessed often but reinforced rarely is sticky. Stickiness is accessed-over-reinforced. If I've surfaced a memory ten times and only confirmed its usefulness twice, the stickiness ratio is 5, the memory is serving up five times more often than it's useful. The decay kicks in after stickiness passes 3 (a memory can be surfaced 3× per reinforcement and still be useful; at 4+, something's off), and penalizes geometrically (0.95^N) with a cap at 30 penalty units, 0.95^30 ≈ 0.21, a 79% reduction at worst.

This is the factor that breaks the positive feedback loop. Surfacing no longer gratuitously boosts future surfacing; if the user isn't engaging with the memory, it starts losing score. A memory with cosine similarity 0.7 to a query and importance 0.5 has a raw score of 0.35. If it's been surfaced 20 times but reinforced only twice, its stickiness penalty brings the composite down to roughly 0.07, it'll still surface if nothing better is available, but it won't dominate.

The `reinforced_count` field is populated explicitly. When the user confirms a memory was useful, "yes, use that", the `record_reinforcement` call bumps it. This requires the MCP memory tools to know when reinforcement has happened, which took some work at the integration layer. The payoff is that the score now reflects *useful surfacing*, not just *surfacing*.

## dream: six operations and a dry-run gate

`memory_utils` is the substrate. `dream` is the runtime process that keeps it healthy. The command lives in `~/.claude/commands/dream.md` and runs an agent that executes six operations in order.

```python
def consolidate(project_id=None):
    find_near_duplicates(threshold=0.92, project_id=project_id)
    decay_stale_memories(untouched_days=90, decay_factor=0.8, project_id=project_id)
    boost_active_memories(min_access_count=5, boost_factor=1.1, project_id=project_id)
    prune_irrelevant(importance_threshold=0.05, min_age_days=30, project_id=project_id)
    decay_unreinforced_memories(min_access_count=5, stickiness_threshold=5.0, decay_factor=0.9, project_id=project_id)
    auto_snooze_sticky(min_access_count=10, stickiness_threshold=8.0, snooze_days=30, project_id=project_id)
```

Every consolidation function supports `dry_run=True`, and the dream agent runs the full dry-run pass first, prints a summary, and only then executes. This is not optional. Consolidation operations delete and modify records; you want a human to see the proposed changes before they happen, every time.

The six operations, in plain language:

**`find_near_duplicates`.** Pairs of memories with cosine similarity ≥ 0.92 get surfaced for merging. Merging keeps the higher-importance one, transfers access and reinforcement counts from the other, and deletes the loser. The 0.92 threshold is tuned to catch near-duplicates (two phrasings of the same user preference) without catching genuinely-different-but-related memories (two separate feedback notes about testing).

**`decay_stale_memories`.** For non-user types: memories not accessed or reinforced in 90 days have their importance cut by 20%, with a floor of 0.01 so they don't vanish entirely. User-type memories get a gentler treatment: 180 days, 5% cut, floor 0.15. The gentler treatment reflects the lower decay rate: user facts shouldn't be evaluated on the same calendar.

**`boost_active_memories`.** Memories accessed at least 5 times get a 10% importance bump (capped at 1.0). Memories with stickiness > 5 are skipped: you don't want to boost a stuck memory. This operation makes the importance field reflect actual use, not just the initial prior.

**`prune_irrelevant`.** Memories with importance < 0.05 and age > 30 days are deleted outright. For user-type memories, the threshold is 0.02 and age is 365 days, because losing a user memory you stopped reinforcing is costlier than losing a project memory you forgot about.

**`decay_unreinforced_memories`.** Separate from the scoring-time anti-stickiness factor, this operation persistently reduces the importance of memories with stickiness > 5.0. The scoring-time factor penalizes them at recall; this one makes the penalty stick by lowering the stored importance, so the next consolidation has a smaller baseline to work with.

**`auto_snooze_sticky`.** The nuclear option. Memories with stickiness > 8.0 get hidden from search for 30 days via the `cooldown_until` field. This is for the worst offenders: memories that have proven actively harmful to the recall experience. After 30 days they come back; if they're still sticky after another round of surfacing, they get snoozed again.

The command takes an argument. No argument runs in project mode, scoped to the current project's `project_id`. `--all` runs system-wide, across every project, with special attention to cross-project duplicates. `--skip-files` skips a Phase 4 that also syncs file-based markdown memories into the vector store from `~/.claude/projects/{project_id}/memory/`. Useful when I want to consolidate the DuckDB store without also re-importing new markdown files.

I run `dream` about once a week in project mode, and `dream --all` about once a month. Both take under a minute on a memory store in the low thousands.

## clarity: the same discipline for plans

Memories aren't the only thing that accumulate in a Claude Code workflow. The plans directory at `~/.claude/plans/` fills up the same way: every planning pass produces a markdown file, most of those plans get executed and then forgotten, some of them turn into archaeology that nobody navigates.

`clarity` is an agent that applies the same classification-and-pruning discipline to plan files. Four classifications:

**Active**: modified today, or the current session's plan file. Never touched.

**Completed**: terminal markers present in restricted positions only. The restriction matters: naive scanning for "Done" or "Complete" anywhere in the file produces false positives everywhere, because those words appear constantly in checklists and progress notes. The restricted detection only checks the H1 line and the last non-empty line for specific terminal phrases: `COMPLETED`, `-- Complete`, `-- Done`, `No further planning`, `No code changes`, `No plan needed`, `finalized`. This single change eliminated about 40% of the mis-archivings I had in the first version.

**Stale**: beyond a size and time threshold (default 7 days, under 2 KB), not classified as completed. These are abandoned stubs: plans I opened, wrote a title for, and never came back to.

**Dormant**: beyond a longer time threshold (default 14 days), any size. These are plans I worked on, but that went cold.

Completed plans get archived. Stale stubs get safe-deleted. Dormant plans get reported but not touched: the human makes the call. Active plans are strictly off-limits.

There's one more pattern worth mentioning: **agent sub-plan collapsing**. Claude Code agents sometimes spawn their own sub-plans, and those get stored with names like `parent-plan-agent-subtask.md`. When the parent plan is classified as completed, the sub-plans should usually be collapsed into the parent's archive record rather than archived as separate artifacts. `clarity` handles this by checking the parent's classification, then inheriting it for agent-named sub-plans unless the sub-plan is independently active (modified today).

Before `clarity` existed, my `~/.claude/plans/` had 107 files. After the first full run, it had 23. After six months of periodic cleanup, it hovers around 18: active plans plus a small tail of recent work that'll eventually move through.

## What six months of running this taught me

Three specific lessons worth naming.

**The stickiness penalty is the most valuable single piece.** I didn't fully appreciate this when I designed the system. The age decay does useful work, the access boost does useful work, type-specific decay rates do useful work. But the anti-stickiness factor is the one that catches the class of failure most people with memory stores actually hit. Without it, I had five memories that had accumulated enough access to dominate every query. With it, those five got penalized, their importance was automatically trimmed by the consolidation, and two of them eventually got auto-snoozed. I wouldn't have caught any of them manually, because none of them looked "bad" in isolation. They were just being served too often for what they were worth.

**Dry-run-first is non-negotiable for consolidation operations.** Every operation that deletes, decays, or snoozes is destructive. Running them without seeing a preview is asking for lost data. Every consolidation function in `memory_utils.consolidate` takes `dry_run=True` as its default, and the `dream` command does a full dry-run report before asking the user whether to execute. The first time I ran a non-dry consolidation and saw a 30-day cooldown get applied to a memory I actually wanted surfaced, I added the gate. I've never regretted it.

**Pruning is emotional.** This one surprised me. There is a real psychological tug toward keeping things: a "what if I need that memory later?" reflex that's completely at odds with the system's actual utility. Every time I look at a dry-run preview that wants to delete 12 memories, some part of my brain wants to save them. None of them have mattered in ninety days. All of them are crowding out memories that do matter. But the pull to *archive* rather than *delete* is strong, and I've had to deliberately train myself to let pruning happen. If you build a system like this, expect to feel the same pull, and make the defaults aggressive enough that your emotional reaction doesn't undermine the design.

## Numbers, for what they're worth

Not a rigorous evaluation, I haven't set up a proper eval harness for memory-recall quality, but directionally:

- The memory store went from ~140 entries to ~60 over six months of running `dream` weekly.
- The plans directory went from 107 files to ~18 after the first `clarity` pass, and has stayed in that neighborhood since.
- Stickiness > 5.0 went from 8 offending memories at the start to 1-2 on most runs (the consolidation catches them before they accumulate).
- Subjectively, when I ask Claude "what do you know about X?" in a new session, the top 3 results feel relevant about 80% of the time, versus roughly 40% before the system was in place.

That last number is soft and I won't pretend otherwise. The right way to measure it would be to define a set of memory-recall queries, rate the top-K results on relevance, and compare before and after. I haven't done that. I have, however, stopped noticing the failure mode that motivated the whole exercise, which counts for something.

## The one-line takeaway

Pruning is a feature, not a cost. Every long-running AI workspace needs three layers: a substrate that *can* be pruned (vector store with per-memory scoring, including an anti-stickiness term), a process that *actually does* prune (consolidation with dry-run safety), and a discipline that applies the same thinking to everything else that accumulates (plans, in my case, but also chat logs, scratch files, whatever your particular workflow piles up). Get the substrate right, run the process on a schedule, and trust the defaults to be more aggressive than your archival instinct wants.
