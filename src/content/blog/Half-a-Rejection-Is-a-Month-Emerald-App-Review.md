---
title: "Half a Rejection Is a Month: What App Review Actually Wanted"
date: 2026-10-14T04:00:00.000Z
---

# Half a Rejection Is a Month

The Swift post ended with a promise I hadn't kept yet: *TestFlight shipped. The App Store is still ahead of me.* It was further ahead than I thought.

Apple rejected the Emerald Exchange's tvOS and iOS app on September 11. The rejection had two parts. For about a month, every session working on the fix only knew about one of them. On October 13 I pasted Apple's whole message into a session, and the other half surfaced. It was the one that mattered.

This is the field note on that loop: the prep, the submission that changed builds three times before anyone at Apple looked at it, the month spent fixing half a letter, and the live TV and UI work that happened in parallel, because the app kept being used while it was being reviewed.

## The take, first

Read the whole letter. That's it. It's a dumb lesson, and it cost a month.

The longer version is that an AI-assisted workflow has a specific failure mode here. Each session reads what the previous one wrote down, and when the first summary is incomplete, every later session inherits the gap and fixes it more confidently. One session even recorded, in writing, that *"Apple raised nothing about content."* Apple had raised exactly that. It was sitting in App Store Connect, unread, the whole time.

## Getting ready

The prep was real work. On July 18 I had an independent "senior Apple reviewer" audit run against the app. It was a read-only pass, and it confirmed real problems, like an in-flight library load that could write a signed-out member's library back to disk. Roughly a hundred fix commits landed that day. In-app account deletion went in a week later, because Apple requires it for any app with account creation.

The demo server from the Swift post's plan got built too: a review library containing only content nobody can object to. Thirteen films from the Blender open movie projects (CC BY) and the Prelinger archive (public domain and CC0), plus seven episodes of a NASA series, which as a US government work is public domain. Each license is documented in the repo.

And CI broke in a way I'll never forget. The self-hosted runner is a Mac, and it was on battery, where `caffeinate -s` (prevent sleep) does nothing. It deep-slept about 3,600 times on August 6 and about 5,600 times on August 7. The builds weren't flaky. The build machine kept falling asleep.

## Four builds in sixteen hours

I submitted build 76 on both platforms on the evening of September 2, without running a device smoke test first. You can guess the rest.

Over the next sixteen hours I cancelled and re-created the submission three times:

- **77:** Sign in with Apple did nothing on iOS. Not "failed." Nothing.
- **78:** The library came up empty.
- **80:** Fixes from walking through the app the way a reviewer would.

Every one of those would have been caught by ten minutes with a physical device. The lesson isn't subtle, and the submission packet now has a line item for it.

## The rejection

September 11, 10:06 PM. tvOS 1.0, build 80, rejected under two guidelines. (iOS was rejected too.) Quoted from Apple's message:

**2.3.6 Performance – Accurate Metadata:** *"The content description selected for the app's Age Rating indicates that the app includes In-App Controls. However, we were unable to find either Parental Controls or Age Assurance mechanisms in the app."*

**5.2.3 Legal:** *"The app contains content or features that may violate the rights of one or more third parties. Specifically, the app provides potentially unauthorized access to third-party audio or video streaming, catalogs, and discovery services."* With a next step: attach documentary evidence that you have all necessary rights or permissions.

The first one is a bug report. The second one is a question about what the app *is*, and it's the one the Swift post predicted almost word for word: a library of movies and live channels, seen from outside, reads like an unlicensed-streaming app.

## A month on half the letter

The sessions that picked up the rejection recorded only 2.3.6. So that's what got fixed, carefully and well.

The parental controls *existed*. The reviewer just couldn't find them, for a reason that's obvious once you see it: restrictions only apply to non-owner household members, and the review account was an owner. An owner looking for parental controls on themselves finds nothing. The fix was a Members section that always shows a parental-controls hint, review notes with the exact path on each platform, and a demo non-owner member on the review server so the reviewer can see a restricted profile for themselves. The review notes ended at 3,808 bytes of Apple's 4,000-byte limit.

