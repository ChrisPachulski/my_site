---
title: '208 Survived: An Opinionated Obsidian Wiki and the YouTube Pipeline That Feeds It'
date: 2026-04-28T04:00:00.000Z
---

# 208 Survived

Wikis rot.

You start with a clean directory, a handful of initial articles, and the best intentions. You add notes. You synthesize a PDF. You drop in a half-finished draft you meant to come back to. A year later you have two hundred and eighty-seven articles, a third of them redundant with information that also lives in SKILL.md files or package READMEs, another third abandoned mid-thought, and the remaining third scattered across enough topic clusters that search-by-filename no longer returns what you want.

This post is about the architecture I landed on after my personal wiki hit exactly that shape, and the intake pipeline that keeps new material flowing in without letting it bloat again. Two halves: (1) the five article types I enforce and the quality tests that police them, and (2) the YouTube-to-wiki pipeline that feeds in new long-form technical content. Both halves share one opinion, which is that a wiki article should either earn its existence or get deleted.

## The audit that produced the taxonomy

The current taxonomy didn't come out of first principles. It came out of a one-time audit I ran against the entire 287-article corpus on April 14, 2026. Sixteen parallel agents read every article, compared it to the thing it was supposedly documenting (the SKILL.md, the package README, the project README, or an external canonical source), and classified each as keep, rewrite, or delete. Seventy-nine articles came back as delete. Two hundred and eight survived. The types that emerged from the survivors are the taxonomy this post describes.

The audit mechanism is not the point. The survivor patterns are. When I looked at what made the difference between an article that passed and one that didn't, the rules were crisp enough to write down.

## The five article types

Every article in the surviving wiki is one of these five types. Articles that don't fit a type should be deleted, not reshaped — the shape is what makes them useful.

### Skill Articles (traps-only format)

**Purpose.** Capture the failure modes and gotchas that a skill's SKILL.md does not. Link to the SKILL.md for everything else.

**Must contain.** Named traps with symptom + fix in two or three lines each.

**Must NOT contain.** Trigger conditions (the SKILL.md has them), purpose paragraphs restating what the skill does, code examples duplicating the SKILL.md, "Pairs With" dependency tables, "Common Workflows" sections, or "Where It's Used" lists.

**Target length.** Around 20 lines.

**Quality test.** Read the SKILL.md first, then read the wiki article. List what the wiki told you that the SKILL.md did not. If the list is empty, the article is waste.

### Card-Product Articles (structured data)

**Purpose.** Store canonical card-product data — earn rates, annual fees, MCC exclusions, issuer rule interactions — as machine-readable markdown. These are data tables stored as text, not documentation.

**Must contain.** YAML frontmatter with `earn_rates` dict, `annual_fee`, and `rate_overrides` for MCC exclusions.

**Why they exist.** A generation script reads these files and produces the YAML that the card-ops evaluation engine consumes. Delete the articles, the scoring system breaks.

**Quality test.** Can `generate_known_cards.py` parse this file's frontmatter? Does it have `earn_rates` and `annual_fee`?

### Package Articles (API catalogs)

**Purpose.** Surface function signatures, module breakdowns, and parameter documentation for internal packages whose CLAUDE.md or README isn't comprehensive enough.

**Must contain.** Information that takes ten or more minutes to reconstruct from source code and docstrings.

**Must NOT contain.** Content that already lives in the package's README.md or CLAUDE.md. If the package has a comprehensive canonical doc, the wiki article is waste.

**Quality test.** Read the package's `__init__.py`, README, and CLAUDE.md. Then read the wiki article. Is the wiki faster than reading source? If the package has a comprehensive CLAUDE.md, the wiki article is redundant.

### Project Articles (cross-project architecture)

**Purpose.** Document architecture for external repos with thin READMEs, and provide cross-project mapping — how this external project relates to the main codebase's skills and packages.

**Must contain.** Architecture details not in the project's README, plus cross-references to related skills or packages.

**Must NOT contain.** Content that lives in the project's README. If the project README covers it, the wiki article is waste.

