---
title: "The IDs Don't Match: Cross-System Reconciliation Between Genesys and Salesforce"
date: 2025-10-28T04:00:00.000Z
---

# The IDs Don't Match

Here's the setup: agents handle customer conversations in Genesys Cloud. They log outcomes in Salesforce cases. The only thing connecting the two systems is a conversation ID that an agent types — by hand — into a Salesforce field after the call ends.

You can see where this is going.

The first time I got asked "can you pull the conversation from case 12345?" and the conversation ID in the Salesforce field didn't exist in Genesys, I thought it was a one-off. An agent fat-fingered a UUID. Annoying. Fixable.

Then it happened again. And again. And then I ran a reconciliation query across a month of cases and found that somewhere between three and six percent of them had either no conversation ID, an invalid one, or one that pointed to a conversation from the wrong media type. (Someone logged a voice-call ID into a field flagged as a chat, for example.)

That's when it stopped being a data-quality problem and became a process problem. And the way you fix process problems is you build a monitor that catches every new variant of the failure before someone asks you for the twentieth time why the conversation ID on case 12345 doesn't work.

This post is about the pattern I settled on, the six failure modes I ended up naming, and how to write each validation rule as a pure function so the whole thing composes cleanly.

## The six failure modes

Not every broken ID is broken in the same way. Lumping them together into "bad data" loses the signal. Here's how I categorized them:

1. **Missing linkage** — Salesforce case exists, but the conversation ID field is blank. Most common. Agents in a hurry.
2. **Orphan conversation** — Genesys conversation exists within the expected time window, but no Salesforce case references it. Second most common. The case was either never opened, or opened under a different customer record.
3. **Format drift** — The conversation ID field is populated, but it's not a valid UUID. Typos, copy-paste of a partial ID, someone pasted the customer's phone number instead.
4. **Media-type mismatch** — The conversation ID points to a real Genesys conversation, but the case's channel field says "voice" and the conversation was actually a chat. (Or vice versa. This one reveals routing bugs, not data bugs.)
5. **Temporal drift** — The conversation exists, the case exists, the IDs match, but the timestamps are off by more than a tolerance window. A call from Tuesday attached to a case opened Thursday is not necessarily wrong — agents do follow-ups — but it's worth looking at.
6. **Duplicate linkage** — The same conversation ID appears in multiple Salesforce cases. Sometimes legitimate (a single call led to two separate cases for two issues), sometimes a symptom of case-duplication bugs in the automation layer.

Each of these needs a different response. Missing linkage and format drift are agent-training issues. Media-type mismatches point at routing configuration. Duplicates usually mean the case-creation flow has a race condition somewhere. Building one undifferentiated "data quality report" loses the whole point.

## Validators as pure functions

The architecture I landed on: every validator is a pure function that takes two DataFrames — one for cases, one for conversations — and returns a DataFrame of failures with a consistent schema.

```python
from typing import Callable
import pandas as pd

Validator = Callable[[pd.DataFrame, pd.DataFrame], pd.DataFrame]

def missing_linkage(df_cases: pd.DataFrame, df_convos: pd.DataFrame) -> pd.DataFrame:
    """Cases with no conversation ID populated."""
    failures = df_cases[
        df_cases["conversation_id"].isna() | (df_cases["conversation_id"] == "")
    ].copy()
    failures["failure_type"] = "missing_linkage"
    failures["failure_detail"] = "conversation_id field is empty"
    return failures[["case_id", "case_created", "agent_email", "failure_type", "failure_detail"]]
```

That's it. One function, one failure mode. The output schema is consistent. Adding a new rule is adding a new function. Composing them is a concat:

```python
def run_all_validators(
    validators: list[Validator],
    df_cases: pd.DataFrame,
    df_convos: pd.DataFrame,
) -> pd.DataFrame:
    return pd.concat(
        [v(df_cases, df_convos) for v in validators],
        ignore_index=True,
    )
```

And the driver script just declares the list:

```python
VALIDATORS = [
    missing_linkage,
    orphan_conversation,
    format_drift,
    media_type_mismatch,
    temporal_drift,
    duplicate_linkage,
]

report = run_all_validators(VALIDATORS, df_cases, df_convos)
```

This is the part I care about. Not the specific rules — the composability. Six months from now when someone hands me a seventh failure mode, I don't want to refactor the reporting logic. I want to add one function.

## Three rules, fully implemented

Here's what `format_drift` actually looks like:

