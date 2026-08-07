---
title: '"[not found]" Beats a Guess: A Six-Nation Family Tree Built From Primary Records Only'
date: 2026-07-01T04:00:00.000Z
---

# "[not found]" Beats a Guess

I built a family tree with one rule that decides everything else: no parent-link goes in unless it traces to a real record — a census, a certificate, a parish act, a court book. If I can't put a document behind a connection, the node says `[not found]`, and `[not found]` stays. A dignified blank beats a confident lie every single time.

That rule is why the tree is smaller than the ones the genealogy sites will happily auto-fill for you, and it's why I trust every line on it. It's also how I ended up reading a 1923 marriage act pixel by pixel off a scanned parish film, and how I learned exactly why my kids have Tahitian names. This is the field note on building it.

## The take, first

Most consumer genealogy is a slot machine dressed as research. You get a hint leaf, you click "yes that's my guy," and the site stitches you to a stranger's tree that was itself built by clicking hint leaves. Four generations later you're "descended from Charlemagne" and none of it is load-bearing.

I wanted the opposite of a slot machine. I wanted a records room. So I built two things: a viewer that renders the tree and shows its own confidence honestly, and — the real work — a research pipeline that went and got the actual documents. 167 ancestor nodes so far. About 64% of them rest on a primary record image, meaning the scan of the actual certificate or act is sitting on my disk. The rest are labeled for exactly what they are, from aggregator-sourced down to inferred, so nobody — including me in five years — mistakes a good guess for a proven fact.

## Twelve origins converging on two kids

Let me start with what the tree is *of*, because the shape of it is the reason it exists.

My side runs Polish (the Pachulski and Koziej lines), Scottish, Ulster Irish, English, and colonial American and Canadian. My wife Dana's side runs Korean, Japanese, Chinese-Cantonese, and Tahitian Mā'ohi. Put our two kids at the root — Aurelia and Frederick — and their tree unifies twelve encoded heritage origins into one view. The current counts, by node: Scotland 46, Poland 37, Canada 18, USA 15, Japan 12, England 10, Korea 7, China 6, Ireland 5, Tahiti 3, Germany 3.

That's not a metaphor about a melting pot. It's a data model. Every ancestor node carries an `origin`, and the viewer draws a per-person "blood donut" so you can see, at any point in the tree, what a person was made of and where the lines braid together.

## The design brief: a records office, not Ancestry.com

The viewer is a self-contained Python app — `serve.py`, 118 lines, zero third-party dependencies, pure standard library. It serves a pan-and-zoom pedigree chart on localhost: the subject on one side, ancestors fanning out by generation, a color per heritage line, confidence dots on every node, and provenance notes in the tooltips so you can see *why* a link is claimed.

The design documents for it read like a records office deliberately refusing to be a genealogy SaaS. Explicit anti-references to hint-leaf gamification. No upsell surfaces. The governing principle is that confidence is *shown, not asserted* — and that unknowns are dignified, not hidden. A guess renders dashed and muted. A primary record renders solid. You can tell the epistemic status of any claim by looking at it, without reading a footnote.

There's a small trick in the data layer I'm fond of. The source of truth is a single `data-source.html` file holding two JavaScript object literals, `CHRIS` and `DANA`, one node per ancestor. To serve it as an API, `serve.py` brace-matches those literals and regex-quotes the bare identifiers to turn hand-written JS into valid JSON on the fly — with a strict path for the blocks that are already real JSON, so prose values like biographical notes don't get mangled by the quoting pass. I edit the objects; the viewer reads them live. No build step, no database, no ORM. For a personal heirloom that has to still open in ten years, "one HTML file and 118 lines of stdlib" is the right amount of technology.

## The research engine is the meaty part

Rendering a tree is easy. Filling it with true things is the entire job, and this is where I actually built something.

