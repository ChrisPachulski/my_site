---
title: 'The Canon Was the Scaffolding: 298 Philosophers, a Homelab, and One Question About Opaque AI'
date: 2026-06-26T04:00:00.000Z
---

# The Canon Was the Scaffolding

I spent a weekend loading 298 works of Western philosophy into my reference library, Anaximander to C.I. Lewis, and the library was never the point. The point was one question I couldn't stop circling: if morality is fundamentally about owing each other a justification, what happens when the thing making the decision is a model that can't give one?

That's the paper I'm actually chasing. The 298 books are the scaffolding I built to chase it. This is the field note on building the scaffolding — because the intellectual question is still half-formed, but the machine that lets me read my way to it is done, and the machine turned out to be the more honest story.

## The take, first

You do not need a paper draft to start a paper. You need the sources on disk, tagged, searchable, and file-backed, so that "what did Scanlon actually say about aggregation" is a two-second query and not a forty-minute detour to a library website that wants me to make an account. I built the library first, on purpose, and I built it to be a records room — not a reading app that gamifies my attention.

So the deliverable here isn't an argument. It's 298 canonical works living in my personal Zotero library, each one a real record tagged by era and branch, with an actual downloaded file behind it wherever I could get one. On top of that sits the thing I actually care about: a hand-built 50-work survey on one idea, and a folder of contemporary AI-ethics papers that give away where the whole thing is headed.

Let me walk through what that took, because the honest version has more failure in it than success.

## The canon: a chronological spine

The base is 298 works across 161 unique authors. I wrote them out as eight JSON files, one per era, every entry carrying an `era` and a `branch` so the whole thing sorts and filters without me thinking about it.

The era split, since I promised real numbers and not vibes:

- Ancient: 56
- Medieval: 27
- Renaissance: 13
- Early Modern: 53
- Nineteenth: 45
- 20th-C Analytic: 45
- 20th-C Continental: 43
- American Pragmatism: 16

By branch it runs Metaphysics 61, Epistemology 56, Ethics 52, Politics 43, then the long tail down through Logic, Philosophy of Mind, Philosophy of Language, Aesthetics, and single entries for things like Philosophy of Technology and Hermeneutics.

That spine is deliberately dumb. It's a chronological reading order, the kind of list you'd get from any decent survey course. The intelligence isn't in the spine. It's in the 50-work survey I built on top of it, and in the fact that I could get most of these onto disk at all.

## The actual thesis lives in one JSON file

Buried in the project is `09_mutual_justification.json` — a 50-work reading list built around a single idea in ethics and political philosophy: **morality as justification to others.** The contractualist line. The "right to justification." The claim that what makes an action wrong isn't that it lowers the total amount of welfare in the universe, but that you couldn't justify it to the person it lands on.

I organized those 50 works into eight hand-labeled clusters, A through H, and if you read the cluster labels back to back they read like a paper's section outline:

- **A — Social-contract foundations:** Hobbes, Locke, Rousseau, Kant's *Groundwork* and second *Critique*.
- **B — Contractualist core:** Rawls (*A Theory of Justice*, *Political Liberalism*), Scanlon's *What We Owe to Each Other*, Gauthier, Barry, Forst's *The Right to Justification*.
- **C — Kantian second-personal justification:** Korsgaard, Darwall's *The Second-Person Standpoint*, O'Neill.
- **D — Pragmatist inflection** (the biggest cluster, ten works): Peirce, James, Dewey four times over, Rorty, Putnam, Misak.
- **E — Genealogical method:** Nietzsche's *Genealogy of Morality*, Williams' *Truth and Truthfulness*, Fricker's *Epistemic Injustice*, Foucault.
- **F — Post-metaphysical and discourse ethics:** Habermas three times, Apel, Benhabib.
- **G — Naturalistic grounding, tested over millennia:** Hume, Adam Smith's *Theory of Moral Sentiments*, Mackie, Gibbard, Kitcher, and — the tell — Tomasello's *A Natural History of Human Morality*, a 2016 evolutionary-anthropology book.
- **H — Against the welfare-calculus:** Williams again twice, Anscombe's *Modern Moral Philosophy*, Nozick, Foot, Sen and Williams' *Utilitarianism and Beyond*.

