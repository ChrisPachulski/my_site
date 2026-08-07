---
title: "Watch Opens Plex — Until It Didn't: The Emerald Exchange Becomes the Player"
date: 2026-07-04T04:00:00.000Z
---

# Watch Opens Plex — Until It Didn't

The last time I wrote about the Emerald Exchange — my one-household, one-bookmark replacement for the pile of media apps I was tired of babysitting — I ended on a confession. The "Watch" button opened Plex. The whole dashboard, for all its polish, still handed you off to somebody else's player to actually watch anything, *because it doesn't try to be a player.* I said I could have stopped there.

I did not stop there. Over the next six weeks I made the Watch button stop opening Plex, which turned out to mean building an actual streaming server — one that scans a library, hardware-transcodes video on the same weak box that runs Plex, and plays it back over the open internet. That's 1,177 commits since that post. This is the field note on turning a request dashboard into the thing it was requesting from.

## The take, first

A media *dashboard* is a menu. A media *server* is a kitchen. The gap between them is enormous, and it's almost entirely video: scanning a real library, deciding per-stream whether a given device can play a given file, and re-encoding it in real time when it can't — on hardware that costs less than the TV it's feeding.

To close that gap I added three new backend runtimes that did not exist at the last post: a Rust library scanner, a Rust transcoder, and a rebuilt recommender running as a local-first sidecar. The product went from two moving parts to what the README now calls "four runtimes, one product." And it earned every one of those parts by breaking things first — including, twice, the incumbent it's replacing.

## It became a real media server

The first new runtime is `media-core`, a Rust binary that does the unglamorous work a server has to do before it can play a single frame: walk the library skipping unchanged files, `ffprobe` each one, classify it, enrich it against TMDB, and upsert it into a store. Boot scan plus a periodic scheduler with a single-flight guard so two scans can't stampede each other. The direct-play decision — "can this device just play this file as-is?" — is a pure function with a matrix of tests behind it, because that decision is the hinge the entire player swings on.

Here's the number that matters, the one that separates a demo from a Plex replacement: it's live on the NAS in enforce mode over a real library of **793 movies, 292 shows, and 20,054 episodes.** Twenty thousand episodes is not a toy. That's the scan running against the actual thing my household watches.

And the match accuracy is measured, not asserted. Over a 51-case labeled corpus, TMDB matching hits **96.1%** — 49 of 51 — clearing the 95% bar I set. The two misses are documented and honest rather than papered over: one is a romaji-versus-English title collision (the Japanese title of *Spirited Away* not resolving to the English one), the other a stylized numeral (*Seven* versus *Se7en*). Both are flagged as known gaps, on purpose, so the corpus stays representative instead of getting quietly tuned to a fake 100%. A benchmark you've massaged to perfection is a benchmark that's lying to you.

Cross-device resume works, and I proved it on the live box rather than in a unit test. Two device tokens for one account — a browser and an Apple TV — shared a single resume row: the web player wrote position 1234, the TV read 1234; the TV wrote 4000, the web read 4000; and a *different* account saw zero rows the whole time, because watch state keys on the verified account identity, never the device. I saved the transcript. When I say it works I mean I watched it work.

## A transcoder on a six-thread box

The second runtime is the long pole: a transcoder that hardware-encodes on the NAS's integrated GPU.

When a device can't direct-play a file, something has to re-encode it in real time — HEVC down to H.264, 4K down to 1080p, HDR tone-mapped to SDR — and do it fast enough that you don't stare at a spinner. The planner computes the *smallest* re-encode that'll work (copy the streams it can, touch only what it must), and the ffmpeg argument assembly is snapshot-tested so a careless change can't silently corrupt the command. At boot it probes `ffmpeg -encoders` and runs a smoke test per encoder, falling back to software x264 if the hardware path isn't there.

The hardware path *is* there. Intel VAAPI encode is live on the NAS iGPU — `h264_vaapi` as the primary encoder, and a full pipeline that decodes 4K HDR10, tone-maps, and scales to 1080p entirely on the GPU. And I proved it played end-to-end over the full public path: laptop, through Cloudflare, through the tunnel, into the backend proxy, into media-core, into the transcoder, and back — including resume. Not "deployed." Watched.

The bench numbers, run on the actual NAS: **four concurrent HEVC-to-H.264 sessions at 48% peak box CPU** on a six-thread machine, Plex reported healthy the entire time, load never crossed 0.56. Each session sustained **3.17 to 4.00 times real-time.** Post-seek time-to-first-segment came in at **0.54 seconds** against a two-second target — down from a genuinely embarrassing 23-to-27 seconds on the old CPU-and-libx264 pipeline, which I fixed by forcing keyframe cadence and halving the HLS segment length from four seconds to two. Then a 30-minute soak: 24 session lifecycles across seven pool refreshes, the idle reaper firing five for five clean under load, and — the number I actually cared about — **zero leak,** with the steady-memory floor drifting all of 4%. Post-stop ffmpeg processes: zero.

## The two times I brown-outed Plex

Here's the war story, and it's the most honest thing in this whole post.

I was building all of this *on the same six-thread box that runs Plex.* And one day I ran an uncapped `docker compose up --build` on the NAS, which kicked off a cold full-workspace Rust compile, which drove the machine's load average to about **73 — twelve times the core count.** It starved Plex. It starved SSH. And because SSH itself was starved, the runaway was *unkillable* for roughly thirteen minutes; I couldn't get a shell in to stop the thing that was preventing me from getting a shell in. My household's TV went down because I was building the thing meant to replace the TV.