The core problem: the records aren't behind paywalls, mostly. They're behind *browsers.* Modern archive search forms are JavaScript-rendered, and the good ones sit behind Cloudflare Turnstile, which fetch-based scraping can't defeat. My first diagnosis pass got this exactly right — these were browser walls, not paywalls — and it changed the whole architecture.

So the engine runs a headful Chromium daemon. Playwright driving a real Chrome, kept alive as an HTTP eval server on a local port, working through a persistent browser profile that carries cookies and challenge-clearance between runs. Scripts POST a snippet of page-automation to it; it runs that inside the live browser and hands back the result. That's what actually gets past Turnstile and the rendered search forms — you're not forging a request, you're a real browser doing real-browser things.

On top of that daemon I ran fleets of parallel research agents. The first big push alone ran over a hundred agents, each one adversarially verified — meaning a second agent's job was to try to knock down the first one's claim before it counted. A later Scottish-Borders push ran sixteen primary agents plus follow-up waves. A Polish-walls sweep. Census agents, obituary agents, cause-of-death agents, all writing their findings incrementally to disk so a crash never cost more than the last file.

Every node gets a confidence grade on the way in: primary (I have the record image) → public → aggregator → inferred → not-yet-found. Deceased ancestors get fully documented. Living people get public and professional facts only, and city or ZIP at most — never a street address. That's not a technical constraint, it's a decency one, and it's wired into the grading so I can't forget it at 2am.

The sources it actually pulled from, since specifics beat hand-waving: FamilySearch (login-gated and flaky), the Polish parish-and-civil-act archives Geneteka and szukajwarchiwach and metryki, the Arolsen Archives for WW2 displaced-person cards, New Brunswick's provincial vital-statistics scans (which are gloriously *open* — digitized images, no login), Library and Archives Canada census images, FindAGrave, the French national death file, the Tahiti colonial registers, Hawaii's Japanese-language newspaper archive. Where a record only existed as a scan, the pipeline cropped, upscaled, and deep-zoom tile-stitched the image so the text could actually be read.

## Iteration discipline, because agents lie confidently

Here's the part I care about most, and it's the same discipline I bring to every long autonomous run: the machine keeps a log of its own deviations.

Each research pass writes an `implementation-notes.md` with a Deviations section — when the evidence forced a conservative call, that call gets logged. An `iteration_log.md` labels every finding VERIFIED, WEB-CONFIRMED, INFERRED, or NEGATIVE. The master tree docs carry numbered "Pass N" entries; my side is numbered past Pass 32. That log is the only real window into a month of research that lived in files and passes, not commits. The git repo is a single snapshot from July 5th — the *work* spans June 5th to July 7th, and it happened in the passes, not the version history.

Let me give you the one anecdote that shows the discipline working, because it's the whole philosophy in miniature.

The Polish side was indexed under a phonetic spelling — "Pakulski," not Pachulski, because a parish scribe wrote it the way it sounded. I found marriage act #115 from 1923 in Biała Podlaska. The first read of the scan gave a village name: "Horeszówka." An agent immediately took that village and started building a search around it. Then I did a maximum-resolution re-read of the same act, and the village wasn't Horeszówka at all — it was **Korczówka.** Different place. Which meant the in-flight agent was now searching a false premise. It got stood down within the hour, and *both* the correction and the stand-down got logged. That's the loop: a claim, a harder look, a falsification, a documented retreat. No ego, no sunk cost, just the record.

## What the records actually turned up

This is the payoff, and it's why you build the honest machine instead of the slot machine.

**The line goes back to 1665 Kittery, Maine.** The deepest documented ancestor is Philip Gallison — an adult laborer and fisherman by 1665, almost certainly born in Jersey in the Channel Islands (the surname is an anglicization of *Gallichan*). He lived at Braveboat Harbor on land granted by Captain Francis Champernowne, and he died in early 1676 leaving a pauper's estate — a ten-pound administration bond, which is the seventeenth-century way of recording that a man died with almost nothing. That's a tenth-great-grandfather, nailed to the *Province and Court Records of Maine*. Not a hint leaf. A court book.