Seventeen of the fifty are flagged as core must-reads; the rest are context. That Tomasello entry sitting at the end of cluster G is the giveaway that this isn't a museum tour. You don't put a 2016 book about where cooperation evolved from into a canon list unless you're building ammunition for an argument about where moral obligation actually comes from.

## Where it's pointing: the AI paper

The last thing I did that weekend was pull eight recent AI-ethics papers into a staging folder. I'll give you the filenames, because they're real, locatable works and they draw the line by themselves: *Of Opaque Oracles*. *Beyond Transparency*. *The Verification Bottleneck*. *Four Responsibility Gaps*. Elish's *Moral Crumple Zones*. Nguyen's *Transparency is Surveillance*. Durán on grounds for trust in machine learning.

Put those next to a 50-work survey on justification-to-others and the through-line is not subtle. If the wrong-making feature of an act is that you couldn't justify it to the person affected, then an opaque model that produces a decision *and cannot say why* isn't a smaller version of a moral agent. It's a different kind of thing, one that breaks the mechanism morality was supposed to run on. That's the paper. The canon is how I earn the right to make that argument without hand-waving.

I want to be honest that the paper does not exist yet. There's no draft, no `.tex`, no abstract. The argument currently exists as a reading list and a set of cluster labels. What I built is the machine that lets me read toward it fast. Calling it a paper right now would be a lie, and the whole design of this thing is about not lying to yourself regarding what you actually have.

## The hard part was never the metadata

Here's where it gets technical, and where the good engineering is.

Making 298 Zotero records is trivial — it's an API call in a loop. Attaching the actual *files* to those records, when your Zotero library is backed by WebDAV on your own hardware, is not trivial. It's the whole game.

Zotero's normal sync path refuses to let the Web API upload a file to a WebDAV-backed personal library. You can create the metadata item, but the file itself has to arrive through WebDAV, and the API won't do it for you. So I found the side door, and my own script's docstring calls it "the only thing that works": create the attachment item through the Web API with the `md5` and `mtime` set by hand, then build the two files Zotero's WebDAV store actually expects — a `{KEY}.zip` holding the file, and a `{KEY}.prop`, which is a tiny XML blob carrying the modification time and the hash — and drop them straight into the store on the NAS. The same homelab box that runs my Plex replacement runs the Zotero WebDAV store, so "upload" is really `scp` into a directory, with the item metadata forged to match byte-for-byte.

Once that mechanism worked, the rest was a war of attrition to actually *find* the files.

## The acquisition funnel, and its honest scoreboard

I built this as a five-stage funnel. Each stage is a resumable script with its own JSON state file, and each stage exists only to mop up what the previous stage couldn't get. The design assumption baked in from the start was that I would *not* get everything, so every stage had to be re-runnable and had to leave a paper trail of what it missed.

Stage one finds free full-text URLs — Project Gutenberg's API first, Internet Archive as the fallback. That resolved a source URL for 293 of 331 keys: 264 from Internet Archive, 29 from Gutenberg, 38 with nothing.

Stage two is the core loader, the one that creates the record, downloads the file, and pushes it to the NAS. The run log tells the true story better than I could: **files 129, links 144, meta-only 24, skip 1, fail 0, total download 1,865 MB.** Read that again. Of 298 works, only 129 got a real file on the main pass. 144 of them I couldn't get a file for at all, so they fell back to a link attachment pointing at wherever the source lived. Twenty-four are metadata and nothing else.

That's a 43% file-hit rate on the first serious pass. Not great. But — and this is the pivot qualifier — every one of those 144 misses was logged as a specific, winnable-or-not target, which is what made the later sweeps possible instead of a guessing game.