I learned the wrong lesson the first time. I capped the CPU on the retry — and it **I/O-stormed the box just as badly,** because the bottleneck was never only CPU. Two brown-outs, same victim.

So the discipline is now codified, and it's the part I'm proudest of even though it's the part that came from failing: there's a `nas-safe-build` rule, and a hook that literally *blocks* a raw compile over SSH to the NAS. Any build now discovers the spare cores at runtime, caps its job count to leave headroom, runs detached with a heartbeat, and auto-aborts the moment Plex health degrades. Replacing an incumbent while it's still serving your family is a specific kind of engineering problem, and the answer isn't cleverness — it's refusing to let your replacement starve the thing it hasn't replaced yet.

## Live cable, and the bugs that come with it

The May version had four tabs and no live TV. The new one has a full live-cable / IPTV surface — an electronic program guide, video-on-demand, series, favorites, catch-up, and a DVR. It's the single biggest new capability, and the commit log is an honest ledger of how hard live playback actually is.

A sampler of the fixes, because the specifics are the story: re-encoding HE-AAC down to AAC-LC to cure lip-sync drift on Apple's player; stripping a cold-start HLS discontinuity that stalled playback; pinning live segment URLs across polls to kill a specific player error code; cutting live segments to two seconds to reduce Apple TV startup buffering; re-encoding non-H.264 channels to H.264 so that *every* channel plays instead of most of them. My favorite: **live cable froze at exactly five minutes** — every time, like clockwork — because the live grant token's TTL was too short and the stream lost its authorization mid-watch. The fix was a twelve-hour TTL, and the commit message is just "live cable stops freezing at 5 min," which is the kind of bug that's infuriating to chase and deeply satisfying to close.

## Real auth, and holes I had to close

The May post had one way in: Plex. The June product has three independent identity providers, all converging on a single invite-only members allowlist — Plex OAuth, Sign in with Apple, and WebAuthn passkeys, the last of which went live in production at the end of May. Passwordless, cross-platform, and not locked to any one vendor.

More sheepishly: hardening this surfaced two real holes I'd left open — a device-token allowlist bypass, and a cross-provider path that could escalate to admin. Both closed the same day I found them. I also moved the rate-limit buckets to key on identity rather than IP, so they bite regardless of whether the request comes through a trusted proxy. When you build auth, the useful question isn't "does the front door lock," it's "how many side doors did I leave," and the answer is never zero on the first pass.

## The recommender earned a number

The May recommender was, honestly, "ask Claude with the library distribution and some red/green feedback." The June one is a real system: a local-first FastAPI service with a `sqlite-vec` scoring sidecar, built so that household viewing signals never leave the NAS. I put it through a six-iteration leave-one-out research loop against nDCG@10 and it converged at roughly **10.4 times the baseline** through multi-feature fusion and a neighbor-cap refinement.

And because I run these loops to tell the truth and not to flatter me, the log records what *failed* right next to what worked: an item-based kNN A/B left the headline metric unmoved (deep recall improved 69%, but representation was the ceiling); a co-engagement re-scoring pass failed outright and, in failing, proved a retrieval-gate hypothesis; the novel-recommendation stratum stayed stubbornly at zero, and I wrote "honest" next to it rather than hiding it. Also — a production bug worth the confession — for a stretch the KNN `k` was exceeding `sqlite-vec`'s 4096-neighbor cap, which meant **every single scoring call was returning a 500.** The recommender was silently dead until I clamped it. Measured wins are worth more when you also publish the measured losses.

## What I'm not pretending is done

The trailer resolver that replaced the Python `yt-dlp` dependency with a native Rust YouTube extractor, and the native tvOS and iOS apps, each got big enough to earn their own posts — so I'll just wave at them here and keep this one on the server.

What's genuinely unfinished: the Plex-Pass-equivalent tier is about 5% built — a menu, not a plan. The DVR got its first two phases, but music libraries, photos, and per-library sharing are unbuilt. The hardware-encoder breadth is narrow: VAAPI is real and proven, but the VideoToolbox and NVENC paths currently exist only as argument strings that have never actually run. The audio path is a browser-safe stereo-AAC baseline, not real per-client capability matching — 5.1 passthrough is deferred, and subtitle burn-in for one image-based format got dropped from the planner for now. None of that is hidden in the roadmap; it's flagged as measured-versus-assumed line by line, because a status doc that only lists wins is marketing, not status.

## The honest shape of it

So the Emerald Exchange is now a Plex replacement that runs *next to* Plex, on a six-thread box, and the most human part of the whole build is that constraint. I didn't get to tear down the old thing and build the new one in a clean room. I had to build the replacement in the same cramped space the incumbent was still working in, without knocking it over — and I knocked it over twice learning how not to.

"Watch opens Plex" was an honest line when I wrote it. It isn't true anymore. Watch opens the thing I built, plays a file the thing I built transcoded, on hardware the thing I built learned to share. It took six weeks, three new runtimes, two brown-outs, and one very specific rule about never starving the box you're standing on. I could have stopped at the dashboard. I'm glad I didn't.

Cheers,
Chris
