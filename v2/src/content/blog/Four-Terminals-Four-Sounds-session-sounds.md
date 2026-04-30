---
title: 'Four Terminals, Four Sounds: A Tab-Naming and Notification System for Parallel Claude Code and Codex Sessions'
date: 2026-03-17T04:00:00.000Z
---

# Four Terminals, Four Sounds

When I started running three and four parallel AI sessions across terminal tabs, I kept typing into the wrong one. "bash", "bash", "bash", there was no way to tell them apart without hovering over each one, and even then the titles updated too slowly to help in the moment where I actually needed to type.

This is apparently the most-discussed UX pain point for Claude Code power users. [anthropics/claude-code#7229](https://github.com/anthropics/claude-code/issues/7229) has a long tail of people describing variants of the same problem. Most of the community responses focus on gamification or entertainment, make the terminal say something funny, play a silly sound. The problem I actually had was duller: I needed to *tell my sessions apart*. Not entertain me. Identify them.

I built [session-sounds](https://github.com/ChrisPachulski/session-sounds) to do that. It ships as a single-command install, runs on Claude Code and Codex on Windows, macOS, and Linux, and has zero dependencies beyond Python's standard library. This post is about the three ideas that make it work, the one genuinely hard workaround I had to write for Codex on Windows, and the waveform-extraction side quest that came free with it.

## Three ideas, that's it

**Unique tab names.** Each session gets a stable, distinctive label on its terminal tab. Not "bash". Not "Claude Code". Something like `✳ Danger Zone` or `○ Cool Cat`. Same label for the life of the session.

**Unique notification sound per session.** When the agent finishes a response, a short audio tone plays. Different sessions play different tones. If I'm in a different window entirely, I know which of my four sessions just finished from the sound alone.

**Sound deduplication.** Concurrent sessions never share the same sound or label. When a session ends, its assignment is released back into the pool.

Any one of those three is a nice-to-have. The combination is the thing, sound *plus* name lets me identify a session both visually and aurally, which means I can be anywhere (looking elsewhere, working in a different window, away from the desk) and still know which session needs attention.

## Claude Code: five hooks, done

Claude Code supports [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks), shell commands that fire on specific session events. The session-sounds installer wires up five of them:

| Hook | Event | What it does |
|---|---|---|
| `SessionStart` | Session opens | Claims the sound reservation from the launcher |
| `Stop` | After each response | Plays the completion sound + refreshes the tab title |
| `Notification` | Needs user approval | Plays the approval chime |
| `StopFailure` | Error or failure | Plays the error tone |
| `SessionEnd` | Session closes | Releases the assignment back to the pool |

Why hooks work for tab naming even after the TUI takes over the terminal: hook processes run as Claude Code subprocesses with PTY access. They can write ANSI title-escape sequences (`\033]0;text\007`) and the terminal picks them up. You can fight the TUI's own title updates if you need to, but in practice the hooks fire often enough, every response, that the session-sounds label stays current.

Five hooks is the whole integration with Claude. The rest of the complexity is in what those hooks call out to.

## Codex on Windows: the hard part

Codex is an OpenAI agent CLI. It supports hooks on macOS and Linux. On Windows it does not, the hook system is disabled in the Rust binary via `cfg!(windows)`. For a Windows-first tool this is a problem, because half my user base (me, initially) runs Codex on Windows.

The workaround is a watcher thread started by the launcher. Codex writes a JSONL rollout log every session at `~/.codex/sessions/rollout-*.jsonl`. Every user turn and agent response becomes a line in that file. Two specific event types matter:

- `task_started`, the agent has received a task and begun processing.
- `task_complete`, the agent has finished its response.

The watcher subscribes to file-change notifications using the Windows `FindFirstChangeNotificationW` API, reads new lines as they arrive, and matches on the event type. `task_started` activates a spinner in the tab title. `task_complete` plays the sound and restores the idle title.

```python
# Abbreviated — the real version handles timeouts, restarts, and
# multiple concurrent rollout files (happens on session restart).
import ctypes
from ctypes import wintypes

kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

def watch_dir(path: str, on_change):
    FILE_NOTIFY_CHANGE_LAST_WRITE = 0x00000010
    handle = kernel32.FindFirstChangeNotificationW(
        path, False, FILE_NOTIFY_CHANGE_LAST_WRITE,
    )
    if handle == wintypes.HANDLE(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        while True:
            kernel32.WaitForSingleObject(handle, -1)
            on_change()
            kernel32.FindNextChangeNotification(handle)
    finally:
        kernel32.FindCloseChangeNotification(handle)
```

There's a second wrinkle. Codex has its own title animation, an 80ms spinner that overwrites whatever the watcher writes. Left alone, the two would fight: session-sounds writes `○ Danger Zone`, Codex writes `⠇ thinking…`, then `⠏ thinking…`, and so on. The installer fixes this by setting `terminal_title = []` in `~/.codex/config.toml`, which disables Codex's native title animation. Once suppressed, the watcher has the title to itself.

This is the engineering-fun part of the tool. It's also why I won't claim session-sounds is elegant. It's a reasonable workaround for a CLI that shipped without hook support on Windows. If Codex adds Windows hooks, the watcher gets deleted and the whole JSONL-tailing thread becomes twenty lines of hook configuration.

## Sound deduplication via file locks

Assignments live as JSON files in `~/.claude/sounds/assignments/`. Each file maps a session ID to a sound pool entry. When a new session starts, the launcher scans the assignments directory, excludes sounds already in use, and picks one at random from what's left.

The tricky part is releasing assignments when sessions end abruptly, force-killed, OS crash, tab closed without cleanup. For that, each launcher holds a companion `.lock_{id}` file open for the session's lifetime. When any other process needs to check if a session is still alive, it tries to delete that lock file. On Windows, open files can't be deleted; on Unix, the handle is still held. Either way, a successful delete means the owning process is dead and the assignment is reclaimable.

There's a pressure-based backstop on top of that: when fewer than five sounds remain available, the oldest assignments by mtime are evicted first. This keeps the pool from exhausting when a user opens and closes sessions faster than the normal cleanup can run.

Both mechanisms together mean I've never had a session fail to acquire a sound, even after deliberately torturing the launcher with kill -9 and forced reboots.

## Process detach so hooks return instantly

A naive hook would play the sound synchronously: fire the hook, play the sound, return. That's bad, Claude Code waits on hooks to complete before continuing, so a 2-second sound would delay every response by 2 seconds.

The fix is to detach the sound-playing subprocess:

```python
# Windows
import subprocess
subprocess.Popen(
    [python_exe, sound_script, sound_path],
    creationflags=(
        subprocess.CREATE_NEW_PROCESS_GROUP
        | subprocess.DETACHED_PROCESS
        | subprocess.CREATE_NO_WINDOW
    ),
    close_fds=True,
)

# Unix
subprocess.Popen(
    [python_exe, sound_script, sound_path],
    start_new_session=True,
    close_fds=True,
)
```

The hook launches the sound subprocess and returns immediately. The sound plays in a fully detached background process with no parent-process coupling. Claude Code gets its hook-completion signal in milliseconds regardless of how long the sound is.

This is the detail that turns session-sounds from a prototype into something you'd actually run on every response. Without it, every sound-playing hook would pause the agent by whatever fraction of a second the audio took. With it, hooks are free.

## Waveform-aware clip extraction, the side quest

The session-sounds repo ships with a `default` theme and an empty `personal` theme. I wanted custom sounds for my personal theme, specific song phrases, movie quote fragments, the opening notes of a theme tune. Extracting them turned into a small project of its own.

The obvious approach is `ffmpeg -ss START -to END`, which gives you a hard-cut clip at exact timestamps. This sounds terrible, because audio rarely has energy at the sample where you picked the cut. You end up with clicks at the start and end, phrases that begin mid-syllable, and clips that cut off before the decay of the final note.

The less obvious approach, which `tools/extract_clip.py` implements: analyze the waveform's energy envelope, find local minima near your requested start and end points, and snap the cuts to those natural phrase boundaries. The whole thing is under 200 lines, stdlib only, `wave` + `struct` + `math`. No numpy, no librosa, no scipy.

The algorithm in one paragraph: read the WAV as mono samples, compute a sliding-window RMS over windows of ~50ms, search a window of ±1-2 seconds around the requested start for the local minimum (a quiet point between phrases), do the same near the requested end, and cut the clip at those snapped boundaries. A `--candidates N` option runs the search N times with different snap preferences and emits N variants for auditioning. A `--boost N` option multiplies the sample values to normalize quiet source material.

```bash
# 15-second source, request clip from ~10s to ~20s, produce 3 auditioning candidates
python tools/extract_clip.py source.wav 10 20 my_sound.wav --candidates 3 --boost 4
```

What comes out is a triplet, `my_sound_a.wav`, `my_sound_b.wav`, `my_sound_c.wav`, all of which start and end at actual phrase boundaries rather than arbitrary cuts. Pick whichever one sounds cleanest, drop it into `~/.claude/sounds/themes/personal/`, and it's your session sound.

This was not the point of session-sounds. It is, unexpectedly, the part of the project I use most often now. Every custom sound in my personal theme went through this tool. I expect to keep maintaining it even if the session-sounds launcher ever gets obsoleted.

## Zero dependencies

session-sounds has zero third-party dependencies. Standard library only. This wasn't an ideological choice. It was a practical one. The target user base runs Python, wants to install a thing that works, and does not want to debug `pip install` failures on a locked-down corporate Windows box with no admin privileges.

Platform audio playback resolves at runtime:

| Platform | Player | Notes |
|---|---|---|
| Windows | `winsound` | Built-in stdlib, nothing to install |
| macOS | `afplay` | Built-in |
| Linux | `paplay`, `pw-play`, or `aplay` | Auto-detected in that order |

The launcher (`agent_launcher.py`), the sound manager, the pack loader, the tab title handler, the clip extraction tool, all of it works off `wave`, `struct`, `ctypes`, `subprocess`, `threading`, `json`, `pathlib`, `argparse`. No requirements file. No virtual environment. No install beyond `python install_claude_sounds.py`.

I've written a lot of Python that needs dependencies. This was a nice reminder that for certain classes of tool, small, stable, intended to run on machines you don't control, stdlib-only is a genuine feature, not a constraint.

## The install, in full

For completeness:

```bash
git clone https://github.com/ChrisPachulski/session-sounds.git
cd session-sounds
python install_claude_sounds.py
```

The installer does five things:

1. Copies sound files and scripts to `~/.claude/sounds/`.
2. Merges hooks into `~/.claude/settings.json`.
3. Adds `claude` and `codex` shell wrappers to your PowerShell, bash, or zsh profile.
4. Sets VS Code terminal tab titles to `"${sequence}"` so ANSI title escapes reach the tab.
5. Disables Codex's native title animation in `~/.codex/config.toml`.

Open a new terminal, type `claude`. You get a tab labeled `✳ Danger Zone` (or whichever random sound got assigned) and a notification tone when Claude finishes its first response. Open another terminal, type `claude` again. Different name, different sound. Do it four times. Still unique.

That's it. No daemon, no service, no background watcher unless you're on Codex for Windows where the watcher is the workaround for Codex's missing hook support.

## The one-line takeaway

If you run more than two AI sessions in parallel, identity-by-sound-plus-name is a one-minute install that saves you from a class of dumb errors every day, typing into the wrong session, finishing a response you didn't notice, waiting on a session that's been idle for five minutes. The tool is [MIT-licensed](https://github.com/ChrisPachulski/session-sounds), stdlib-only, and small enough that you can read the whole thing in an afternoon.