The later stages each clawed back a handful. A public-domain sweep through Gutenberg and Internet Archive got 52 more. A couple of legally-grayer sweeps against the mirror sites got the rest in single- and double-digit batches, and I'll be candid that those paths are exactly as gray as they sound — routing around an ISP block for out-of-copyright-in-spirit-but-not-in-law academic books. I'm not going to publish that recipe. I'll just say the clean paths (Gutenberg, Internet Archive, genuine public domain) did most of the honest work, and the gray paths were the part I'm least proud of and most likely to rip out.

## The one heuristic I'm actually proud of

When you're scraping a book mirror for "the right file," the results are garbage-adjacent. You get 0.1 MB snippets that are really just a table of contents. You get 400 MB mega-scans that are someone's entire personal library glued into one PDF. You get the wrong edition, the wrong author, a lecture *about* the book instead of the book.

So the scraper has a scoring function, and it's the most engineered thing in the repo. Title-token overlap counts for ten times its weight, and anything under 0.45 overlap is rejected outright. Then: plus four if it's a PDF, plus three for EPUB, plus two for DjVu. **Minus four if the file is under 0.2 MB** — that's a stub, not a book. **Minus two if it's over 120 MB** — that's a library dump, not the work. Plus three if the author's surname shows up in the result row, plus a little if the year is within 60 of the real publication date.

Those minus-fours and minus-twos are not clever. They're scar tissue. Each one is a specific pile of garbage I got back and had to teach the machine to refuse. And there's a nice bit of reuse hiding in it: the hash the mirror gives you doubles as both the integrity check for the download *and* the hash you write into Zotero's `.prop` file. One number, two jobs. On top of that, the validator sniffs magic bytes before accepting anything — a PDF has to start with `%PDF-` and carry `%%EOF` near the end, an EPUB has to start with `PK`. A file that lies about its type gets dropped.

## The failures I want on the record

A few things simply cannot be downloaded, and pretending otherwise would defeat the purpose.

The Presocratics are ungettable. Anaximander, Parmenides, Zeno, Empedocles — their *Fragments* aren't a book you download. They're quotations preserved inside other people's books across two and a half thousand years. The logs for those entries are a wall of MISS and FAIL, and that's correct. The right answer for those was to stop trying to make a file appear and leave the record honest.

And then there's the running joke of the whole run: `Williams — A Critique of Utilitarianism` fails in *every single log.* libgen, VPN, retry, public-domain sweep — every path, every time. Bernard Williams wrote one of the sharpest attacks on the exact welfare-calculus view my survey is organized against, and it is the one book my machine could never lay hands on. I choose to read that as the universe having a sense of humor about a project on moral obligation.

Two more limitations worth stating plainly. The coverage is partial and lossy — 129 real files, 144 links, 24 metadata-only on the main pass, and while later sweeps improved it, "I have the canon on disk" is an overstatement I won't make. And the whole thing is not even in version control. State lives in JSON checkpoints and log files. The resumability is home-grown, not backed by git history, which is a little embarrassing for someone who writes about tooling, and it's the first thing I'd fix.

## Why build it this way at all

Because the alternative is what everyone actually does: open a browser tab, search a term, skim an abstract, close the tab, forget it. The knowledge never accretes. Every question starts from zero.

I wanted the opposite. I wanted a records room where the sources sit still, where a guess looks like a guess and a primary text looks solid, where the survey structure — those eight clusters — is itself an argument I can interrogate. The point of loading 298 books wasn't to have read 298 books. It was to make the 50 that matter frictionless to move between, so the actual intellectual work — the part no script can do — happens against a full shelf instead of a search bar.

The canon was the scaffolding. Now I get to climb it and find out whether the question at the top holds up: whether "you owe me a reason" survives contact with a decider that structurally cannot give one. I don't have that answer. But the machine that lets me go get it is finally built, and it's honest about everything it couldn't reach — which is the only kind of scaffolding worth standing on.

Cheers,
Chris
