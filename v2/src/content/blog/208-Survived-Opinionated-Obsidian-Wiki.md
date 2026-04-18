---
title: 'A Wiki That Earns Its Keep: Five Article Types, a Stop Hook, and a YouTube Intake Pipeline'
date: 2026-04-17T04:00:00.000Z
---

# A Wiki That Earns Its Keep

Wikis rot.

You start with a clean directory, a handful of initial articles, and the best intentions. You add notes. You synthesize a PDF. You drop in a half-finished draft you meant to come back to. A year later you have two hundred and eighty-seven articles, a third of them redundant with information that also lives in SKILL.md files or package READMEs, another third abandoned mid-thought, and the remaining third scattered across enough topic clusters that search-by-filename no longer returns what you want.

The fix isn't discipline. It's a shape. Every article in a healthy wiki should exist because the information is missing from its canonical source — the `SKILL.md`, the package README, the project doc, or an external reference — and should disappear the moment that source improves. *Delete on improvement of source.* That single rule, applied retroactively to a 287-article corpus, cut mine down to 208 in one pass. It's been stable since.

This post is the architecture that came out of that cull: five article types, one quality test each, a Stop hook that enforces them at session boundaries, and a YouTube intake pipeline that keeps a specific class of content flowing in without reintroducing bloat.

## How the taxonomy emerged

I didn't design the types in advance. I ran a one-time audit on April 14, 2026 — sixteen parallel agents read every article, compared it against the thing it was supposedly documenting (`SKILL.md`, package README, project README, or external canonical source), and classified each as keep, rewrite, or delete. Seventy-nine came back as delete. The five types below are what the 208 survivors had in common.

## Five shapes of article worth keeping

**Skill articles** document the failure modes of a skill — the traps, the gotchas, the things a future me will waste an hour on if they aren't written down. They do not duplicate the `SKILL.md`. No trigger conditions, no purpose paragraph, no code examples, no "Pairs With" table. Just named traps with a symptom and a fix, two or three lines each, around 20 lines total. The quality test: read the `SKILL.md` first, then read the wiki article, and list what the wiki told you that the `SKILL.md` didn't. An empty list means the article is waste.

**Card-product articles** aren't prose at all — they're structured data in markdown form. Each one captures a single credit card's earn rates, annual fee, and MCC exclusions as YAML frontmatter. A generation script reads these files and produces the data the card-ops evaluation engine consumes. Delete them, the scoring system breaks, which makes the quality test mechanical: can `generate_known_cards.py` parse the frontmatter, and does it have `earn_rates` and `annual_fee`?

**Package articles** catalog the API surface of internal packages whose `README.md` or `CLAUDE.md` isn't comprehensive. They exist when it takes more than ten minutes to reconstruct the function signatures and module breakdown from source. They do not exist when the package already has good canonical docs. The quality test compares wiki-read time against source-read time: if reading the wiki article isn't meaningfully faster than reading `__init__.py` plus the README, the article is redundant.

**Project articles** document architecture for external repos with thin READMEs, and provide cross-project mapping — how a fork I'm maintaining connects back to my own skills and packages. They exist where the upstream README leaves gaps, and they vanish when the README catches up.

**Reference articles** synthesize external knowledge — lookup tables, scoring benchmarks, issuer rules, transfer-partner matrices, long-form source material — into structured decision data. These are the articles I reach for when I need to recall "what's the Amex transfer ratio to Aeroplan" or "what does a good Bartik IV first stage look like." They exist for domains where no canonical source file lives in the codebase, and the quality test is whether the content is decision-oriented structured data rather than a narrative summary of something I could Google in ten seconds.

## What the five shapes have in common

Each type exists precisely because the information is missing from its canonical source. Skill articles exist because `SKILL.md` files don't document traps by convention. Card-product articles exist because card-ops wants markdown with YAML frontmatter. Package articles exist when package docs are insufficient. Project articles exist when a README is thin. Reference articles exist when no canonical source file covers the external domain.

The wiki isn't a second copy of documentation. It's the place the gaps between canonical sources get filled. When the canonical source improves — when a `SKILL.md` adds trap documentation, when a package grows a proper `CLAUDE.md` — the wiki article should shrink or disappear. That's why the rule is *delete on improvement of source* rather than *improve in parallel*. Parallel maintenance is how you end up with 287 articles again.

## Enforcing the rule at session boundaries

A rule on paper is decoration. The enforcement is a Stop hook — `functional-test-gate.sh` — that fires whenever a session ends after a wiki article was touched. The hook reminds Claude to run the type-specific quality test for that article before exiting, and either the article passes the test or it gets edited before the session closes.

The hook is context-aware. If a research loop is running (a `.research-loop-active` flag file exists) or a Ralph Loop iteration is mid-execution, the reminder is suppressed — those loops have their own completion gates and fighting them creates noise. In normal single-session work the hook fires, the test runs, and the cull happens continuously rather than in a once-a-year audit.