```python
import re

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

def format_drift(df_cases: pd.DataFrame, df_convos: pd.DataFrame) -> pd.DataFrame:
    """Cases where the conversation ID is present but not a valid UUID."""
    populated = df_cases[
        df_cases["conversation_id"].notna() & (df_cases["conversation_id"] != "")
    ].copy()
    populated["valid_format"] = populated["conversation_id"].str.match(UUID_RE)
    failures = populated[~populated["valid_format"]].copy()
    failures["failure_type"] = "format_drift"
    failures["failure_detail"] = failures["conversation_id"].apply(
        lambda x: f"not a UUID: '{x[:50]}'" if isinstance(x, str) else "non-string value"
    )
    return failures[["case_id", "case_created", "agent_email", "failure_type", "failure_detail"]]
```

The only subtlety is the `failure_detail` column carrying a preview of the bad value, which saves the ops team a query when they're trying to figure out what an agent actually typed.

Here's `media_type_mismatch`, the one that reveals routing bugs rather than data bugs:

```python
def media_type_mismatch(df_cases: pd.DataFrame, df_convos: pd.DataFrame) -> pd.DataFrame:
    """Cases whose declared channel disagrees with the linked conversation's media type."""
    joined = df_cases.merge(
        df_convos[["conversation_id", "media_type"]],
        on="conversation_id",
        how="inner",
    )
    failures = joined[
        joined["case_channel"].str.lower() != joined["media_type"].str.lower()
    ].copy()
    failures["failure_type"] = "media_type_mismatch"
    failures["failure_detail"] = failures.apply(
        lambda r: f"case says {r['case_channel']}, conversation is {r['media_type']}",
        axis=1,
    )
    return failures[["case_id", "case_created", "agent_email", "failure_type", "failure_detail"]]
```

And `duplicate_linkage`:

```python
def duplicate_linkage(df_cases: pd.DataFrame, df_convos: pd.DataFrame) -> pd.DataFrame:
    """Same conversation_id attached to multiple cases."""
    counts = df_cases.groupby("conversation_id").size().reset_index(name="case_count")
    dupes = counts[counts["case_count"] > 1]["conversation_id"].tolist()
    failures = df_cases[df_cases["conversation_id"].isin(dupes)].copy()
    failures["failure_type"] = "duplicate_linkage"
    failures["failure_detail"] = failures["conversation_id"].map(
        {cid: f"linked to {counts.loc[counts.conversation_id == cid, 'case_count'].values[0]} cases" for cid in dupes}
    )
    return failures[["case_id", "case_created", "agent_email", "failure_type", "failure_detail"]]
```

All three share the same shape: two DataFrames in, failures with consistent schema out. Adding `temporal_drift` and `orphan_conversation` follows the same template — I'll leave them as exercises, because if you've read this far you don't need me walking through two more for-loops.

## Running it daily

The mistake I almost made was running this once, fixing the failures, and walking away. That was wrong.

Bad data is not a one-time event. It's continuous. Every day agents make new typos, the routing config changes for a new campaign, a new integration starts populating the conversation-ID field inconsistently. The validator is a daily job, not a migration script.

The pipeline runs at 4 AM, queries Salesforce for cases created in the previous business day, pulls Genesys conversations for the same window via the Analytics API, runs all six validators, and emails the output to ops.

Key observation: the absolute failure count is less interesting than the day-over-day delta. An uptick in `media_type_mismatch` on a specific agent pool usually means somebody changed a routing rule the day before. An uptick in `missing_linkage` the week after a new-hire cohort starts means training didn't cover the case-close workflow. The report is most valuable as a *change detector*, not an inventory.

## Generalizing beyond Genesys × Salesforce

The pattern isn't about call-center tools. It's about any two systems connected by a human-populated link field. A partial list of pairs I've seen break in similar ways:

- **Stripe ↔ CRM.** Payment IDs typed into a CRM deal field.
- **Jira ↔ GitHub.** PR descriptions that should but don't reference ticket IDs.
- **Zendesk ↔ Salesforce.** Ticket IDs in a Salesforce activity.
- **HubSpot ↔ internal billing.** Account references copy-pasted between systems with different ID formats.

In every case, the same six categories apply with minor tweaks. Missing linkage. Orphan. Format drift. Type mismatch (or category mismatch). Temporal drift. Duplicate. Build the validators as pure functions, run them daily, watch the deltas.

## The one-line takeaway

If your integration between two systems depends on a human typing an ID, you don't have an integration. You have a pattern of future failures you haven't catalogued yet. Catalogue them.
