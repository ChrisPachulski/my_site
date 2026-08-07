---
title: 'The Emerald Exchange: One Household, One Bookmark, and the Specialists I Got to Stop Being'
date: 2026-05-17T04:00:00.000Z
---

# The Emerald Exchange

9:42pm. Someone in the house is on the couch with their phone, the living room dim, the TV playing background music, dinner cleared. They want to find one show they thought of mid-conversation, add it to the library, and put the phone down.

That sentence is from the design doc of the thing I built. I wrote it before I wrote a line of code, because the household media stack had been quietly user-hostile for years. The media server I run on an Unraid NAS, the *arr stack that pulls down content, the SAB queue that ferries it, the Plex web app it gets watched through, the operator chrome that ties them all together. Five surfaces, all of them designed for an operator, none of them designed for someone who is not. The way new content got requested for years was a text message to me, the resident operator.

The Emerald Exchange is what I built when I realized the operator did not need to be the bottleneck. One bookmark, four tabs, search-as-the-verb, every destructive action gated by a confirmation modal whose default is Cancel. Plex SSO so everyone signs in with the account they already have. AI-powered recommendations that learn from a red or green tap. A walkthrough on the unauthed landing that explains the household in sixty seconds, with video.

I work in econometrics. SQL and Python daily, R for the statistical work, Snowflake and DuckDB for the warehouse, seven years shipping production data systems. None of that prepared me to be a frontend designer, a video editor, an ML engineer wiring an LLM into a production loop, or an auth-and-infrastructure specialist standing up a Cloudflare Tunnel for the first time. The Emerald Exchange exists in its current form because Claude Code lowered the *per-feature cost* of being each of those, briefly, enough that one person could ship the surface the household needed.

This post is what that capability expansion looks like in practice. Nine days from the initial commit, around eighty pull requests, a `PRODUCT.md` that doubled as a stop-loss every time I caught myself drifting into operator-density territory, and four specialist roles I would never have taken on if the price of attempting each one had not dropped by an order of magnitude.

## The five operator UIs she had to put up with

Before the Emerald Exchange there were five surfaces in our household media stack. Each one is excellent at what it was designed for, and each one is hostile to a non-technical person who wants one specific outcome.

**Sonarr** is the canonical TV-series tracker. Add a series, monitor seasons, manage indexers, schedule searches. Its add-series flow has a calendar-pinned chrome, a series-folder-format field exposed by default, profile selectors that read like enterprise software, and a tabbed strip of history, files, statistics, and tags. Excellent for the operator. Wrong surface for the household.

**Radarr** is the same shape for movies. Same operator density, same chrome, same defaults requiring you to know what *monitor strategy* means before you can add a movie.

**SAB** (SABnzbd) is the download client downstream of both. A queue view with categories, priorities, post-processing scripts, scheduling, history, and a fifteen-link sidebar. The information is correct; the surface is for an admin who knows what each row implies.

**Plex web** is where you actually watch the thing once it has arrived. Plex is the best of the bunch for the household case, but it has its own problems: gradient hero rails, "Discover" upsell tiles marketing content we already own, a Tautulli-flavored stats panel I never asked it to surface.

**Homepage** (sometimes Homarr) is the homelab launcher that ties them all together. A tile grid of identical logo-plus-title cards. Excellent at what it does, which is launch the five operator UIs that I just told you were wrong for everyone else in the house. It does not solve the problem; it presents it as a menu.

The math of asking a non-operator to use any of those is: they have to know what `Series Folder Format` is, what a quality profile is, what a monitor strategy is, what SAB's category-prefix syntax is, what the difference between Plex's `Library` and `Discover` tabs is. None of that is information someone needs in order to watch Severance.

So the requests came as text messages, to me.

## The forcing function: PRODUCT.md, written before the code

I started the project with `PRODUCT.md`. Not a README. A product document, in the literal sense, describing the audience, the tone, the *anti*-references, and the strategic principles before a single component existed.

The anti-references section is the load-bearing part. It names, by URL and by behavior, every surface I am *not* trying to build:

- Sonarr and Radarr add-series pages, for the calendar-pinned chrome and the operator complexity leaking into a consumption surface
- Plex web, for the gradient hero rails and the marketing of content the household already owns
- Homepage and Homarr, for the tile-grid-of-identical-cards homelab cliché
- Netflix request flows, for the infinite-scroll recommendation rails
- Plex Dashboard and Tautulli, for operator stats masquerading as "for users"

