---
title: 'Automating Microsoft 365 in Python Without an Azure App Registration'
date: 2025-12-30T05:00:00.000Z
---

# Automating Microsoft 365 in Python Without an Azure App Registration

At my previous gig, I had the luxury of an Azure app registration. Service principal, client secret, `https://graph.microsoft.com/.default` scope, app-level permissions for `Mail.Send`, `Mail.ReadWrite.Shared`, `Sites.ReadWrite.All`, and a couple dozen others the admin had graciously approved. Every scheduled Python job that touched Microsoft 365, roughly twenty ETLs on daily, weekly, and monthly cadences, authenticated headlessly via client credentials, never prompted a human, and ran for a year without a single auth-related failure.

At my current gig I asked for the same thing. My current security team said no.

This is the story of the pivot, from client credentials to device code, from service-principal identity to my own user identity, from "headless forever" to "re-auth roughly every ninety days", and the wrapper I had to rebuild on the other side of it. It is also, quietly, a post about how to make the right call when the right call isn't on the menu and the second-best one is the one that actually ships.

## The previous setup: client credentials, unattended forever

At the previous job, the MS365 automation stack was a model of boring, reliable infrastructure. The admin had created an Azure app registration, a service principal, with a client ID, a client secret (rotated quarterly), and a tenant ID. The registered app had admin-granted application-level permissions for exactly the Graph API surface we needed: mail send, mail read in specific shared mailboxes, Teams messages through incoming webhooks, SharePoint site read/write in specific site collections, calendar read for the operations team.

The auth code, in its entirety, was this:

```python
from msal import ConfidentialClientApplication

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"

app = ConfidentialClientApplication(
    client_id=CLIENT_ID,
    client_credential=CLIENT_SECRET,
    authority=AUTHORITY,
)

result = app.acquire_token_for_client(
    scopes=["https://graph.microsoft.com/.default"]
)
token = result["access_token"]
```

That's it. The app had its own identity. It wasn't signing in as any user. It didn't need a user to consent to anything. It got a fresh access token every hour, refreshed silently, ran unattended on a Windows VM at two in the morning, and never prompted anyone for anything.

The wrapper layer on top was simple: a `send_email(to, subject, body, from_mailbox=...)` that called `/users/{from_mailbox}/sendMail`, a `download_sharepoint_file(site, path)` that called `/sites/{site}/drive/items/{id}`, a `post_teams_card(webhook_url, payload)` that POSTed to an incoming-webhook URL the admin had provisioned. All of it was "app acts as itself, using admin-granted permissions, against any mailbox or site the admin whitelisted." Clean. Auditable. Unattended.

The app registration itself had taken InfoSec about six weeks to approve when it was first requested a year before I joined. Once it existed, using it was a matter of reading three env vars and going.

## The pivot: security says no

At my current gig I asked for a similar app registration and got a different answer. Not "no, here's an alternative", just "no."

Different org, different security posture, different threat model, different memory of past incidents. All of that is reasonable. Azure app registrations with application-level Graph permissions are legitimately powerful, `Mail.ReadWrite` at the app level means the app can read any mailbox in the tenant, and the blast radius of a leaked client secret is not hypothetical. Some security teams have been burned. Some have read the Microsoft security incidents of recent years and concluded that the cleanest policy is "no app registrations requesting Graph app permissions, period."

I disagreed with the policy, and I still disagree with it, because it is the wrong policy for an analytics team that needs to move. But I had a choice: wait indefinitely for a policy change that may never come, or ship the work within whatever auth option was actually available. I chose to ship.

The question became: what was actually available?

## The alternative: MSAL device code with a first-party client ID

MSAL supports a **device code flow** for **public client applications**, client IDs that don't require a client secret, because they're intended to run on untrusted devices (CLIs, scripts on laptops, desktop apps). You kick off the auth, MSAL gives you back a URL (`https://microsoft.com/devicelogin`) and a short code, you open the URL in a browser, paste the code, sign in with your regular user credentials (including MFA if your org enforces it), grant consent to the scopes being requested, and the script receives an access token plus a refresh token.

