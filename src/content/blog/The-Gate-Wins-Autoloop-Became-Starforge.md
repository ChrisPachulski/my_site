---
title: "The Gate Wins: How Autoloop Became Starforge and Lost the Right to Merge"
date: 2026-07-29T04:00:00.000Z
---

# The Gate Wins

Three days after I published a 60-minute post about autoloop, I renamed it.

Commit `b619116f`, July 11: *refactor: rename autoloop to starforge.* The directory moved, the env vars and tmux prefix and launchd label all changed, old `.autoloop/` state migrates itself on first run, and a shim at `~/.local/bin/autoloop` still works for muscle memory. The name comes from KOTOR's Star Forge, an autonomous, self-improving factory, and it sits next to the other Star Wars names in my shell (the lightsaber forms are already taken by my Claude and Codex launchers).

The rename was the smallest thing that happened. In the three weeks since, the code went from about 5,500 lines of engine and 16 test files to roughly 65,000 lines of JavaScript, about half of it tests, with more than 200 commits this month alone. Most of that growth went into a single decision I'd been circling in the autoloop post without committing to it: **the loop does not get to merge.** Not "shouldn't," not "by default." Can't.

This post covers what came after the autoloop post. If you want the spend guard, the verification spine, and the mesh, that one still describes them accurately. This one is about authority.

## The take, first

The README tagline is the whole post: *The loop wants to merge. The gate wants proof. The gate wins.*

An autonomous improvement loop has a gravitational pull toward giving itself more power. Each individual step sounds reasonable. It's already verifying its own changes, so why not let it promote the confirmed ones? It's already promoting, so why not let it resolve the merge conflict? Every one of those steps is a small, sensible convenience, and the sum is a robot with commit rights to your main branch.

So I wrote the rule down as a contract and then went hunting for every code path that violated it.

## The month it got big

July 12 and 13 were the "burn" days. I'd noticed I was leaving subscription capacity on the table every week, and I gave Codex a prompt that started *"I want to burn my available usage to maximum effect."* What came back was a second runtime, Starforge Dynamic: provider adapters for both Claude and Codex, benchmark-gated model routing, capacity tracking, and a "Burn It All" phase engine that burns through Claude's ceilings on Codex's quota. July 13 alone has 95 non-sync commits, most of them titled some variant of *fix(dynamic): close … race.* Account rotation landed too: instead of idling at a usage ceiling, a loop switches to a fresh Max account and keeps going.

It was a lot of power, built very fast, by an agent, at my request. Which is exactly why the next thing I did was ask for a review.

## "An experimental kernel, not a tool"

On July 15 I had an independent review written up as `plans/001-starforge-tool-review.md`. The verdict line stung in the useful way: Starforge was *"an experimental autonomy and verification kernel"* and not *"a usable software-engineering tool."* It found 33 failing Dynamic tests and traced them to two real source defects, fixed the next day. A 23-agent audit re-checked the review itself, because a review of a self-improving system is also a claim that needs checking. The MVP plan that followed was marked **REJECTED**. The bar went up instead of down.

What replaced it was a GA roadmap, plans 003 through 009, macOS first, with one permanent rule underneath all of them. It lives at the top of `control.mjs`:

```
// Product authority contract (normative, Plan 003):
//   Starforge may mutate only run-owned local and remote branches and their pull
//   request metadata. Starforge must never update the configured default branch,
//   merge or land a pull request, enable auto-merge, enqueue a pull request into a
//   merge queue, bypass branch protection, or represent a merge as human-approved.
//   It may only observe a human-performed merge and record that observation.
// No control knob widens that boundary.
```

"No control knob widens that boundary" is the line that matters. Starforge has a lot of knobs (RIP, BURN, ROTATE, merge-risk, scope, discovery cadence), and every one of them stops at that rule. A recognized knob with an invalid value fails closed when the control file is parsed, instead of falling back to something permissive.

Then I went and deleted the paths that broke the contract. July 18–19: *cut off the autonomous promotion public path*. *Remove executable promotion legacy*. *Typed controls and the closed repository authority broker*. 44 non-sync commits on the 19th. A Codex fleet implemented the plans from a shared coordination file, and then 25 fresh Opus sessions in 20 separate worktrees did acceptance review the next day. In the Dynamic runtime the hard stop is a single check: the git layer rejects any promotion receipt where `humanMergeRequired !== true`. There is no code path where it's false.

## The runaway that wasn't

The scariest moment of the month was a false alarm.

On July 19 I was about to do a history purge that needed a force-push, and an assistant stopped me: there was a runaway Starforge session, committing every ~30 seconds, and a force-push would collide with it. I believed it instantly. My reply was *"Thank god - runaway star forge is horrifying thought."*

Then it occurred to me to ask a clarifying question: *"its work on\* starforge not starforge doing work right?"* It was. The "runaway" was a hand-launched Opus session *building the GA code*. The assistant traced it and conceded it had anchored on a burst of commits and over-generalized. Fair enough. But I noticed how readily I'd accepted "the autonomous loop has gone rogue" as the explanation. That's the failure I'm building against, so it's the one I'm primed to see.

## Two programs pretending to be one

By the end of the month I had three runtimes in the tree (baseline, Dynamic, and Burn), and I'd been assuming Burn was the same plumbing with the brakes off. When I had Mermaid diagrams drawn of each, side by side, and the diagrams said otherwise: they were two different programs. My reaction, verbatim: *"Im shocked that their processes are so different from one another."*