Each anti-reference is a category cliché the design refuses, not a competitor. Naming them up front turned out to be the single most useful thing I did, because every time I drifted toward "we should add an Upcoming calendar strip showing what is airing this week" or "we should have a recently-added carousel," I went back to the anti-references file and asked which category cliché I was about to ship. Twice I shipped one anyway. Both got reverted within a week, by the same `PRODUCT.md` discipline that had warned me against shipping them.

The strategic principles followed:

1. The dashboard *is* the experience. No links to Sonarr or Radarr or SAB inside it.
2. One unified UI. No admin or family toggle. Same surface for every visitor.
3. Smart defaults make adding a show one click on the happy path.
4. Destructive is recoverable. Pause, cancel, remove from library, all behind a confirmation modal whose default is Cancel, and where Enter does not submit.
5. Search is the verb. The TV and Movies tabs are search surfaces, not browse surfaces.
6. Live where it matters, static where it does not. The Downloads tab polls every three seconds; the rest is request-driven.

Those six principles, written before the first component, became the only design review the project ever needed.

## V1: what one bookmark on the NAS could become

V1 was deliberately small. A static React SPA served by Nginx on the same Unraid box that already runs Sonarr, Radarr, and SAB as Docker containers, on port 8085 because Caddy already owns port 80 for the legacy paths. Both pathways coexist. The dashboard does not displace what was there; it sits next to it and quietly outcompetes it.

The Nginx config is the V1 trick. Each upstream API is reverse-proxied at a same-origin path, and the API keys are injected server-side so they never reach the browser:

```nginx
location /api/sonarr/ {
  proxy_pass http://sonarr-internal/;
  proxy_set_header X-Api-Key $SONARR_API_KEY;
}
```

Same shape for Radarr and SAB. The browser sees `fetch('/api/sonarr/series')`; the request goes to Nginx, which appends the key and forwards it. No CORS dance, no key on the client, no `.env` leaking into the bundle. A `Dockerfile` based on `nginx:alpine` plus `envsubst` substitutes the keys at container-start time from environment variables.

Inside the SPA, four tabs:

- **Watch** opens Plex, the only place the dashboard hands off, because it does not try to be a player.
- **TV** is a Sonarr-backed search-as-you-type surface with an *In Library* badge that breaks the poster corner, an AddSeriesModal with quality-profile and root-folder defaults pre-populated from the existing Sonarr config, and a remove flow that gates behind the confirmation modal.
- **Movies** is the Radarr mirror of TV.
- **Downloads** is the SAB queue with pause, resume, and cancel actions, polling at 3 Hz when the tab is visible and pausing the polling when it is not.

That was V1. A static dashboard at `http://theemeraldexchange.local:8085`, one bookmark on every device in the house, replacing the operator chrome of five surfaces with one. It worked. The text messages stopped.

I could have stopped there. Most of the value the household needed was in that release. The reason I did not is that once V1 was running, every "and then I could also" felt like it owed me a swing.

## Specialist #1: design (DESIGN.md, OKLCH, ice blocks, constellations)

The first thing I would never have done before was the visual design. Not the layout, which is a four-tab dashboard and could have looked like a thousand other React admin templates; the *aesthetic*. The decision to make the thing feel like something, rather than something generic.

The design started, again, with a document. `DESIGN.md` opens with "extreme inspiration" pointing at two studios that gate their work on advanced WebGL: igloo.inc for atmospheric depth, frozen-cathedral palette, and HUD-pod navigation; activetheory.net for pure-black cinema, 500-pixel-radius pill chips, and ASCII glyph punctuation. The note was explicit: *steal the chrome, not the chrome's prerequisites*. No WebGL hero scenes; no scroll hijacking; no brand wordmark at 40vw. The chrome carries the reference; the function stays instant.

Color was committed and locked. The product's name commits us; *Emerald* in the URL is a promise that *restrained* would betray and *drenched* would suffocate. One saturated emerald carries every accent: primary buttons, the *In Library* badge, the active tab indicator, the progress-bar fill, the focus ring. Every neutral is built from the same hue family using OKLCH so the surfaces feel related rather than tinted-by-accident.

```css
--bg          oklch(0.16 0.012 158)
--surface     oklch(0.20 0.014 158)
--surface-2   oklch(0.24 0.016 158)
--border      oklch(0.30 0.020 158)
--text        oklch(0.94 0.008 158)
--emerald     oklch(0.62 0.180 158)
--emerald-dim oklch(0.45 0.130 158)
--emerald-bg  oklch(0.30 0.080 158)
--danger      oklch(0.62 0.180 25)
```

Two laws the design refuses, and which I would never have enforced before:

