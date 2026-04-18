---
title: 'Classifying Call-Center Agents with the Genesys API: Component-Level Occupancy Analysis'
date: 2025-10-14T04:00:00.000Z
---

# Classifying Call-Center Agents with the Genesys API

Every contact-center reporting stack I've seen starts with three numbers: average handle time, after-call work time, first-call resolution. If the number is good the agent is good. If the number is bad, the agent is bad. Coaching is an exercise in averaging three of those numbers, taking the lowest, and having an uncomfortable conversation with whoever landed at the bottom.

This is a bad way to run an operation, and not because the numbers are wrong. They're fine numbers. The problem is that they're *aggregates*, and aggregates hide the failure modes that matter for coaching. Two agents with identical AHT are not identical agents. One of them may be efficient on calls and then sit idle for long stretches between them. The other may be slow on calls but handle every second of their shift. Same metric, completely different operational profile.

This post is about the technique I ended up using to fix that: decomposing agent time into components, deriving occupancy from first principles, and bucketing agents into Poor / Average / Good with percentile thresholds that don't drift with queue volume. It's code-heavy and opinionated. If you work in contact-center analytics and you are still reporting AHT as the top-line agent metric, I think you can do better.

## The component decomposition

Every second of an agent's logged-in shift lands in one of a small number of states. Genesys Cloud's routing status and presence APIs give you the following categories:

- **Interacting** — on a call, in a chat, handling an email.
- **Not Responding (NRT)** — routed to but unavailable. The agent was offered an interaction and didn't pick up.
- **Idle** — available to receive routing, not currently engaged.
- **On Queue Away / Meeting / Training** — away for a structured reason.
- **Off Queue / Break** — unavailable by choice (break, lunch, system time).

The categorical sum of these over a shift equals total logged-in time. That much is straightforward — the Genesys API makes each component queryable via `/api/v2/analytics/users/aggregates/query` with the right metrics filter.

The less obvious move is treating the *ratios* between components as the signal, rather than any absolute duration. A two-hour idle period on a 12-hour shift is 17% idle. A two-hour idle period on a 4-hour shift is 50% idle. Absolute duration is the wrong unit for coaching conversations.

## Occupancy from first principles

Here's the operational definition of occupancy I use:

```
occupancy = interacting / (interacting + idle)
```

Notice what's not in that denominator. Not NRT — because NRT is its own red flag, and you don't want to dilute the occupancy signal by mixing it with availability signal. Not meeting, training, or break — because those are scheduled, structured time and shouldn't affect the productivity ratio.

What you're measuring is: of the time this agent was *available for work on the queue*, how much of it was actually spent doing the work. High occupancy can mean two things — the agent is getting a lot of interactions routed to them, or the queue is brutal and the agent is being crushed. Low occupancy can mean the agent is fast and clearing the queue, or the queue is under-provisioned and the agent is waiting. Neither interpretation is automatic from the number alone.

The coaching value is in the *distribution* of occupancy across agents in the same queue with similar tenure. One agent at 95% occupancy in a queue where the median is 60% is telling you something. One agent at 30% occupancy in the same queue is telling you something else.

Here's the pull in Python:

```python
from datetime import datetime, timedelta
import pandas as pd
import genesys_api as gen

start = datetime.utcnow() - timedelta(days=30)
end = datetime.utcnow()

df_raw = gen.analytics_users_aggregates_query(
    metrics=["tAgentRoutingStatus"],
    interval_start=start,
    interval_end=end,
    group_by=["userId", "routingStatus"],
)

# reshape to one row per user with columns per status
df_pivot = df_raw.pivot_table(
    index="userid",
    columns="routing_status",
    values="stats_sum_seconds",
    aggfunc="sum",
    fill_value=0,
).reset_index()

df_pivot["occupancy"] = df_pivot["INTERACTING"] / (
    df_pivot["INTERACTING"] + df_pivot["IDLE"]
)
df_pivot["nrt_rate"] = df_pivot["NOT_RESPONDING"] / (
    df_pivot["INTERACTING"] + df_pivot["IDLE"] + df_pivot["NOT_RESPONDING"]
)
```

That's the backbone. Occupancy and NRT rate per agent, normalized to the components that matter.

## The multiple-shifts problem

Here's the wrinkle you won't find in the Genesys docs. Agents do not all work a single continuous shift per day. In a real operation you will see:

- Agents on split shifts — a morning block and an evening block with a three-hour gap.
- Agents on rotating timezones — a week of US Eastern hours, a week of US Pacific.
- Night-shift coverage handing off to day-shift with a twenty-minute overlap.
- Agents covering two different sub-queues in the same shift.

A naive "shift = 9 AM to 5 PM" query will miscount every one of these. You need to derive shift boundaries from the data, not from a schedule.

