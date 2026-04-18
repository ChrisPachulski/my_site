---
title: 'Production Python on Windows Task Scheduler: The Dual-Logging Pattern'
date: 2025-11-11T05:00:00.000Z
---

# Production Python on Windows Task Scheduler

Airflow is what you want. Windows Task Scheduler is what you have when the client's IT group said no, or when the operational environment is a Windows VM that somebody else's ops team owns and doesn't want replaced with a Linux box running a Python scheduler.

I've shipped twenty-odd production ETL jobs on Windows Task Scheduler in the last year. Roughly half of them touch external APIs that break in interesting ways. None of them should be on Task Scheduler. All of them are on Task Scheduler. This post is about how I made that stack diagnose-able enough that I stopped getting paged at three in the morning about a job that "failed" with no further information.

The punchline: a batch-file wrapper that captures everything, paired with a structured Python logger that runs in parallel inside the script, plus a small email-on-failure hook. Take those three pieces and the stack becomes manageable. Leave any one of them out and you'll spend Saturday morning diagnosing a job that ran, exited with code 0, and somehow produced no output.

## Why the Windows Event Log isn't enough

Task Scheduler writes task results to the Event Log. The Event Log, as a diagnostic aid for Python failures, is approximately useless. Here's what you get when a Python script dies because of a `KeyError` two hundred lines into an ETL:

> Task Scheduler successfully finished "\\MyFolder\\MyTask", instance "{GUID}", action "python.exe" with return code 1.

That's it. Return code 1. The traceback is gone. It went to stderr, which nobody captured, which means it went to the void.

You can try to fix this at the Task Scheduler level by configuring logging options, but Task Scheduler's logging UI is an abomination designed by a committee whose primary goal was Windows XP backward compatibility. Don't fight it. Fix it at the script level.

## The .bat wrapper pattern

Every scheduled task in my setup runs a `.bat` file, not a `.py` file. The `.bat` is three lines of useful content:

```bat
@echo off
set LOG_DIR=C:\Users\%USERNAME%\Documents\ETL\logs
set LOG_FILE=%LOG_DIR%\DAILY_EXAMPLE_BATCH.log
set SCRIPT=C:\Users\%USERNAME%\Documents\ETL\scripts\Daily_Example.py

echo ============================================ >> "%LOG_FILE%"
echo Start: %DATE% %TIME%                          >> "%LOG_FILE%"
call C:\path\to\venv\Scripts\activate.bat
python "%SCRIPT%" >> "%LOG_FILE%" 2>&1
set EXIT_CODE=%ERRORLEVEL%
echo End:   %DATE% %TIME%, exit %EXIT_CODE%       >> "%LOG_FILE%"
echo.                                              >> "%LOG_FILE%"

exit /b %EXIT_CODE%
```

Three things matter here:

1. **`>> "%LOG_FILE%" 2>&1`** captures both stdout and stderr. If the Python script prints anything, it goes to the log. If it raises an uncaught exception, the traceback goes to the log.
2. **`%ERRORLEVEL%`** and **`exit /b %EXIT_CODE%`** propagate the exit code up to Task Scheduler, so the task history actually shows the right result instead of a cheerful green "success" for every run.
3. **Framing lines** (`echo Start: ...`, `echo End: ...`) are the difference between "I have no idea what happened" and "I can grep the log and find the run boundaries."

If the Python process crashes catastrophically — segfault, DLL mismatch, venv not activating — the batch log still has the activation line and a failure mode. That was the difference between my first quarter on this stack and my second quarter.

## The parallel Python log

The batch log is good for outer-boundary diagnosis. The batch log is not good for understanding what the script was *doing* when it failed. For that, configure a Python logger inside the script that writes to a sibling log file.

```python
import logging
import traceback
from datetime import datetime
from pathlib import Path

LOG_DIR = Path.home() / "Documents" / "ETL" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

script_name = Path(__file__).stem
py_log_path = LOG_DIR / f"{script_name.upper()}.log"

logging.basicConfig(
    filename=py_log_path,
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(script_name)
```

With this in place, I get one log per script, named consistently, co-located with the batch log. When a script fails I have two files to look at: the batch log (did Python even start, what was the exit code, did any traceback escape?) and the Python log (at what point in the ETL did things start going sideways?).

## Wrap the main body in try / except

This is the least glamorous part of the pattern and the one that pays the biggest dividend. Wrap the main body of the ETL in a `try` / `except` that logs the traceback, emails a human, and re-raises.

```python
from mail_utils import send_failure_notification

try:
    logger.info("=== run start ===")
    # ... entire ETL body ...
    logger.info("=== run complete ===")
except Exception as e:
    tb = traceback.format_exc()
    logger.error(f"run failed with {type(e).__name__}: {e}")
    logger.error(tb)
    send_failure_notification(
        subject=f"[FAIL] {script_name}",
        body=f"Script failed at {datetime.now():%Y-%m-%d %H:%M:%S}\n\n{tb}",
        attachments=[py_log_path],
    )
    raise
```

The `raise` at the end is important. You don't want to swallow the exception — you want the exit code non-zero so Task Scheduler marks the run as failed and doesn't try to re-run it based on some conditional logic you forgot about. You just want to make sure, before the exception propagates, that a human gets told and the traceback ends up in your log.

`send_failure_notification` here is a thin wrapper around the Microsoft Graph API that sends an email with attachments. The key detail: attach both logs. If the batch log and the Python log are in the same email, the on-call engineer has everything they need to diagnose without RDPing into the box.

## Retention policy

The failure mode nobody tells you about on Windows: logs eat your disk. Twenty jobs, daily, for a year, is seven thousand log files. If any of them are verbose, it adds up fast.

I keep thirty days of batch logs and ninety days of Python logs, because the Python log is where the actual forensic value is. Cleanup is a separate scheduled job that runs at 2 AM and purges anything older than the retention window. No magic, just a PowerShell equivalent of `find`:

```powershell
$LogDir = "$env:USERPROFILE\Documents\ETL\logs"
Get-ChildItem -Path $LogDir -Filter "*.log" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-90) } |
    Remove-Item -Force
```

## What you actually get

With the pattern in place, the lifecycle of a failure looks like this:

1. 3:07 AM — a scheduled Python job raises a `requests.Timeout` to the Salesforce bulk API.
2. The `try` / `except` catches it, formats the traceback, logs it to the Python log, emails me with both logs attached, and re-raises.
3. 3:07 AM — the batch wrapper catches the non-zero exit, logs end-of-run with exit code, propagates `exit 1` to Task Scheduler.
4. Task Scheduler marks the run as failed in its history.
5. I wake up, read the email on my phone, and know before I open my laptop that (a) it was a transient Salesforce timeout, (b) the retry-on-next-run logic will probably handle it, and (c) if it doesn't, the specific call site and query are already highlighted in the Python log.

That's the win. Not that failures stop happening. Failures don't stop happening. The win is that every failure comes with enough context to decide whether to ignore it, retry it, or fix it — without logging into anything.

## The one-line takeaway

On Windows Task Scheduler, you are your own observability stack. Build it on purpose: batch wrapper captures stdout/stderr and exit code, Python log captures the application trace, try/except emails a human with both attached. Three pieces, about a hundred lines of boilerplate, and you will stop getting paged at three in the morning.
