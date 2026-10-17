---
date: 2026-09-23T04:00:00.000Z
---

# My Computers Talk Behind My Back

On a Friday evening in August, the Claude session in pane 1 on my personal Mac opened an SSH connection to another Mac on my desk, found the Claude session running there, and started talking to it. Two agents on two machines, comparing notes about a bug. I watched it happen in a terminal and typed the message that turned it into a skill: *"we're openly communicating with herdr spaces/sessions on other computers - lock this down as a skill - BEYOND helpful."*

Six weeks later there are five machines in the mesh, a Linux box whose whole job is to watch the other four, and a slash command that wakes a sleeping Mac, opens a tab on it, runs a job there, and hands back the answer. This is the field note on how that works, and on all the ways that typing into another computer's terminal turned out to be harder than it sounds.

## The take, first

The fleet is holocron (my personal Mac), starforge and deathstar (two more Macs), hyperdrive (a Dell laptop I wiped and turned into an Omarchy Linux box), and the NAS. Each one runs a Herdr server, the terminal multiplexer I use for coding agents. Herdr organizes everything into workspaces ("spaces"), one per project, with panes inside them.

The mesh is mostly one idea: **any Claude session on any machine can read another machine's agent pane, type into it, or open a fresh tab there and run a whole job, on that machine's own login and quota.** No credentials cross the wire. Each end authenticates from its own keychain. The SSH connection carries keystrokes and screen text, nothing else.

That buys three things. A job runs on the far machine's own login, so where machines are on different accounts, a heavy job on one doesn't eat the others' limits. Any machine's sessions show up on any machine's screen. And, unexpectedly the best part, the agents catch each other's mistakes.

## Sympathy

The skill was first called `herdr-crosstalk`. It got renamed the same night to **sympathy**. My review of the name: *"sympathy is perfect!"*

It's a 412-line shell script called `herdr-x` and a slash command on top:

- `/sympathy starforge <task>` dispatches a job. It opens a dedicated tab on the far machine, launches `claude`, submits the task, waits, returns the result, and closes the tab. If the job fails, the tab stays open as evidence.
- `/sympathy starforge:<pane> <message>` sends a message to a specific running session.
- `/sympathy starforge` with nothing else reads what's going on over there.

Under that: `up` opens one multiplexed SSH connection and keeps it alive for 30 minutes, and `h` runs a Herdr command remotely with its arguments quoted exactly once, because quoting through `ssh → bash -c → herdr` is how you lose a weekend.

## Enter that never lands

The first night was mostly a lesson in how hard it is to press Enter on a different computer.

Herdr has a `pane run` command that sends text plus Enter. The Enter doesn't reliably take. The text lands in the remote prompt buffer and just sits there. One task sat unsent for 420 seconds while I wondered why the other agent was so quiet (my message at the time: *"Looks like y'all stopped talking..?"*). Worse, the pane's `agent_status` could read `working` while the message was still unsent, so "wait for it to go busy" passed on messages that never arrived.

And at one point my own half-typed line was sitting in the remote prompt. The local agent stopped itself before it pressed anything:

> My third message went in as a bracketed paste and the Enter didn't take — it's unsent. I chose not to force it, because your own typed line, "tell him to delete starforge and keep starforge-1", is live in that prompt buffer. Another send risks concatenating with or clobbering what you're typing.