- Never `#000` or `#fff`. The neutrals are tinted toward emerald in OKLCH so the surfaces never sit on the page like cardboard.
- Never em dashes in copy. Comma, semicolon, period, parens. Every copy review checks for them.

The signature visual moves are three. First, the **floating HUD pod** at the top, a pill-shaped capsule, centered, with internal hairline dividers between brand, tabs, and Watch, the one surface where backdrop blur is allowed because frost-on-glass is the literal metaphor for what is happening. Second, the **ice-block silhouette** on cards: a faint top-edge frost highlight from `box-shadow: inset 0 1px 0 var(--frost)`, plus a cool drop below. Third, the **constellation drift** in the background: a fixed SVG of pinpoints and lines at six percent opacity, drifting via `translateX` over eighty seconds, behind everything, no pointer events, disabled at `prefers-reduced-motion`.

Then there is the **ASCII glyph punctuation**. The literal ASCII, never the Unicode arrow or em-dash:

- `->` before action labels in copy
- `--` between paired metadata, as in `Severance -- 2022 -- Apple TV`
- `[ ]` brackets around micro-status, as in `[ DOWNLOADING ]`, `[ PAUSED ]`, `[ 47% ]`

They are texture, not iconography; they never replace a button's affordance. Buttons stay buttons.

I would not have written `DESIGN.md` six months ago. I would have grabbed a Tailwind UI template. Instead I spent two days iterating with Claude Code on the palette, the spacing rhythm, the ice-block silhouette, the constellation drift parameters. The aesthetic ended up feeling like a *private members' page* rather than a homelab launcher, which is what the document promised, and which I could not have built freehand.

## Specialist #2: video (the Kraken transition and the walkthrough product tour)

The second thing I would never have done was video.

The Emerald Exchange has an unauthed landing page. For three days that page was a login screen with three sentences explaining what the product was. It worked. Nobody who got the bookmark from a household member needed an explanation. But the V2 plan included a Cloudflare-Tunnel-fronted public domain at `theemeraldexchange.com` so my brother and his household could share the same product on a mutual-backup arrangement, and a login wall is the wrong first impression for someone who has been handed a URL with no context.

So the unauthed landing became a **walkthrough**. Not a marketing page. A *product tour*: live components, embedded videos showing the actual interactions, the same atmospheric overlay drifting behind everything. The walkthrough is what the unauthed visitor sees instead of a login form; the sign-in option lives in the corner.

The videos are short, ten to fifteen seconds each, demonstrating one interaction: search-as-you-type, the *In Library* badge breaking the poster corner, the confirmation modal catching a remove tap, the Downloads queue ticking forward at the polling cadence. They are the kind of thing a small studio would have produced with a budget; I produced them with Runway and a recording of the dashboard's actual behavior, color-graded to match the OKLCH neutrals so they do not feel like screen captures dropped into the page.

There is also a **nav transition**. The brand wordmark in the HUD pod sits next to an icon I started calling the Kraken: a stylized creature wrapped around the emerald gem, animated for about half a second on tab change. The motion sequence was assembled frame by frame in Claude Code; the styling went through about ten passes to get the creature centered on the page across phone, tablet, and 32:9 ultrawide aspect ratios without the silhouette breaking. There are commits in the log like *"Kraken: object-position center 35% to keep creature in frame on ultrawide"* that exist because I let myself care about the detail.

I would not have produced either of those before. Video edit and motion graphics is a discipline I have zero formal experience in. The walkthrough exists because the per-iteration cost of "try a take, color-grade it, check it on three devices, iterate" dropped from a weekend to an hour, and at that price I could be a video editor for a week and have the household get something for it.

## Specialist #3: AI (BYO key, red and green feedback, learn the rejection)

The third specialist role was AI suggestions. The feature is called the recommendation strip and it lives at the top of the Movies tab.

The shape: a horizontal row of poster cards above the search input, populated with three to five suggestions for the household. Each card has two small affordances at the bottom, a red dot and a green dot. Tapping green tells the system you would like more like this; tapping red tells it never to suggest this again.

The constraints I cared about were five:

1. **Bring your own key.** Each user pastes their own Anthropic API key into a small settings panel. The key never leaves their device's session; the dashboard proxies the call through its backend but uses the per-user key, not a shared one. Usage is tracked per user and visible to them in an Admin diagnostic panel.
2. **Learn from rejection persistently.** Red dots persist across sessions, per user. The reject list is sent into the Claude prompt as context every time, so the model never suggests something already declined. Greens persist similarly, as a likes list.
3. **Mirror the household's library distribution.** Without that constraint the model recommends from the long tail of what it knows; with it, the recommendations feel like they came from someone who actually understands what we already own. The library is sampled by genre proportion, fed into the prompt, and the model is asked to suggest in the same distribution.
4. **Validate and retry on tool use.** The first version of the recommender used a one-shot tool call to TMDB. About a quarter of the responses came back with hallucinated IDs or titles that did not exist. The fix was to enforce tool use as a validate-and-retry loop: the model proposes, the backend validates each proposed title against TMDB by name match, and rejections feed back into the next call as constraints. After the change, the trending strip stopped going empty.
5. **Cap the prompt size.** As the reject list grew it threatened to dominate the prompt window. The cap is currently set to the most recent two hundred rejections, plus a summary of older ones. Greens are unconstrained because they are rare.

The feature is off by default. Users toggle it on from a small switch anchored at the bottom-right of the strip. Off means the strip shows trending-this-week from TMDB instead, deduplicated against the household's library by title (catching subtitle differences so we do not recommend *The Bear* when we already have *The Bear: Season 1*) and pre-validated by title to avoid hallucinations.

The thing I want to be precise about: I have not previously shipped anything that calls an LLM as part of its production loop. I have analyzed LLM outputs. I have written prompts. But the discipline of *productionizing* an LLM call, with per-user keys and persistent feedback and prompt-window management and validate-and-retry tool-use enforcement, is a different skill, and one I would not have taken on before the per-feature cost dropped.

## Specialist #4: auth and multi-tenancy

The fourth role was the one I expected to enjoy least, and which turned out to be the most interesting.

V1 was a single-tenant tool on a single NAS at a `.local` hostname. V2 is two hosts: the SPA on Netlify at `theemeraldexchange.com`, the Hono backend on the NAS behind a Cloudflare Tunnel at `api.theemeraldexchange.com`. Splitting them was unavoidable once the brand became public; a `.env.local` containing five service API keys is not something you ship to a browser, and the Sonarr, Radarr, and SAB endpoints are not things you expose to the public internet under any circumstance.

The auth layer is **Plex SSO**. Users sign in with the Plex account they already have for the household media server. The handshake is the standard Plex OAuth flow; the backend exchanges the resulting token for the user's Plex identity, then issues a session cookie scoped to the API domain. Roles are gated by an `ADMINS` environment variable listing Plex usernames; admins see additional tabs and admin-only actions, household members do not. Everyone sees the same surface; the admin affordances are not hidden, they are just inert for non-admins, which keeps the unified-UI principle honest.

There were two interesting failure modes worth naming. The first was that the initial implementation logged users out when their session crossed the Cloudflare Tunnel boundary, because the cookie domain was not set wide enough; the fix was a parent-domain cookie scoped to `.theemeraldexchange.com`. The second was that the walkthrough had to ship *before* the auth boundary, because the unauthed visitor needs to see the product to decide whether to sign in. Originally the walkthrough lived at `/my_site` (a deliberately obscure path so it would not compete with the dashboard); a later refactor made the walkthrough *be* the unauthed landing and retired the dedicated login screen entirely. The sign-in pill sits in the corner of the walkthrough, where it does not interrupt the product tour.

The Cloudflare Tunnel itself was a separate sub-project. The cloudflared connector runs in a Docker container on the NAS, holds a long-lived token, and exposes the Hono backend at `127.0.0.1:3001` to the public hostname without opening any inbound port on the home router. The deploy script `scripts/deploy-nas.sh` does the rsync, the env-file ship, and the `docker compose up -d --build` in one shot. The Netlify side auto-deploys on `git push` to main. Two separate pipelines for two separate concerns.

I had not stood up a Plex SSO flow before. I had not configured a Cloudflare Tunnel before. I had not run a parent-domain cookie across a SPA-plus-API split before. Each of those is a specialist domain in its own right, and each of them took an afternoon instead of a week because the per-step cost was low enough that I could try, fail, fix, and try again at human iteration speed.

## Observability that survives the household

A feature that does not get its own headline but is worth naming, because it is the difference between a product and a script that happens to render React: the observability backbone.

Every download the dashboard initiates is logged. Every Anthropic call is logged with per-user attribution, token counts, and outcome (accepted, red-dotted, ignored). Every Plex SSO handshake records the user, the device, the result. There is a persistent grab log on disk and an admin-only diagnostic panel in the dashboard that surfaces all of it, with filters by user and date range.

