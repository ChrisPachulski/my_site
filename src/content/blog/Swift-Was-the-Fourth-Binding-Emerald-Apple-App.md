---
title: "Swift Was the Fourth Binding: Building the Emerald Exchange's Native Apple App"
date: 2026-07-07T04:00:00.000Z
---

# Swift Was the Fourth Binding

I have a crypto contract — the little library that decides how my household media server mints and checks the tokens that authorize a stream. It exists in Rust, where it started. It has a Node binding, so the TypeScript backend can call it. It has a Python binding, so the recommender can. And in June it got a fourth binding, in Swift, because I built a native Apple app — tvOS and iPhone — and the app has to speak the exact same wire language as the server or nothing plays.

So the honest one-liner for this project is: *I built the fourth language binding of my own crypto contract, and a native tvOS and iOS app on top of it, and shipped it to TestFlight — solo, in about a month.* The build number climbed from 6 to 31 over those weeks. This is the field note on the app, and on the two ideas I'm proudest of: a wall the compiler enforces, and a contract four languages agree on byte-for-byte.

## The take, first

The reason the Apple TV needs a native app at all is boring and absolute: tvOS has no web browser. There's no WebKit to embed, so "just load the web app on the TV" is not an option. If you want the Emerald Exchange on the living room screen, someone has to write Swift. That someone was me.

And the reason it's *good* Swift — the reason it's not just a screen that phones home — is two decisions made early: I made the important coupling impossible for the compiler to allow, and I made the app prove, in CI, that it agrees with the server's crypto to the byte. Everything else is execution. Those two are the architecture.

## The wall the compiler enforces

The app is a Swift Package split into three layers, and the split is load-bearing.