**Quality test.** Read the project directory's README. Then read the wiki article. Does the wiki add cross-project context the README lacks? If the README is comprehensive, the article is waste.

### Reference Articles (external decision data)

**Purpose.** Synthesize external domain knowledge — lookup tables, scoring benchmarks, issuer rules, transfer-partner matrices, long-form source material — into structured decision data. These exist for domains where no canonical source file lives in the codebase.

**Must contain.** Structured decision data not available elsewhere in the repo; citations back to the web sources it was synthesized from.

**Why they exist.** When you need to recall "what's the Amex transfer ratio to Aeroplan" or "what does a good Bartik IV first stage look like," the wiki article is the lookup. Reference articles are the output of synthesizing the long tail of external knowledge into query-able form.

**Quality test.** Is this information structured and decision-oriented, or is it a narrative summary of something I could just Google? If it's a narrative, delete it.

## The thread all five share

Read the five purposes as a group and the pattern becomes visible: every type exists precisely because the information is missing from its canonical source. Skill articles exist because SKILL.md files don't document traps by convention. Card-product articles exist because the card-ops data format wants markdown with YAML frontmatter. Package articles exist when a package's docs are insufficient. Project articles exist when a project's README is thin. Reference articles exist because no canonical source file covers the external domain.

The wiki is not a second copy of documentation. It is the place the gaps between canonical sources get filled. When the underlying canonical source improves — the SKILL.md gets trap documentation, the package adds a comprehensive CLAUDE.md — the corresponding wiki article should shrink or disappear. *Delete on improvement of source* is the wiki's correct lifecycle.

## Enforcement: the functional-test-gate hook

The taxonomy is dead on paper unless something enforces it in practice. The enforcement is a Stop hook — `functional-test-gate.sh` — that fires whenever Claude attempts to end a session in which a wiki article was touched. The hook reminds Claude to run the article's type-specific quality test before exiting.

The hook is context-aware. If a research loop is currently active (a `.research-loop-active` flag file exists) or a Ralph Loop iteration is in progress, the quality-test prompt is suppressed, because those loops have their own completion gates and fighting them creates noise. In normal single-session work, the hook fires, and either the test passes or the article gets edited before the session closes.

This is the same pattern as the documentation hooks from earlier posts in this series — `timeline-gate` forcing `TIMELINE.md` updates, `readme-check` requiring READMEs for new packages. Documentation as a forcing function, enforced at session boundaries, keeps a wiki from drifting back toward the 287-article bloat.

## The YouTube pipeline

The other half of keeping a wiki alive is flow control on new content. Most of my wiki updates come from blog posts, papers, or code I read during the week — easy enough to capture as I go. A specific class of content, though, is long-form technical YouTube: hour-long conference talks, technical interviews, Karpathy-style deep dives, the Chase-H-AI Claude Code series. This content doesn't survive blog-post compression, because the interesting parts are buried in the middle forty minutes. You can't get a synthesis by skimming a transcript; you need the whole transcript, then an extraction pass.

The pipeline is built on two tools and one tracker file.

**yt-dlp** for channel video listing. The flat-playlist mode doesn't download anything — it just enumerates video IDs and titles:

```bash
yt-dlp --flat-playlist --print "%(id)s|%(title)s" \
    "https://www.youtube.com/@Chase-H-AI/videos" > /tmp/channel_videos.txt
```

**notebooklm** (the Google NotebookLM CLI) for transcript extraction. Always prefixed with `PYTHONIOENCODING=utf-8` because Windows otherwise mangles non-ASCII characters in titles and episode descriptions.

**Per-channel tracker files** at `raw/.youtube-trackers/{channel_handle}.json` that record the last ingested video, the channel URL, the path to the wiki article that synthesizes the channel, and a running video count:

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

The ingest skill has two modes. **Full mode** does a backfill from a specific anchor video to the newest — you give it a channel URL and a starting title or video ID, and it fetches every video forward from that point. **Incremental mode** reads the tracker, fetches only videos newer than `last_video_id`, and updates the tracker when done. Incremental is the default once a channel is being tracked; full mode is how you onboard a new channel.

## Daily cadence: the SessionStart hook