The heuristic I use: pull the agent's routing-status events, sort by timestamp, and split into shifts wherever there's a gap of more than 90 minutes with no `INTERACTING` or `IDLE` activity. Ninety minutes is the tuning parameter — it needs to be long enough to count a real break and short enough to not merge a split shift into one. If your operation has one-hour lunches built into schedules, bump it up. If your operation does fifteen-minute crossovers, bump it down.

```python
def split_into_shifts(df_events: pd.DataFrame, gap_minutes: int = 90) -> pd.DataFrame:
    df = df_events.sort_values("event_time").copy()
    df["gap_min"] = df["event_time"].diff().dt.total_seconds().div(60)
    df["shift_id"] = (df["gap_min"] > gap_minutes).cumsum()
    return df
```

Then occupancy calculations happen per `(user_id, shift_id)` and roll up to a weighted daily or weekly figure.

## Percentile-based bucketing

Here's where the technique actually pays off. Once you have per-agent occupancy and NRT rate across a rolling window, you bucket agents against their peers — not against a fixed threshold.

```python
def bucket_agents(
    df: pd.DataFrame,
    occupancy_col: str = "occupancy",
    nrt_col: str = "nrt_rate",
    percentile_cut_low: int = 25,
    percentile_cut_high: int = 75,
) -> pd.DataFrame:
    """
    Poor    = below 25th pct occupancy OR above 75th pct NRT
    Good    = above 75th pct occupancy AND below 25th pct NRT
    Average = everyone else
    """
    occ_low = df[occupancy_col].quantile(percentile_cut_low / 100)
    occ_high = df[occupancy_col].quantile(percentile_cut_high / 100)
    nrt_low = df[nrt_col].quantile(percentile_cut_low / 100)
    nrt_high = df[nrt_col].quantile(percentile_cut_high / 100)

    def label(row):
        if row[occupancy_col] < occ_low or row[nrt_col] > nrt_high:
            return "poor"
        if row[occupancy_col] > occ_high and row[nrt_col] < nrt_low:
            return "good"
        return "average"

    df = df.copy()
    df["bucket"] = df.apply(label, axis=1)
    return df
```

Why percentile-based and not absolute? Because absolute thresholds drift with queue volume. A 70% occupancy threshold that was "good" in a quiet quarter becomes "the median" in a peak quarter. If you're trying to have a coaching conversation that says "you're in the bottom quartile of your peers" you want that to mean something relative to the operational reality of that quarter, not relative to a number somebody set eighteen months ago.

The percentile cutoffs (25 / 75 in the example — the actual cutoffs you tune in production are a different conversation) are the stable handle.

## Edge cases that matter

Three edge cases will bite you if you don't handle them explicitly.

**New hires and low-sample agents.** An agent with three days of data will have unstable occupancy numbers. Exclude them from the percentile pool until they cross a sample-size threshold — say, 40 hours of on-queue time. Include them in the report, but label them `insufficient_sample` instead of bucketing them.

**Post-training or return-from-leave agents.** The first two weeks after training or a long leave will look terrible on any occupancy metric. Carve out a cohort label for them, and exclude them from the percentile pool used to compute thresholds. You still report their numbers; you just don't let them pull down the distribution.

**Mixed-role agents.** An agent who handles both tier-1 voice and tier-2 email has a different occupancy profile than either a pure tier-1 or a pure tier-2 agent. Bucket them within their role cohort, not against the whole floor.

Getting these three right is the difference between a bucketing system that gets used for coaching and a bucketing system that generates HR complaints.

## The Genesys API specifics

A few things the Genesys Cloud docs do not emphasize:

- The `analytics/users/aggregates/query` endpoint returns intervals, not totals. If you set a 30-day window with daily granularity, you get 30 rows per user per status. Sum yourself.
- Rate limits on this endpoint are stricter than on most other analytics endpoints. Page in 10,000-row chunks with a 500 ms delay between pages and you won't hit throttling.
- The `routingStatus` enum in the response uses SCREAMING_SNAKE_CASE (`INTERACTING`, `IDLE`, `NOT_RESPONDING`). The filter field in the request uses camelCase (`routingStatus`). Don't ask me why.
- Time zones are UTC in every response. If you're reporting by agent shift, convert to local time *after* the aggregation, not before. Doing it before is how you end up with an event that straddles midnight and gets double-counted.
- The routing-status stream has occasional duplicate events at interval boundaries. Dedupe on `(userid, event_time, routing_status)` before you sum.

## The one-line takeaway

An aggregate metric is a confession that you have not yet decomposed the thing you're measuring. Decompose agent time into components, compute occupancy from first principles, bucket against peers using percentile thresholds, and handle new hires and split shifts explicitly. The payoff is coaching conversations that are specific instead of vague.