At the bottom is `EmeraldContracts` — about 494 lines, CryptoKit and Foundation only, **zero third-party dependencies.** (Zero on purpose: a binary dependency in a crypto layer is exactly the thing an App Store reviewer stops to ask about, and I'd rather not have that conversation.) This is the wire layer: key derivation, stream-grant HMACs, device-token decryption, the byte-exact JSON canonicalization that the HMAC is computed over. Notably it's *verify-only* — the app checks tokens, it never mints them, because the client is not a thing I want able to forge its own authorization.

In the middle is `EmeraldDomain` — about 823 lines, pure business logic, and its dependency list is literally empty. Foundation and nothing else.

On top is `EmeraldKit` — about 8,362 lines, the actual SDK both apps consume: the HTTP client, the endpoint layer, the observable state stores, the player, the Keychain auth.

Here's the trick. `EmeraldDomain` declares zero first-party dependencies, which means if a domain file ever tries to `import EmeraldKit`, it's a **circular-dependency compile error.** The coupling that rots a codebase — business logic reaching up into networking and UI — literally cannot compile. The dependency graph forbids it.

But a graph can't stop a *system* framework, because SwiftUI and UIKit and Combine are available to every target for free. So the wall has a second half: a test called `DomainPurityTests` that scans every source file in the domain layer and **fails the build** if it sees an import of SwiftUI, UIKit, AppKit, Combine, or WatchKit. Pure domain code imports Foundation and nothing else, and that rule is enforced by a test that turns red instead of by a code-review comment that gets forgotten. Half the wall is the compiler; the other half is the one test that watches the door the compiler can't.

## A contract four languages agree on

The `EmeraldContracts` layer is the fourth binding of the server's Rust contracts crate — after Rust itself, the Node binding, and the Python binding — and "binding" here has teeth. All four round-trip the *same* canonical JSON test vectors, and if a vector changes on the server and isn't re-copied into the Swift tests, **CI fails on the divergence.** The contract is the frozen oracle; every language is measured against it.

There are four vectors on disk, and each one proves a specific scary thing works across the language boundary:

- One proves CryptoKit's key derivation is byte-identical to Node's and Rust's, down to an empty salt and a 32-byte output.
- One proves the identity-namespace parsing and its error codes match.
- One proves the canonical HMAC-input bytes and the resulting signature match the TypeScript signer exactly.
- And the best one proves Swift can decrypt a token **minted by the backend's `jose` library** — a JSON Web Encryption blob, encrypted in TypeScript, decrypted in Swift, claims recovered exactly. There's a real security detail buried in it too: an unknown key ID is rejected *before* any decryption is attempted, so an attacker can't iterate key IDs to probe which ones exist. No key iteration, no enumeration oracle.

That's what "native client" should mean. Not "an app that talks to an API," but an app that can be *proven* to speak the server's private cryptographic dialect, with the test that fails the day the two drift apart.

## The player that starves, and its backup

Now the war story, because the most interesting engineering came from a thing that flat-out didn't work.

`AVPlayer` — Apple's built-in player — is the right first choice for live IPTV. Sharper picture, better framerate matching. Except real provider feeds are *pathological*: broken container timestamps where the decode clock runs way ahead of the presentation clock, wildly irregular keyframes, the kind of stream that's technically valid and practically hostile. `AVPlayer` **starves at the live edge** on feeds like that. It just stalls, over and over, because it expects a well-formed stream and the cable feed is anything but.

So live playback is a *dual renderer.* It tries `AVPlayer` first, and auto-falls-back to a tuned libVLC engine — the guts of VLC, which buffers a deep network cache and tolerates the irregularities natively because tolerating garbage streams is the entire reason VLC exists. Video-on-demand and downloads stay on `AVPlayer`, which handles them beautifully; only live drops to VLC when it has to.

Getting VLC into a modern Swift app was its own fight. It's an Objective-C library with no concurrency annotations, and the app builds under Swift 6's *strict* concurrency mode, which wants everything crossing a thread boundary to be provably safe. The resolution was to import it as `@preconcurrency` and let exactly one small, deliberately-`Sendable` signal enum cross the boundary from VLC's delegate thread — one narrow, safe channel instead of trying to retrofit safety onto a whole Obj-C library. And if VLC *also* drops the channel, the app reconnects with backoff instead of ejecting you back to the guide, because nothing feels cheaper than a player that gives up and throws you out.

There's a sibling fallback for on-demand video, too. The app advertises a broad set of codecs it can play, but that set is a *superset* of what any given device can actually decode in hardware — an older Apple TV has no HEVC or HDR hardware path, for instance. So when a direct-play attempt lands on a black screen with a failed status, the app doesn't just sit there; it re-requests the same title with a "force compatible" flag, and the server's transcoder hands back guaranteed-playable H.264/AAC. It never re-forces an already-forced retry — no infinite loop — and live streams never fall back this way. It fails, learns, and asks again in a form it knows will work.

## Fighting the focus engine

If you've never written for tvOS, the thing nobody warns you about is the focus engine. There's no cursor and no touch — you move a highlight around with a remote, and the system decides where the highlight can go. Get it wrong and you build a *focus trap*: a screen the user can navigate into and then can't navigate back out of, which on a TV is a special kind of infuriating because there's no obvious escape.

The commit log has multiple, separately-titled fixes for exactly this. Making a detail screen's body reachable when the hero had no button to focus. Restoring downward focus to the Play and Trailer buttons. Stopping poster cards from clipping at the shelf edges. At one point I removed a featured hero banner from the home screen *entirely* because it kept trapping focus, and flattened the home into clean resume rows instead. The electronic program guide crashed on open and had to be bounded and then row-virtualized so the whole channel set was even reachable. And the Plex pairing flow rejected its own code until I stopped requesting a "strong" PIN that the pairing site wouldn't accept. Ten-foot UI is a genuinely different discipline, and I earned that knowledge one focus trap at a time.

## The numbers

- **~31,787 lines of Swift** across the SDK, the two apps, and the tests.
- **628 test functions** — the test code is nearly as large as the entire SDK, which is exactly the ratio I want on the layer that has to agree with a server byte-for-byte.
- **103 SwiftUI views**, around 11 observable state stores.
- **234 commits** in about four weeks, and TestFlight builds climbing **6 to 31** — a real, roughly-every-day shipping cadence, not one big drop.
- One bundle ID across iPhone, iPad, and Apple TV via Universal Purchase; a full Fastlane-and-Match signing pipeline so `fastlane beta` is a one-command ship.

There's also a nice bit of paranoia I'm fond of: the app can point at a plain Jellyfin server, not just mine, because the backend is behind a protocol with a Jellyfin adapter — so the client isn't welded to one server implementation. And it finds my server on the local network automatically over Bonjour, which took an embarrassingly specific one-line manifest fix to actually work.

## What I'm not pretending is done

Two honest caveats, because a post that only lists wins isn't worth reading.

**App Store review is anticipated, not survived.** There's a written runbook for it, but a runbook is a plan, not a scar. A personal-media client like this walks straight into two guideline risks: a reviewer can't reach my home server to see the app actually work, and a library of movies and live channels I don't hold distribution rights to reads, from the outside, like an unlicensed-streaming app. My plan is to stand up a throwaway public demo server that serves *only* freely-licensed content — the Blender open movies, some public-domain NASA footage — with live TV switched off for the demo, so the reviewer can see a working app full of things nobody can object to. That's the hard part, and I've deliberately deferred it. TestFlight shipped. The App Store is still ahead of me.

**Scaffolding kept outrunning use.** More than once I built a feature, wired nothing to it, and then deleted it in a dead-code audit before a "public SDK freeze" — a track-selection menu, some suggestion-grouping, unwired player state. The first UI wasn't the shipped UI, either; there was a whole cinematic reimagining pass near the end that rebuilt surfaces I'd already "finished." Building ahead of yourself feels productive and is sometimes just debt with good posture. Cutting it back is part of the work, not a sign the work went wrong.

## The shape of it

The thing I keep coming back to is that wall. Most codebases decay because the coupling that shouldn't happen is merely *discouraged* — a convention, a style guide, a reviewer's good mood. I wanted the coupling that matters to be *impossible*: a compile error if the domain reaches into the network, a failed build if a token format drifts from the server, a red test if a pure file imports a UI framework. Not "we agreed not to." *Can't.*

That's the difference between a native client and an app that happens to be native. This one can prove — to the compiler, and to CI, in four languages — that it is exactly what it claims to be. It just also took thirty-one builds and a lot of arguments with a TV remote to get there.

Cheers,
Chris