The trick is the client ID. You don't need to register your own app, Microsoft publishes a handful of **first-party app IDs** that are preauthorized for common scope sets and that admins rarely block, because blocking them would break legitimate Microsoft tooling. The Azure CLI's client ID (`04b07795-8ddb-461a-bbee-02f9e1bf7b46`) is one. The Microsoft Graph PowerShell SDK's (`14d82eec-204b-4c2f-b7e8-296a70dab67e`) is another. The Office first-party client ID (`d3590ed6-52b3-4102-aeff-aad2292ab01c`) is the one I ended up on, because it comes preauthorized for SharePoint `.default` scopes in addition to Graph, which simplified the SharePoint side of the wrapper.

These are public. They're documented in MSAL and Microsoft's Identity Platform docs. You're not smuggling anything, you're using the same client ID that the Azure CLI uses when it signs you in, because your script has a similar trust profile to the Azure CLI (an on-disk tool that a human invokes, with an auditable cache, acting as that human). The actual permission boundary is *your user account* plus *the consent you granted on first auth*, not some admin-granted app identity.

What you get in exchange for user-delegated auth: no app registration required, no admin involvement on the security side, and an auth path that already works because your admin hasn't bothered to block the Azure CLI.

What you give up: application identity, unattended-forever operation, and the ability to act against any mailbox you weren't personally granted access to.

## The code: silent first, device code on fallback

Here's the core of the current wrapper's `get_token`. I'll walk through the pieces after.

```python
import msal
from pathlib import Path

OFFICE_CLIENT_ID = "d3590ed6-52b3-4102-aeff-aad2292ab01c"
AUTHORITY = "https://login.microsoftonline.com/organizations"

# Request a broad scope set upfront so MSAL caches one token that covers
# mail, calendar, Teams, Files, etc. Silent auth later finds the cached
# token and satisfies narrower scope requests from it.
GRAPH_SCOPES = [
    "Mail.Send", "Mail.ReadWrite",
    "Calendar.ReadWrite", "Calendars.Read.Shared",
    "Chat.ReadWrite", "Chat.Create",
    "ChannelMessage.Send", "Channel.ReadBasic.All",
    "Team.ReadBasic.All",
    "Files.Read", "Files.ReadWrite.All",
    "Tasks.ReadWrite",
    "User.Read.All",
]

CACHE_DIR = Path.home() / ".ms365_utils"
CACHE_PATH = CACHE_DIR / ".msal_token_cache.json"


def get_token(scopes: list[str]) -> str:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    cache = msal.SerializableTokenCache()
    if CACHE_PATH.exists():
        cache.deserialize(CACHE_PATH.read_text(encoding="utf-8"))

    app = msal.PublicClientApplication(
        OFFICE_CLIENT_ID,
        authority=AUTHORITY,
        token_cache=cache,
    )

    # Request the broad scope set for non-SharePoint calls; SharePoint's
    # ".default" scopes are passed through as given.
    is_sharepoint = any(".default" in s for s in scopes)
    request_scopes = scopes if is_sharepoint else GRAPH_SCOPES

    # Silent first
    accounts = app.get_accounts()
    if accounts:
        result = app.acquire_token_silent(request_scopes, account=accounts[0])
        if result and "access_token" in result:
            _save_cache(cache)
            return result["access_token"]

    # Device code fallback
    flow = app.initiate_device_flow(scopes=request_scopes)
    if "user_code" not in flow:
        raise RuntimeError(f"Device code init failed: {flow}")
    print(flow["message"])  # "To sign in, go to https://... and enter code ABCD-1234"

    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        raise RuntimeError(f"Device code auth failed: {result}")

    _save_cache(cache)
    return result["access_token"]


def _save_cache(cache: msal.SerializableTokenCache) -> None:
    if cache.has_state_changed:
        CACHE_PATH.write_text(cache.serialize(), encoding="utf-8")
```

Three moving pieces.

**MSAL's `SerializableTokenCache`.** This is MSAL's disk-backed cache. Every time MSAL acquires or refreshes a token, the cache state changes, and we serialize it back to disk after the call. On startup, we deserialize it. The cache contains the refresh token plus account metadata, which is what makes silent auth possible across process restarts.

**Silent auth first, device code on failure.** MSAL's `acquire_token_silent` will use the cached refresh token to get a fresh access token without user interaction, as long as the refresh token is still valid. If it fails, refresh token expired, conditional access policy changed, tenant forced re-auth, we fall back to `initiate_device_flow` + `acquire_token_by_device_flow`, which is the code-and-browser dance.

