---
title: '"Infeasible" Was the AI Giving Up: Porting yt-dlp to Rust'
date: 2026-06-22T04:00:00.000Z
---

# "Infeasible" Was the AI Giving Up

The Apple TV doesn't have a web browser. That one fact is why I spent a week writing ~39,000 lines of Rust.

The Emerald Exchange — the household media app I've been building — has a tvOS app now. tvOS has no WebKit, so the app can't just embed the YouTube player to show you a trailer. It needs a *playable URL*: an `.m3u8` or an `.mp4` that `AVPlayer` can open directly. The way you get one of those today is `yt-dlp`, the Python tool that reverse-engineers a thousand-odd video sites into direct stream links. So the backend was shelling out to a Python binary on every trailer tap.

That works. It's also a Python interpreter, a subprocess, and a 30MB dependency riding along in a container that's otherwise a single static binary. I wanted the common path in-process, in Rust, with no Python and — for the case that matters — no JavaScript engine either. This is the field note from building that. The Rust is the easy part. The real story is what the AI agents told me I *couldn't* do, and what happened when I didn't believe them.

## Why this is tractable at all

yt-dlp is about 1,800 hand-maintained site extractors plus a large core engine, kept alive by a full-time contributor community. Reimplementing all of it would be insane. The reason a one-person Rust version is even thinkable is a single trick yt-dlp itself uses.

YouTube's **iOS Innertube `player` client** returns stream URLs that are already signed. No signature cipher to solve, no `n`-throttle parameter to descramble, and for public videos no PoToken. You POST the iOS client's context to `youtubei/v1/player`, read `streamingData`, and hand back whatever's playable. That core resolver is ~250 lines. Not because Rust is magic — because the iOS client does the hard part for you, and the whole game is knowing that.

One legal note: yt-dlp is public domain (The Unlicense), so its extraction logic, client definitions, and regexes are free to port with no GPL contamination. This is a clean-room-by-license reimplementation of the slice I need, for personal household playback, not a redistribution tool.

## The scope explosion

It was supposed to stop at YouTube. It did not, because once you have the framework, the marginal cost of the next site collapses.

The keystone is `src/extractor.rs`: a `dyn Extractor` trait, a registry, a universal media-info struct, and URL dispatch. Once that exists, two things compound. First, the **generic extractor** — yt-dlp's highest-coverage component — pulls video off thousands of sites with zero site-specific code: OpenGraph, JSON-LD `VideoObject`, a bare `.m3u8`, a `<video><source>`. Second, **embed delegation**: Wistia, JWPlatform, and Brightcove aren't three sites, they're three players embedded on *hundreds* of media sites. Resolve the player once and you resolve every page that hosts it.

On top of that I bulk-ported the long tail. Over three days, ~290 site extractors landed across eight waves. I didn't hand-write them one at a time; I ran waves of subagents, each porting a batch from the yt-dlp source against the trait, each leaving a parse test behind. The repo is ~39,000 lines now, 304 registered extractors. Most of that isn't clever — it's the same shape, 290 times. That's exactly what you'd want subagents for, and they were good at it.

The honest claim: **Rust doesn't remove yt-dlp's maintenance burden, it moves it to a new language.** Every extractor is still a reverse-engineered private API that breaks on the vendor's schedule. What Rust buys is speed, memory safety, and one static binary. What *orchestration* buys is the unit economics. Different wins; I try not to confuse them.

## The part that isn't done

Two things still fall back to Python `yt-dlp`. **Delivery is half-built** — my first design synthesized an HLS manifest pointing straight at YouTube's adaptive URLs, and it doesn't work, because those `googlevideo` URLs 403 any over-cap GET and `AVPlayer` won't play a manifest that references them. The real path is a proxy-and-remux service in the backend, not yet landed; native-HLS and progressive videos (about one in eight) play as-is, the rest fall back. **The web cipher path is built but blind** — the `boa_engine` machinery passes its fixture tests, but the live `player_es6` build moved the signature descrambler behind a URL class and a path-rewrite, so the anchored regexes (mine and yt-dlp's) miss. yt-dlp hit the same wall and punted to an external JS solver; so will I. There's an `#[ignore]`d test waiting to re-probe.

I'm fine shipping with two known holes. The alternative is pretending, and the canary would catch me anyway.

## "Infeasible" was the AI giving up

Here's the part worth your time. The bulk-port subagents didn't just write extractors — they wrote a `BLOCKERS.md`, logging every site that beat them with a verdict on whether it could be solved. A whole pile came back marked *infeasible*, with confident technical-sounding reasons. I almost believed them. Then I started pressing, one wall at a time, and the pattern was the same every time: **"infeasible" meant the agent had stopped, not that the thing was impossible.**

**TikTok** was filed as "needs the `X-Bogus`/`msToken` request signatures, out of scope." The agent had tested the wrong endpoint. The bot-gate falls to TLS fingerprint impersonation and the playable URL is reachable with no signing algorithm at all. Ships, no signing.