Somewhere in there, an agent decided four of the Blender shorts (*Sintel*, *Tears of Steel*, *Cosmos Laundromat*, *Sprite Fright*) were too mature for the review server, based on nothing but its own memory of them, and pulled them. It conceded *"That one is on me"* and put them back. Pulling licensed demo content out of a review library because of a vibe is exactly the kind of confident, unverified decision I keep writing these posts about.

Meanwhile I kept getting uneasy. On October 3: *"Im concerned because you have yet to identify the actual reason they rejected it and it makes me nervous."* I was right to be nervous and wrong about where to look. The answer wasn't buried in logs. It was in the letter.

## The insurance I threw away

The worst part of finding 5.2.3 was remembering August 9.

That day, worried about review, I'd built a variant of the app with live TV compiled out entirely. It took the bundle from 177 MB to 50 MB. The commit was never merged. Its branch was deleted, and the commit is still in the repo, on no branch at all. Two months later Apple came for exactly what it would have removed.

I'd had the right instinct and then decided it wasn't needed. Building it wasn't the waste. Throwing it away before the review came back was.

## The split

When the second half surfaced on October 13, the decision took about a minute. My instruction: *"Whatever will get us passed that follows the rules."*

The App Store build and the household build are now separate products. The store build plays a member's own library from their own server and nothing else. Live TV, recording, the downloads queue, the YouTube row, and the library-management tools are all off:

```swift
static func storeScoped(_ caps: BackendCapabilities) -> BackendCapabilities {
    guard isStoreSafe else { return caps }
    var caps = caps
    caps.iptvLive = false
    caps.dvr = false
    caps.downloadsQueue = false
    caps.youtube = false
    caps.arrManagement = false
    return caps
}

#if EEX_STORE_SAFE
static let isStoreSafe = true
#else
static let isStoreSafe = false
#endif
```

To be precise about what that means, since precision is the point of this whole post: the library-management browser and the household server preset are compiled out of the store build. The rest are compiled in and forced off by capability at runtime. The store copy no longer mentions live TV, and the submission carries a rights-evidence PDF for the review library. The household TestFlight builds keep everything.

The store builds are 95 and 97; the household builds are 96 and 98. Build 97, with a new emerald-cut icon, is attached to both 1.0 versions with the new notes and evidence, and the API read-back confirmed every field. Then the resubmit call returned `409 Version is not ready to be submitted yet` for over forty minutes. Replying in the Resolution Center can only be done in the web UI anyway. So the very last step of an AI-heavy pipeline is a human clicking a button, and as of this writing, that human is me.

## Meanwhile, live TV

The app didn't stop being used while it was in review, and the most-used part kept breaking. *"Unfortunately there's still a lot of start and stopping when trying to play live tv."* (A side note, since I asked at one point: the live player isn't Rust. On Apple it's AVPlayer, falling back to VLCKit, with Swift watchdog and reconnect logic around both. The server repackages the live feed to HLS with an ffmpeg process.)

It took four passes, each one peeling off a layer:

1. **Tune churn (September 19).** One press on a channel hung for about six seconds, so naturally the remote got pressed again. Five stream grants went out in four and a half seconds. Each new one tore down the previous session before the source had sent a byte, and the server marked the channel dead. The fix is an in-flight guard: one grant per tune.

   ```swift
   private func open(_ fav: Favorite) async {
       guard !tuning else { return }          // a grant in flight: extra presses would mint duplicate sessions
       tuning = true
       defer { tuning = false }
   ```

   The same pass found the source's timestamps jumping by about 25.6 hours, which set off a flood of per-packet corrections in ffmpeg. The server now relaunches ffmpeg in place when that happens. A channel that used to die at three to seven minutes ran for more than thirteen.