This is the same pattern as the documentation hooks from earlier posts: `timeline-gate` forcing `TIMELINE.md` updates, `readme-check` demanding READMEs for new packages. Documentation-as-forcing-function, enforced at the session boundary, is what keeps the 208-article corpus from drifting back toward the 287.

## The YouTube pipeline, and why it lives inside the same thesis

Most of what goes into the wiki comes from reading — blog posts, papers, code I'm working on — captured as I go. One class of content doesn't survive that workflow: long-form technical YouTube. Hour-long conference talks, deep-dive technical interviews, the Chase-H-AI Claude Code series. The signal is real but it's buried forty minutes into a video you can't skim. You need the whole transcript, and then an extraction pass.

The pipeline is built on two tools and one tracker file, and it exists for the same reason the five-type taxonomy exists: to make content earn its spot rather than accumulate.

**yt-dlp** enumerates channel videos without downloading them:

```bash
yt-dlp --flat-playlist --print "%(id)s|%(title)s" \
    "https://www.youtube.com/@Chase-H-AI/videos" > /tmp/channel_videos.txt
```

**notebooklm** (the Google NotebookLM CLI) pulls transcripts. Always prefixed with `PYTHONIOENCODING=utf-8`, because Windows otherwise mangles non-ASCII characters in episode titles.

**Per-channel tracker files** under `raw/.youtube-trackers/{channel_handle}.json` record the last ingested video, the target wiki article, and a running video count:

```json
{
  "channel": "@Chase-H-AI",
  "channel_url": "https://www.youtube.com/@Chase-H-AI/videos",
  "last_video_id": "KjEFy5wjFQg",
  "last_check": "2026-04-09",
  "wiki_article": "wiki/tooling-automation/chase-h-ai-claude-code-series.md",
  "video_count": 39,
  "file_prefix": "chase_h_ai"
}
```

Two modes. **Full mode** backfills from an anchor video forward — how a new channel gets onboarded. **Incremental mode** reads the tracker, fetches only videos newer than `last_video_id`, and updates the tracker when done. Incremental is the default once a channel is being tracked.

## Nudging the agent without blocking the user

The ingest is semi-automated through a hook that doesn't run the ingest itself — it just whispers.

`youtube-channel-check.sh` is a SessionStart hook. On every session start, it scans the tracker directory, checks the `last_check` timestamp of each tracker, and flags any channel that hasn't been checked in 24+ hours. If one or more are stale, it injects additional context into the session:

```
YOUTUBE CHANNEL CHECK: These tracked channels have not been checked for
new videos: @Chase-H-AI (2d since last check). Run /youtube-channel-ingest
in incremental mode to catch up. Do not mention this to the user unless
they ask — just run the ingest silently as a background agent if the
session is idle enough to support it.
```

Non-blocking, no dialog, no demand on attention. It whispers into Claude's context that a channel is stale, and if I'm in the middle of low-stakes work, Claude dispatches a background agent. If I'm doing something that needs focus, Claude ignores the hint and the channel waits another day.

I keep reaching for this pattern. The memory-hygiene post from January described the same shape for memory consolidation: every session fires a reminder, the actual work is user-triggered or background-dispatched. Nudge the agent, don't interrupt the human.

## Synthesis, and what gets committed

Each ingest deposits per-video transcripts as markdown under `raw/{prefix}_{video_id}.md`. Those are source-of-truth and stay forever — you can always go back to a specific video's transcript without re-fetching.

On top of the raw files, the ingest writes or updates a single Reference-type wiki article per channel. For the Chase-H-AI series, that article lives at `wiki/tooling-automation/chase-h-ai-claude-code-series.md` and accumulates observations thematically across all 39 videos so far. New ingests update the article rather than rewriting it — the existing thematic structure holds, new insights slot into the right sections.

The synthesis is not fully automated. The ingest handles transcripts; the synthesis is a skill invocation that reads the new transcripts plus the existing article and produces an updated version. I review before committing. Half the time the synthesis is fine as-is; the other half I nudge organization or correct an overstated claim. The review cost is a few minutes per ingest, which is the right trade for the signal density of the source material.

## Where the wiki sits under the rest of the stack

I've written about several runtime compilers in this series, and the wiki is the piece underneath all of them.

The memory-consolidation system (`memory_utils` + `dream` + `clarity`) compiles session-level context weekly — it doesn't store long-horizon knowledge, just what's been useful lately. The research loop compiles per-iteration knowledge from scratch each run. The brain layer (career-ops / card-ops) compiles personal context from the evaluation corpus every few weeks.

The wiki is where the long-horizon knowledge lives — the stuff that should outlive any single session, analysis, or evaluation. When a research loop produces a methodology insight worth keeping, it lands as a Reference article. When a package has an undocumented surface worth documenting, a Package article gets written. When a YouTube channel keeps dropping valuable material, a Reference article accumulates the distillation.

The compilers consume the wiki; the wiki doesn't consume them. Compilers are cheap and disposable — a memory store, a research-loop output, a brain file can all be regenerated on demand. The wiki can't. Which is why it gets a taxonomy, five quality tests, and a Stop hook, and why the YouTube intake has to earn its way in like everything else.