**odysee** was filed as a 401 requiring the LBRY desktop client's SDK auth handshake reproduced. It needed an `Origin` and a `Referer` header. The agent had written a paragraph theorizing about a signed-token grant for what turned out to be two HTTP headers.

**theplatform/mpx** — the CMS NBC, MSNBC, and dozens of broadcasters delegate to — was deferred as having "no live public feed to test against." It ships now through an NBCNews entrypoint that reads the assets straight out of the page's `__NEXT_DATA__`. yt-dlp doesn't even have a usable standalone extractor for it.

The clearest one was **Cloudflare**. The agents recorded pinkbike and gamespot as serving an interactive Turnstile challenge — "403 even on a current Chrome fingerprint, pure-Rust solver infeasible." Both claims were false. Both return 200 to a current `Chrome144` impersonation client (verified live: pinkbike's page plus a 75MB CDN mp4, no challenge anywhere). The earlier 403s weren't Turnstile — they were a *stale* fingerprint pinned to `Chrome131`, which Cloudflare now fails. The agent had filed a one-line version bump as an unsolvable wall.

And the "pure-Rust Turnstile is impossible" line annoyed me enough to disprove it on principle. The two pieces you need already lived in the repo: a current-Chrome TLS fingerprint, and the `boa` JS engine I was already running YouTube's `base.js` in. A Cloudflare challenge is just those composed — fetch the interstitial impersonated, run CF's own challenge JS in `boa`, submit through the same identity, harvest `cf_clearance`. `src/cfclearance.rs` does exactly that, unit-tested with `boa` computing the real answer. Then the honest punchline: **no extractor I ship actually needs it.** Every gate I really touch passes on plain impersonation. I built the solver to retract a false "infeasible" and shelved it under YAGNI.

This is the thing I actually want you to take away, because it generalizes far past this repo. **An AI agent's "this is infeasible" is not a finding. It's the agent hitting the edge of its first attempt and narrating defeat as if it were a property of the problem.** The model tested one endpoint, got a 403, and wrote you a confident postmortem on why the whole approach is doomed. Left unchallenged, that verdict silently shrinks what you build to whatever the model managed on its first try. Press it — "are you sure, did you check the headers, what fingerprint were you on, show me the actual request" — and a startling fraction of the walls turn out to be the agent's own fatigue. Four shipped extractors (TikTok, odysee, an NBC entrypoint) and a Cloudflare solver I didn't need all came out of the pile the agents had already given up on. The skill isn't writing the blockers file. It's refusing to trust it.

## The routine that maintains it while I sleep

Everything above decays the day Google or anyone else ships a new build. You don't beat that with cleverness; you beat it with a schedule.

The volatile bits — the iOS client version, the user-agent, the OS string, the signature-extraction patterns — live in `clients.json` and `signatures.json`. They're embedded at compile time but kept as *data, not code*, so staying current is a data edit, not a source change. That's what makes the whole thing automatable, and the automation is a three-link chain that runs without me:

1. **A weekly canary** (`cron: '17 6 * * 1'` — Mondays, 06:17 UTC, in GitHub Actions) diffs my client definitions against yt-dlp's upstream, opens a sync PR on drift, and runs the real binary against live YouTube to catch hard breakage.
2. **A build routine** picks up a release, auto-versions to the next patch, smoke-tests it against a stable public video, and publishes the binary.
3. **A NAS cron** (`nas-canary-deploy.sh`) watches for new releases and deploys them to the box hands-off — I had to pin `PATH` explicitly because cron's environment is a stripped-down ghost of my shell, which is its own small lesson about scheduled jobs.

So the failure mode is: upstream drifts on some Monday, the canary notices before I do, a PR and a release flow out, and the NAS swallows the update before anyone in the house taps a trailer. This is deliberately my scaled-down replacement for yt-dlp's maintainer community — I can't out-staff a hundred contributors, so I let *their* drift and *my* schedule do the work they'd otherwise do by hand. A one-person project survives a moving target only if the maintenance runs on a clock instead of on my attention.

I fully expect the canary to go red on some random Tuesday. Building it was the point: I'd rather learn YouTube broke me from a failed CI run at 6am than from someone in the house telling me trailers stopped working.

## What I'd take from this

Scope is the weapon — I reimplemented the 250-line slice that serves the common case, the generic extractor and three embed players that quietly cover most of the rest, and a long tail that's cheap to port and re-port. Everything I can't do cleanly falls back to the tool that can.

But the durable lesson is about working *with* the agents, not the Rust. Subagents will port 290 extractors faster than you could ever hand-write them — and they'll also hand you a confident list of things that "can't be done," most of which can. The value wasn't in the blockers file they wrote. It was in not believing it, pressing each verdict until the model's first-attempt fatigue separated from the actual ceiling, and putting the surviving real work on a schedule so it maintains itself. The agents find the edge of their effort. You find the edge of the problem. Those are not the same line, and the gap between them is where most of this project came from.

The project isn't finished. The cipher path is blind, the delivery proxy isn't built, and the canary will embarrass me eventually. That's all written down too — but now I read my own "infeasible" notes as a to-do list, not a verdict.