That turned up a scarier question: did Burn respect the merge rule? The trace found the human-merge requirement enforced in about a dozen places, and `humanMergeRequired: false` wasn't even a modeled state. Good. But "it happens to be enforced everywhere" is weaker than "it's one shared path," so the outcome was RIP mode: it removes cadence and arbiter pacing, the timing and human-in-the-loop *pauses*, and nothing else. Merge authority stays human in every mode. Merging the three runtimes into one is still on the roadmap, and still TODO.

## The gate that never judged anything

The authority contract only means something if the gate is real. "The gate wins" assumes the gate can lose. Then I found out how often mine couldn't.

Starforge has a gate probe: before a loop launches, it runs your `TEST_CMD` in a throwaway worktree, then reverts the source half of a past commit and checks that the tests go red. If they stay green, the gate is hollow (the tests don't actually test the code) and the loop shouldn't trust it.

Three separate bugs, found in quick succession:

- **The wrong Python.** In the bare worktree, `python3` resolved to the system 3.9, so the probe reported "RED on HEAD — unverifiable" with no evidence. Fix: re-run a red result in the live checkout and report the difference.
- **The unknown summary line.** The parser didn't recognize unittest's `Ran 194 tests` line, so it reported a false "hollow." Swift Testing had caused the same false result earlier. Fix: let the seeded-revert step settle any format the parser doesn't know. Re-run against claude-genealogy: *194 tests ran; seeded source revert turned the gate red.* That's a gate that works.
- **No `node_modules`.** Then I found that every Node repo came back "unverifiable" because the probe worktree had no dependencies installed (`vitest: command not found`). The check had been a no-op on every Node launch, *while printing a line that read like it had run.*

That last part is the one that bothers me. A safety check that silently does nothing is worse than no check, because it gets credit for safety it isn't providing. The same commit fixed a cousin of it: the loop detected readiness by grepping the pane for "bypass permissions," which never appears in auto mode, so the kickoff was being typed into whatever happened to be on screen.

## The stale summary that hid a hollow gate

One afternoon I went looking at the markdown files Starforge leaves behind during a run, and I didn't trust them: *"trust but verify - we've had tons of prior runs with starforge (previosuly autoloop) and I suspect the fragment mds still existing are incredibly stale."* They were. The Apple app repo's state files dated to July 12, many outside commits earlier.

The worst offender was `PENDING-HUMAN.md`, the file that was supposed to tell me what the loop needed from me. My take: *"I don't think there should ever be a pending-human.md in this architecture at all."* A summary of pending decisions is a cache, and a cache of human decisions goes stale the moment you look away. It got replaced by `starforge pending`, which renders held asks live from their JSON files, plus `starforge answer`, which records the answer and wakes the loop.

The first smoke test of the live view surfaced an unanswered ask that the stale markdown had buried. On rust-yt-extractor, `cargo test` stayed green when the source half of a commit was reverted. A hollow gate, on a run that had already produced 12 confirmed merges into integration, which by my notes had gone on to main, promoted by a human (me) trusting that gate. The rule held, a human did the merge, and the human was trusting a gate that didn't work. Authority without evidence just moves the risk somewhere else.

## The zombie loop

The last story is the strangest. A tmux session outlives the Claude process inside it. When Claude exits, the pane drops back to a bare zsh prompt, and my re-kick job (a launchd sweep every three minutes that nudges idle loops) read that bare prompt as "idle" and typed the loop's kickoff into the shell. The apostrophe in "checkout's" opened a `quote>` continuation. The parentheses produced `zsh: bad pattern`. Meanwhile a heartbeat kept getting bumped, so `starforge list` showed a run that had been dead for three days as healthy.

The fix requires two signals, because each one alone lies:

```js
// Two signals, both required, because either alone lies: pane_current_command is a
// shell (a live claude pane reports node/claude — but can transiently report bash while
// a Bash tool call is the tty's foreground process), AND no `❯` composer is drawn
// anywhere on the visible pane (the TUI always renders it, including mid-tool-call).
const SHELLS = new Set(['zsh', 'bash', 'sh', 'fish', 'dash', 'tcsh', 'ksh', 'csh', 'login']);
export function isDeadLoop(cmd, pane) {
  if (!cmd || pane == null) return false; // unknown → assume alive, never kick a live turn off a guess
  if (!SHELLS.has(cmd)) return false;     // claude/node is the foreground process
  return !/^\s*❯/m.test(pane);            // shell in front AND no composer → the TUI is gone
}
```

Note the default: unknown means alive. It's better to leave a dead loop alone than to type a kickoff into a live session mid-turn.

## What's honestly not done

- **GA is still a roadmap.** Plans 003 onward are in progress or TODO, and the July review's verdict ("kernel, not tool") hasn't been formally overturned. I'd rather say that than call it shipped because the code is large.
- **Three runtimes still exist.** The plan that unifies them is TODO, and until it lands "same plumbing" is something I have to check rather than assume.
- **The dead-pane guard logs; it doesn't tell me.** It now correctly refuses to kick a dead loop. But "correctly refusing, silently, for days" is its own failure mode, and a notification is the obvious next step.
- **Every "confirmed" means confirmed into integration.** Promotion to main is me, reading the branch. That's the design, and it's also the bottleneck. Good.

## The shape of it

The autoloop post was about two enemies: runaway cost and plausible-but-wrong changes. Three weeks later I'd add a third, and it's the sneaky one: **authority creep.** Every convenience that removes a human step is individually reasonable, and the sum is a system you no longer supervise.

What July taught me is that the contract only covers half of it. The other half is the gate the contract leans on. A loop that can't merge, behind a gate that can't fail, gives you the feeling of safety without any of the safety. So the order of operations is: make the gate real, prove it can go red, and only then let it win.

Cheers,
Chris