2. **An audit (September 29–30).** The client had been constantly nudging playback speed to keep up and had settled at 0.97×. I removed that. A position-based watchdog went in for VLC freezes, and the server stopped evicting streams after barely two seconds idle at the two-stream cap. A 30-minute soak test showed zero stalls across 17,444 sampled frames.
3. **The single big jump (October 3).** The remaining start-and-stop had a clean root cause. When the source's timestamp jumps *hugely* in one go (153 hours, 264 hours), ffmpeg keeps running but stops writing segments. The client plays its roughly 25-second buffer dry and then reconnects, which is the 40-to-60-second freeze you see on the couch. All three jumps over 150 hours in a 72-hour window froze playback, and every jump under six minutes recovered. The September detector needs 30 errors in 10 seconds, so a single jump never trips it. The fix is clear: relaunch on any single jump over about an hour, plus a 12-second no-new-segments watchdog. **It isn't in yet.** Diagnosed, reproduced against the production ffmpeg, not shipped.
4. **Two spinners (October 12).** The live loading cover was see-through, so AVKit's grey spinner showed through on top of mine. Now it's opaque.

## Sleek and clean

The other October thread was the Movies and TV tabs. My brief was blunt: *"We are shooting for sleak and clean - right now we have a lot of what looks like rudimentary swift."*

I had a TV-tab agent and a Movies-tab agent argue it out for three rounds until they agreed on a plan, and then put a Codex advisor on each build step. The advisors caught four real defects. The list of what was wrong reads like a ten-foot-UI checklist. The tvOS search keyboard ate the top third of the Library, leaving about 1.3 rows of posters visible. The Discover/Library toggle moved when you switched modes. On iPhone, four or five stacked control bars took about 300 points before any content appeared. Discover showed one row and then nothing. The A–Z rail was mostly greyed-out letters and ran off the screen. Search moved into the control row, empty and loading states got honest, the A–Z rail only appears for libraries of 30 or more titles, and the like/dislike buttons moved off the cards and onto the detail screen.

Then two complaints from the couch, sent together: *"Why is it whenever I hover over any show or movie their cover art enlarges and covers text - its very ugly. Also - Ted Lasso only shows one season when I know we have 4 what gives."* The hover one was a system highlight effect I didn't need. The Ted Lasso one is my favorite bug of the year:

```swift
-  .id(bodySeedsFocus && season.id == playbackSummary.seasons.first?.id)
+  .id("\(season.id)-\(bodySeedsFocus && season.id == playbackSummary.seasons.first?.id)")
```

The view identity was a `Bool`. Every season except the focused one got the identity `false`, so SwiftUI's lazy stack treated them as one view and showed one card. Three seasons of Ted Lasso, deduplicated into nonexistence by a boolean.

## The numbers

Since the Swift post, by raw count (these are measured differently from that post's figures, so don't subtract one from the other):

- **415 commits** in the app repo on 30 different days, plus 445 on the server.
- **Build 68 → 99.**
- **46,705 → 82,166 lines of Swift**, 281 → 419 files.
- **About 1,040 → 1,750 test declarations.** The last full `swift test` run I have on record passed 1,543.
- **4 builds** in 16 hours before review even started.
- **32 days** from rejection to understanding the rejection.

## What I'm not claiming

- **It's not approved.** It isn't even resubmitted, as of this writing. The last confirmed state is build 97 attached with everything validated and a button waiting for me.
- **5.2.3 might not be satisfied.** Splitting the builds and attaching rights evidence is my best reading of what Apple asked for. App Review gets the final word, and I'll write that up when it comes.
- **The live TV freeze fix isn't shipped.** The diagnosis is solid. The commit doesn't exist yet.
- **Most of the playback evidence is from the simulator and server logs.** The 17,444-frame soak was server-side. A real Apple TV on a real couch is still the test that counts.

## The shape of it

I keep writing posts about verifying claims, and this one is the purest version of the failure: the source of truth was a single message, sitting in a web UI, written in plain English by the people who make the decision. Every session after the first one trusted a summary of that message instead of the message. Each summary was a little more confident than the last, and none of them were complete.

The fix for that isn't a smarter model. It's a habit. When the decision belongs to someone else, go read what they actually said, all of it, before you fix anything.

Cheers,
Chris