**Broad-scope request upfront.** This is the trick that makes the wrapper usable across services without re-prompting every time. If you request `["Mail.Send"]` on first auth, MSAL caches a token scoped to `Mail.Send`. Later when some other function asks for `["Chat.ReadWrite"]`, silent auth fails on scope mismatch and falls through to device code flow, which you do not want, because the user would see "please grant consent again" a dozen times across a work session. By requesting the full list upfront, you pay for consent once and every narrower scope request after that is satisfied from the cached broad token. The SharePoint `.default` path is the one exception, because `.default` means "all the scopes this app is preauthorized for" and MSAL treats it as its own thing.

## The persistent token cache in plain language

The cache lives at `~/.ms365_utils/.msal_token_cache.json`. It's a JSON file. It contains:

- Your tenant ID
- Your home account ID (a stable identifier MSAL uses to correlate accounts)
- A refresh token (it's a long opaque string, not literally encrypted, MSAL relies on filesystem permissions to keep it private)
- A recently-issued access token, which expires in an hour and gets rotated automatically

If you leak this file, you've leaked your own Microsoft identity for up to the refresh token lifetime, which is up to 90 days by default. Treat it like SSH private keys, not in a repo, not in a shared folder, not on a USB drive, not in an unencrypted backup.

A separate metadata file sits alongside it tracking when the user last went through the interactive flow:

```json
{
  "last_interactive_auth": "2025-12-16T03:42:17.008412+00:00",
  "last_silent_auth": "2025-12-30T14:22:05.992341+00:00"
}
```

`last_interactive_auth` is the field that matters for observability. The refresh token is valid for roughly 90 days from that timestamp (give or take tenant conditional access rules). When it's been 83 days, I want my scripts warning me. When it's been 90, they should fail loudly so I don't lose a day wondering why a scheduled job stopped producing output.

```python
def check_token_health() -> dict:
    meta = _load_auth_meta(CACHE_DIR)
    last = meta.get("last_interactive_auth")
    if last is None:
        return {"status": "unknown", "days_remaining": None, "last_auth": None}

    from datetime import datetime, timezone
    dt = datetime.fromisoformat(last)
    days_since = (datetime.now(timezone.utc) - dt).days
    remaining = 90 - days_since

    if remaining <= 0:
        status = "expired"
    elif remaining <= 7:
        status = "warning"
    else:
        status = "ok"

    return {"status": status, "days_remaining": max(remaining, 0), "last_auth": last}
```

I run this from a PowerShell startup script on my laptop and from the front of every scheduled job. If it returns `"warning"`, I re-auth that day. The device code flow takes thirty seconds, one tab, one code, done, and the cache is good for another 90 days.

## What I had to rebuild (and what I had to give up)

The previous wrapper was a handful of thin functions around Graph endpoints, all parameterized on "who should the app act as" (via `/users/{mailbox}/sendMail` with the mailbox explicitly named). The current wrapper is a handful of thin functions around Graph endpoints, all parameterized on "you, as yourself" (via `/me/sendMail`, `/me/events`, `/me/drive/items/...`).

Functionally the shape is similar:

```python
# Previous (app auth)
send_email(
    from_mailbox="analytics-notifications@example.com",
    to=["ops@example.com"],
    subject="[ETL] Daily run complete",
    body=...,
)

# Current (user auth)
send_email(
    to=["ops@example.com"],
    subject="[ETL] Daily run complete",
    body=...,
)
# implicit: sent as me, from my mailbox
```

The operational implications are not small.

**Sending from a shared mailbox.** Previously, all ETL notifications came from `analytics-notifications@example.com`, a dedicated mailbox the admin had provisioned. Clean separation between "email from the system" and "email from a human." Now, all ETL notifications come from me. If I leave, they go with me. I work around this by having the recipients set up an Outlook rule that flags my ETL-sent emails into a separate folder, which is worse than a service mailbox but is what I can do inside the constraints.

**Reading shared mailboxes.** Previously, reading an ops-team shared mailbox was `/users/ops-shared@example.com/messages` with `Mail.Read.Shared` app permission. Now, reading any mailbox that isn't mine requires someone explicitly delegating Full Access or Folder Access to my user account in Outlook, and then the Graph calls go through `/users/ops-shared@example.com/messages` with user-delegated auth. It works, but the delegation has to be set up per mailbox, by the owner, with admin involvement in some cases.

**Teams notifications.** Incoming webhook URLs are being deprecated by Microsoft anyway, so the shift was inevitable for anyone with webhooks in their stack. The current wrapper uses `/chats/{id}/messages` and `/teams/{id}/channels/{id}/messages` with user-delegated auth, the message shows up as from me. That's fine for most use cases and mildly awkward for a few (the ETL-failure notification looks like I personally wrote it at 3 AM, which, depending on how your colleagues read subtext, may create the wrong impression).

**Unattended operation.** The 90-day re-auth window is the most annoying downgrade. For the first month it felt like nothing, because I hadn't hit the threshold yet. The first time a scheduled job failed at the three-month mark because the refresh token had finally expired, I understood in a visceral way why service-principal auth exists.

## The trade-offs, laid out

| Dimension | Client credentials (previous) | Device code (current) |
|---|---|---|
| Azure app registration required | Yes, admin-approved | No |
| Client secret to manage | Yes (rotate quarterly) | No |
| Identity in audit logs | Service principal | Your user |
| Permission surface | App-level, admin-granted | User-delegated, user-consented |
| Breadth of access | Whatever admin grants | Whatever you personally have |
| Unattended operation | Fully | Semi (re-prompts ~every 90 days) |
| Initial token acquisition | Seconds | Device-code flow in a browser |
| Time to set up | Weeks of InfoSec review | Minutes |
| Can act on behalf of other users | Yes | No, only as you |
| Shared-mailbox access | Via app permission | Via user delegation |
| Headless server operation | Native | Awkward (initial consent needs a browser) |
| Failure mode | Client-secret rotation or revocation | Refresh-token expiry |
| Recovery time from failure | Rotate secret, restart | Re-run device code flow |

The previous column is strictly better on every production-automation dimension that matters. The current column is strictly better on every organizational-constraint dimension that matters. You pick the one you can actually use.

## When to use which

**If you can get an Azure app registration** with the app-level Graph permissions you need: use it. Use client credentials. Don't overthink it. The unattended-forever story is worth the six-week InfoSec review, because you only pay that cost once and you never think about it again.

**If you can't**, and you're running automation that needs to touch Microsoft 365: device code plus persistent cache plus broad-scope-on-first-auth is the viable fallback. Accept the 90-day re-auth overhead. Build the token-health check. Wire up a single reminder somewhere in your workflow that runs `check_token_health()` and tells you to re-auth before things break.

**If your security team forbids user-delegated tokens cached to disk at all**: go have a conversation with them. Sometimes the answer is managed identities (if you're running on Azure-hosted infrastructure). Sometimes it's a service account with its own credentials. Sometimes it's "you simply cannot automate this and will have to do it by hand," which is the correct answer for genuinely sensitive operations. But you need to have the conversation explicitly, "security says no app registration" is not the same as "security forbids all forms of automation," and it's worth finding out which one you're actually dealing with.

## Where I've landed

About four months in, the current wrapper is doing its job. The scheduled jobs that need Microsoft 365 access run semi-unattended. I re-auth once a quarter. The trade-offs are visible but contained. Some work that would have been trivial in the previous setup is harder here, cross-user mailbox access in particular, and some of it I've stopped trying to automate altogether because the effort-to-value ratio crossed a threshold.

The bigger lesson, for me, is less about MS365 specifically and more about picking your battles with security. You will, at some point, inherit or land in an organization whose security posture is more conservative than the one you're used to. You can spend quarters lobbying for policy changes. You can also ship the work within the constraints and revisit the policy question from a position of demonstrated production experience. I've found the latter reliably more productive.

## The one-line takeaway

The right architecture is the one your security team will approve. When the right one isn't on the menu, the second-best one that actually ships is the architecture that wins. For Microsoft 365 in Python, that means MSAL device-code flow, a first-party Office client ID, a broad-scope token request on first auth, and a persistent on-disk cache, with a 90-day re-auth cycle as the price of admission. Pay it and move on.