The two agents also disagreed about the fix. Pane 1 was sure `send-keys Enter` did nothing; the remote agent tested it and found that it *does* submit a sitting buffer. So the rule, now written into the skill, is that the only proof of delivery is **watching the remote buffer empty.** `send` re-sends Enter until it does. It also refuses to send at all if the remote prompt has text in it (someone's typing) or the agent isn't idle.

That "someone's typing" detector had its own bug, which I love. It matched any line starting with the prompt character, including *already submitted* messages still visible on screen. So every pane that had ever received a message looked permanently occupied. The fix is that the live prompt is the *last* prompt line on the pane, and a selftest case locks that in. The selftest is up to seven cases, all offline, all passing.

## The remote agent caught it

Here's the part that sold me. Two of the best debugging moments in the mesh's short life were the *remote* agent solving a problem the local one couldn't see.

**One machine, two names.** The tailnet listed both `starforge` and `starforge-1` as active, and SSH would work twice and then die mid-conversation. The remote agent compared SSH host-key fingerprints, found them identical, and concluded it was one machine registered twice. `up` now finds whichever sibling is live instead of hardcoding a suffix.

**The test that failed only when I was busy.** A guard test suite failed three tests on starforge and passed 27 of 27 on holocron. Machine difference, right? The remote agent forced the cached five-hour usage figure to 19 and the tests passed, then to 99 and they failed. The tests depended on how much of my subscription I'd used that afternoon, not on the machine at all. The fix injects a frozen value, and the suite went from 401 to 402 passing.

That's what you get from two agents with different views of the same problem. Neither is smarter. They just can't see the same things.

## Batons and the half-life of a skill

Around the same time I built session batons. When a session goes stale, a script bakes its transcript into a short handoff note (no LLM involved, just extraction), so a new session can read the note instead of paying to resume the whole conversation. On the day I measured it, reopening 34 stale sessions would have cost about $113; their notes cost about $1.75. Roughly 65 times cheaper, at about five cents a note. Notes deliberately stay on the machine where they were made and never sync, because they contain verbatim conversation.

I'd love to say the mesh took off from there. It didn't. A harness audit found sympathy had been used **twice in 60 days**, and it got swept into the skills archive along with 40 other skills with no logged use. The baton's startup hook was retired soon after in a harness trim.

I was a little annoyed and then mostly agreed. A skill nobody calls is weight. The useful lesson is *why* nobody called it: at first the mesh was a thing I had to remember to use. It wasn't the shape of my day yet.

## The hive

What changed was mostly an experiment that failed. I tried T3 Code as a multi-machine agent front end for a couple of days. My verdict: *"Im really not seeing much benefit between using T3 and Herdr..."* But setting it up forced me to wire every machine to every other machine, and once that was done, coming back to Herdr meant doing it properly.

Herdr 0.9 has `herdr machine add`, which puts every saved machine's workspaces in one sidebar. Once it was set up, each of four machines had the other three saved, and sympathy came back out of the archive the same day. The split that emerged: **`machine add` is how a person sees the fleet; sympathy is how an agent drives it.**

There was one gotcha: saved machines need a Herdr server that's detached from any terminal. Starforge's wasn't, and I didn't want to lose what was running on it. `herdr update --handoff` did a live handoff that kept all 25 panes across 11 workspaces alive. That's the most nervous I've been running a single command this year.

Then, to give the hive a first job, I opened one workspace called "Specs" on every machine and asked each one the same question: *specs on this computer.* Starforge got an extra tab that compared all the answers in a best/worst grid across ten dimensions. Starforge won single-core, multi-core, GPU, and battery runway. Deathstar won RAM (64 GB) and display, and lost single-core. The NAS won storage and lost compute. Holocron lost on disk, with 24 GiB free, which explains a lot about my month. The side findings were the useful part: a broken Node hook on deathstar, and folder trust on starforge not sticking between tabs. Fair warning, the CPU and GPU cells came from published benchmark rankings, not measurements. It's a ranking grid with some estimates in it, not a lab.

## Waking a sleeping Mac

A mesh is only as good as its least awake member, and Macs sleep. One evening I typed *"wake up starforge please"* and the agent went off to check on the Starforge *loop tool* (same name, different thing; I named an autonomous loop and a laptop the same word and have regretted it ever since). My reply: *"I literally just want to wake up the computer..."*

That became `/wake` and a 57-line `fleet-wake.sh`. A sleeping Mac doesn't answer on the tailnet, but the home network's Bonjour sleep proxy will wake it on a TCP knock to its `.local` SSH port. Away from home, the knock relays through the NAS, which never sleeps. A knock only gets you a DarkWake, a half-awake maintenance state, so the script follows up with `caffeinate -u` over SSH to make it a real wake. Knock to awake took about 11 seconds in testing.

Tailscale kept listing sleeping Macs as online, so the script now knocks unconditionally instead of trusting the status. And `herdr-x up` calls the wake script first, so `/sympathy starforge <task>` just works on a sleeping laptop. Mostly. Network wake is disabled on battery, and that laptop spends a lot of its life on battery, so a full wake from deep sleep still needs proving.

## Hyperdrive

The last piece is the one I'm happiest with. I had an old Dell Latitude doing nothing, and I wanted *"an AI orchestrator with herdr."* So I flashed Omarchy (DHH's opinionated Arch setup, Tokyo Night theme and all) onto a USB stick and wiped Windows. Hyperdrive's job is to sit on the desk with one Herdr window showing every machine's sessions.

It also found the next bug immediately. Herdr servers started over SSH can't read the macOS keychain, so new Claude panes spawned on deathstar from hyperdrive said "Not logged in." The fix is a long-lived token loaded only when the session is inside Herdr. One side effect showed up in deathstar's status line, which was reporting 1% weekly usage when the real figure was 35%. It was reading a stale account. A status line that confidently shows the wrong number is worse than no status line, so that got fixed the same week.

## What I'm not pretending about

- **It's thin.** The scan of holocron's transcripts shows 21 dispatches, 10 sends, and 12 reads through sympathy, mostly aimed at starforge. That's a real tool getting real use, and also not a lot. These last few weeks are the first time it's been the shape of the day rather than a trick.
- **Keystrokes are powerful.** A message to a pane is typed input. It can answer a permission prompt or run a slash command in the target session. The send guards make that safer, not safe, and nothing in the path checks *what* a message asks for.
- **Version surfaces lie.** `herdr wait --help` exits 0 on versions where `herdr wait` doesn't exist, and at one point "starforge is far behind" turned out to mean a stale Homebrew binary earlier on the SSH login PATH, while the server itself was current. Check the thing that's actually running.
- **I've only read one machine's side.** Every number here comes from holocron's logs. The other machines keep their own.

## The shape of it

The thing I didn't expect is how much the mesh feels like a team rather than a cluster. The best moments weren't about scale. They were about perspective: an agent on one machine noticing a duplicate host key the other couldn't see, or proving a test failure was about my usage meter and not the hardware. Separate machines, separate quotas, separate blind spots.

They talk behind my back now. Mostly they're catching each other's mistakes, which is more than I can say for a lot of group chats.

Cheers,
Chris