The grab log exists because the failure mode I cared about most was *silent failure*. The household member adds something, the dashboard says it was added, and then it never arrives. Without instrumentation, the next signal is a text message asking "is The Bear coming?" three days later, by which point the trail is cold. With instrumentation, I can open the diagnostic panel and see that Sonarr accepted the request, SAB grabbed an NZB, post-processing failed because the release had a malformed naming pattern, the file ended up in the wrong directory. The fix is then mechanical.

The instrumentation also surfaces the AI-suggestion failure modes I would not otherwise have noticed: prompts that exceeded the size cap and got truncated, tool calls that retried more than three times before succeeding, library-genre samples that came back skewed because a user's library was unusually mono-genre. None of those would have shown up in a casual "does it work" test; all of them affect the quality of the household's experience over weeks.

I did not build any of that as a separate phase. Each route added its own log line as it was written. The diagnostic panel was a single afternoon after enough route lines had accumulated to want a viewer. Instrumentation-as-you-go was cheap because the per-line cost was low enough that adding it never felt like extra work.

## What got cut, and why the rejection backbone matters

A nine-day sprint that ships around eighty PRs and adds zero deadweight is a nine-day sprint that cut a lot of features. Three are worth naming because they were `PRODUCT.md` doing its job:

**The Upcoming calendar strip.** Sonarr and Radarr both publish a calendar of what is airing this week. For two days I shipped a Downloads-tab strip that merged the two calendars and surfaced what was incoming. It was lovely. It was Ombi-parity bloat. The household does not have a job for "what is airing this week" that is not already covered by Plex sending an email when something downloads. Reverted in PR #49, with the commit message *"Revert Upcoming calendar strip, Ombi-parity bloat, no user job."*

**The Tautulli stats panel.** Plex has a sister project called Tautulli that gives you per-user watch stats: hours streamed, top-watched shows, peak streaming hours. It is beautiful operator software. The anti-references file calls it out by name: *"operator stats and graphs masquerading as for-users."* I did not ship it. Twice during the build I had to not ship it after talking myself into it during a feature-creep moment.

**The settings panel.** V1 had no settings panel; defaults inherit from the underlying Sonarr, Radarr, and SAB configurations. I had a plan to ship a V2 settings panel exposing quality profiles, root folders, and download paths. It would have been ten more PRs. The unified-UI principle and the smart-defaults principle, together, made the settings panel deferred to V2.x or never; on the happy path the household never needs to touch a setting, and on the unhappy path the operator (me) can still SSH into the NAS.

Each of those cuts is a feature I built or scoped and then walked away from. The `PRODUCT.md` document was the only stop-loss I had against the gravity of *"but it would be cool if."* It worked because it was specific. "We do not ship operator stats masquerading as user features" is a rule I can apply to a candidate feature at the PR-review moment; "be tasteful" is not.

## The per-feature cost

The Emerald Exchange is a four-tab dashboard for a two-adult household, with one brother on a mutual-backup arrangement to come. Beneath that surface is: a static SPA with self-hosted Space Grotesk and a hand-built OKLCH design system; an Nginx-then-Hono backend that proxies five upstream services and injects their API keys; a Plex SSO flow with admin and household role gating; a Cloudflare Tunnel splitting the public SPA from the LAN-only backend; a recommendation system that uses each user's Anthropic key with persistent red and green feedback and library-genre-mirrored prompts; a video walkthrough that ships as the unauthed landing; a Discord webhook notifier for new arrivals; an observability backbone with a persistent grab log and an admin diagnostic panel.

That shipped in nine days, from the initial commit on May 8 to this post on May 17, written by an econometrics analyst whose day job is models and warehouses, not React and Runway and Cloudflare.

The thing I want to be careful about claiming is that I shipped it *well*. I think the dashboard works, and it gets used nightly, and that is the only test that matters in this house. But I did not become a frontend designer or a video editor or an ML engineer or an infrastructure specialist over those nine days. I rented each role for the time it took to ship the thing the household needed, and at the end I was no more those people than I was at the start.

What changed is the cost. The cost of trying a palette and looking at it on the actual device. The cost of cutting a fifteen-second walkthrough video and color-grading it to match. The cost of standing up a Cloudflare Tunnel for the first time and configuring its connector. The cost of writing a validate-and-retry tool-use loop and watching it not hallucinate. Each of those costs used to be a weekend; now each is an hour. At an hour each, one analyst can be four specialists for a day or two each and still ship the bookmark the household needed.

The household has one bookmark now. It replaced five operator UIs. Everything between the bookmark and the operator UIs is the work, and the work was made possible by a per-feature cost that dropped enough to let one person carry the disciplines they do not have.

The four specialist roles I rented along the way are returned to the agency. The dashboard is the experience.