**A WW2 Stalag record and Nazi-era registration cards cracked the Polish wall.** Franciszek Pachulski turns up in a Stalag X-B prisoner record. And the Arolsen Archives DP-2 cards — the displaced-person registration cards from the postwar chaos, self-signed and parent-naming — broke the longest-standing gap on the paternal side. They corrected a maiden name that a 1973 death certificate had gotten wrong from an informant's bad memory: the record said one thing, the woman's own wartime registration card said another, and the card wins.

**And then the thread that reorganized how I think about my own kids.** Dana's Tahitian line ran through Papeete, and it was blocked — until I realized that because Tahiti is French territory, it's covered by the *free* French national death file. That single database confirmed a 2025 death, reset a wrong assumption (the sisters were Papeete-born, not Hawaii-born as we'd guessed), and eventually led to identifying Dana's Tahitian maternal grandmother, Henriette Voune-Raioaoa — Mā'ohi, from Huahine, with a Chinese-Tahitian braid on her own side. She is the *sole* source of Polynesian ancestry in the entire tree.

Which is the answer to a question I'd never actually been able to answer. Dana gave our children Tahitian names — Poehina, Rahiti — and until the records came back, that was heritage held as family knowledge, the kind of thing you know is true without being able to point at where it comes from. Now I can point. It comes from one woman from Huahine, and it runs down a single thread to two kids in a house in the United States who will grow up with her language in their names. That's what the honest machine gets you that the slot machine never will: not more ancestors, but the *real* one, in the *right* place, load-bearing.

## The walls I did not get past

If I only told you the wins, I'd be doing the exact hint-leaf dishonesty this project exists to refuse. So here's the failure inventory.

**The login walls never fully fell.** FamilySearch authentication kept expiring mid-run and couldn't be restored without physically signing into the daemon browser myself; the JSON API would return a 401 even while the page rendered as logged-in. I refused to guess or brute-force credentials, so those runs just stalled and got logged as stalled.

**Every Asian line bottoms out at the immigrant who never left home.** The deepest proven ancestor on each of those threads is blocked by an in-country register that isn't online: the Japanese line needs a *koseki*, the Korean lines need clan and household registers, the Chinese line needs a Cantonese village register. The free online frontier is exhausted — I directly searched every floor ancestor, confirmed there's no digital next step, and wrote that down instead of inventing a plausible parent.

**Newspapers.com will tell you a page exists but not show it.** I located and date-bracketed two dozen pages mentioning one ancestor's name and did not purchase them, so the identity behind that name stays unverified. Counts are free; pages cost money; the honest label is "found, not confirmed."

**And the OCR traps got caught.** A marriage hit that looked like a match turned out to be an OCR column-merge of two adjacent grooms on a page — the software had glued two men into one. A ship-manifest name self-corrected from "LICHON" to "LI CHON" on a closer read and the candidate was withdrawn everywhere it had been provisionally used. Inferred-but-unproven fathers were labeled INFERRED and kept *out* of the tree until proven — even the ones that later turned out to be right.

That last point is the one I'd underline. Some of my guesses were correct. They still didn't go in as facts until a document said so. Being right by luck and being right by evidence look identical in the moment and completely different in ten years, and only one of them is worth handing to your children.

## Why do it at all

Because a family tree is one of the few things you build explicitly for people who aren't born yet, and those people deserve to inherit the truth and not a vibe. My kids are going to open this someday. When they do, a solid node will mean "we have the paper," a dashed node will mean "we think, but we don't know," and a `[not found]` will mean "here's an honest wall someone might climb after us." That's an heirloom. A tree full of confident guesses is just a story that happens to have your name in it.

The rule was never really about genealogy. It's the same rule I bring to a research loop or a mortgage calculation: the machine is allowed to be uncertain, it is not allowed to lie about being certain. `[not found]` beats a guess. Full stop.

Cheers,
Chris