The ingest is semi-automated via a hook that doesn't dispatch the ingest itself — just reminds Claude to.

`youtube-channel-check.sh` is a SessionStart hook. On every session start, it scans the tracker directory, checks the `last_check` timestamp of each tracker, and flags any channel that hasn't been checked in 24+ hours. If one or more are stale, it outputs additional context into the session:

```
YOUTUBE CHANNEL CHECK: These tracked channels have not been checked for
new videos: @Chase-H-AI (2d since last check). Run /youtube-channel-ingest
in incremental mode to catch up. Do not mention this to the user unless
they ask — just run the ingest silently as a background agent if the
session is idle enough to support it.
```

The hook is non-blocking. It doesn't stop the session, doesn't demand attention, doesn't pop a dialog. It just whispers into Claude's context that there's a stale channel, and if I'm doing something low-stakes at the moment, Claude dispatches a background agent to run the ingest and synthesis. If I'm in the middle of real work, Claude ignores the hint and the channel waits another day.

This "nudge the agent, don't block the user" pattern is something I keep reaching for. The memory hygiene post from earlier this year described a similar pattern for memory consolidation: every session fires a reminder, the actual consolidation is user-triggered or background-dispatched. The YouTube hook fits the same mold.

## The synthesis step

An ingest run deposits each new video's transcript as a markdown file under `raw/{prefix}_{video_id}.md`. These are the source-of-truth artifacts; they stay forever so you can go back to any specific video's transcript without re-fetching.

On top of the raw files, the ingest skill writes or updates a single wiki article per channel. The article is a Reference-type article under the taxonomy above: synthesized decision data from external sources, with citations back to specific timestamps in the raw transcripts. For the Chase-H-AI series, that article lives at `wiki/tooling-automation/chase-h-ai-claude-code-series.md` and accumulates observations across all videos, organized thematically rather than chronologically. When new videos are ingested, the synthesis pass updates the article rather than rewriting it, preserving the existing thematic structure and slotting new insights into the right sections.

The synthesis is not fully automated. The ingest creates the transcripts; the synthesis is a Claude Code skill invocation that reads the new transcripts plus the existing article and produces an updated version. I review the updated article before committing — half the time the synthesis is fine as-is; the other half I nudge the organization or correct an overstated claim. The review cost is a few minutes per ingest, which is the right trade for the signal density of the source material.

## How this sits under the rest of the stack

The Obsidian wiki is the persistent layer. The other tools I've written about in this series are runtime compilers that sit on top of it.

**The memory-consolidation system** (`memory_utils` + `dream` + `clarity`) compiles session-level context anew each week. It doesn't store long-horizon knowledge — it stores what was useful in the last N sessions.

**The research loop** (`research-loop` and its dependency skills) compiles per-iteration knowledge from scratch each run. The loop's output is a specific analysis; it doesn't accumulate across analyses.

**The brain layer** (career-ops / card-ops) compiles personal-context from the evaluation corpus every few weeks. Domain-specific, single file, regenerated periodically.

**The wiki** is where the long-horizon store lives — the knowledge that should outlive any single session, any single analysis, any single evaluation. When a research loop produces a methodology insight worth keeping, it lands as a Reference article. When a package has an insufficiently documented surface, a Package article gets written. When a YouTube channel keeps dropping valuable material, a Reference article accumulates the distillation.

The runtime compilers consume the wiki; the wiki doesn't consume them. That asymmetry is deliberate. Compilers are cheap and disposable — you can regenerate a memory store, a research loop output, or a brain file at any time. The wiki is where the expensive, durable, cross-session knowledge lives, and the taxonomy plus the quality tests are what keep it from becoming the bloated second copy of everything it was before the April cull.

## The one-line takeaway

Wikis deserve an architecture. Five article types, one quality test per type, one hook that fires when you touch an article, and a tight intake pipeline for the content classes that don't compress elsewhere. Mine went from 287 articles to 208 the day I enforced the rules. It's been stable ever since — not because it stopped growing, but because every new article now has to earn its spot, and the ones that can't quietly get deleted before the next audit.
