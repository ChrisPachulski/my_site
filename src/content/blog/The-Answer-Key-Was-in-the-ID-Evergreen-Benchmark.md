---
title: "The Answer Key Was in the ID: Taking Evergreen's Judge from Honest Baseline to Honestly Mid"
date: 2026-08-26T04:00:00.000Z
---

# The Answer Key Was in the ID

In June I wrote a post about Evergreen, my docs-freshness tool, that had a section called "killing my own perfect score." I was proud of that section. I threw out a vanity 1.00, re-ran on an external corpus, and published the honest numbers: recall 0.89, specificity 0.95, and a flat admission that a peer tool beat me on precision.

Those numbers were contaminated too. Every benchmark Evergreen had ever published, including the "honest" ones, was measured with the answer printed in the question. This is the field note on how I found out, what it cost, and what the clean numbers actually say. Short version: *mid.* Literally. That's the word the session used, and it was right.

## The take, first

If you benchmark an LLM judge, the judge will find any leak in your setup before you do. It doesn't have to be clever. It just has to read.

Every pair in Evergreen's benchmark was a piece of documentation and a piece of code, and the question was "does the doc still tell the truth about the code?" Each pair had an ID. The IDs ended in `-old` or `-new`. Old doc against new code was a drift candidate; new doc against new code was a control. And the judge prompt included the ID.

```python
Reply with exactly one line of JSON and nothing else:
{{"id": "{pair['id']}", "verdict": "consistent" | "inconsistent", ...}}
```

A real prompt from that era contained the line `# Pair id: Textualize/rich/Console.pager#240-old`. That's the answer key, stapled to the exam. The fix was one line. Finding it took a Codex lane doing a provenance audit, more than three weeks after I published numbers built on top of it.

## How "A-grade, for real this time" started

Mid-July I kicked off a mission with a deliberately pointed title: *take evergreen's detector from honest baseline to A-grade — for real this time.* The "for real this time" was earned. The mission prompt had a section called "Standing decisions that bind you," with the subtitle "violating these is how trust died last time," and the rule I cared about most: *prove it or drop it applies to your own claims.*

There was a written bar for A-grade, frozen in a policy file so I couldn't move it later. Precision, recall, and F1 all at least 0.8 at a natural 10% drift prevalence. Specificity at least 0.98. At least 100 positives and 100 negatives per language. Confidence-interval lower bounds of at least 0.7.

The machinery got serious fast. The judge moved to Codex `gpt-5.6-sol`. The benchmark grew to five languages and about 2,100 pairs. Every judgment ran through the full trial from the June post (snap call, challenge, three blind prongs, blind-spot pass, synthesis), with every stage returning rigid JSON and a deterministic resolver folding them into a verdict you can replay bit for bit. The dev/holdout split was repository-grouped and HMAC-ordered against the dataset hash, so I couldn't peek at the holdout even by accident.

Java went first. Natural F1 across four dev runs: 0.32, 0.32, 0.32, 0.35. Not good. So I sat down and hand-judged 88 blinded, contested rows myself, the ones where the judge and the label disagreed. A lot of the "errors" turned out to be label mistakes, and the corrected F1 for run 3 jumped from 0.29 to 0.75.

And then I said the thing.

## "This to me is an A grade"

My exact message, typo included: *"This is legitamately publishable - this to me is an A grade."*

The agent pushed back, and this is the moment I'm glad the policy file existed. It quoted the policy back to me: frozen precisely so that "done" can't be redefined in the afterglow of a good week. Then it checked the one thing I hadn't. No language in the benchmark had even 100 positives. The bar wasn't missed by a little. It wasn't even measurable yet.

Looking back, the 0.75 was shaky on its own terms anyway. One annotator (me), auditing only the rows the judge had flagged, on runs that, it would turn out, had leaked IDs too. But I didn't know that yet. I said green light, do it all, and the next phase was supposed to build out labels at scale.

## 1,254 sessions and a silent wall

Building labels at scale meant a three-model screen: every candidate pair judged by Claude Fable 5, Opus 4.8, and Sonnet 5, a different vendor from the Codex judge on purpose, keeping only rows where the majority agreed. On July 18 that screen launched about 1,400 Claude sessions in roughly two and a half hours, in batches of ten pairs each.

**962 of them returned nothing but "You've hit your session limit."**

The validation script swallowed stderr. So a subscription that had hit its ceiling looked, to the pipeline, like a model that had answered zero questions and exited cleanly with status 0. Two thirds of the screen was silence, and the pipeline reported success.

The fix was to make every screen fail closed: a timeout, a quota exit, a missing ID, a duplicate ID, or a partial batch all stop the line instead of counting as zero. Later Sonnet developed a habit of returning 19 answers for 20 items, or echoing the input back. The strict parser rejected those batches, and the screen resumed from its ledger. That's boring infrastructure, and it's the reason the clean numbers below exist at all.

## The audit that found the key

The same afternoon, at 18:16 UTC, a Codex lane doing a provenance audit of the pipeline wrote the sentence that unwound two months of numbers: the IDs end in `-old`/`-new`, and *the current trial envelope sends that ID to the judge.* It called the leak "the crucial issue Claude missed," which was fair, and a little rude.

That one finding contaminated everything:

- The June post's 0.89 recall and 0.95 specificity: ID in the prompt.
- The five-language 0.4.0 release numbers from July 12: ID in the prompt. The repo now labels them contaminated in its own README.
- The Java dev runs: 458 of 496 controls carried a `/cN` suffix, and every one of them was labeled consistent. Different suffix, same leak.
- The label screen itself: the pre-fix sessions saw the IDs too.

The fix, in full:

```python
def _pair_envelope(pair):
    data = _validated_pair_data(pair)
    data["id"] = "pair"
```

Every pair is now just `"pair"` as far as the judge knows. The screen uses batch-local IDs like `item-0042` that mean nothing outside the batch. The leaked vote files got quarantined in a folder whose name records the date of the shame. And the CoDocBench "holdout" got demoted to dev-only, because the pre-fix screen had already looked at it. A holdout you've peeked at isn't a holdout anymore.

## The clean numbers

The clean screen ran 5,544 votes (three models times 1,848 dev rows), with Fleiss' kappa between 0.52 and 0.70 depending on language. Then the judge ran on the screened rows with nothing in the prompt but the doc and the code.

| Language | Precision | Recall | F1 (raw) | F1 at natural 10/90 |
|---|---|---|---|---|
| TypeScript | 0.433 | 0.722 | **0.542** | 0.48 |
| Rust | 0.711 | 0.711 | **0.711** | 0.65 |
| Python | 0.576 | 0.891 | **0.700** | 0.52 |
| Go | | | no result | |

The raw column comes from the dev set's own drift prevalence, which is higher than real life. The last column is what you'd see in a real repo. Rust is a promising prototype, TypeScript is weak, and Python is fine at catching drift and loose about crying wolf.

One more correction is buried in that table. For a while the README said Python's 0.700 "lands close to Rust's 0.711 at natural prevalence." A verification pass caught that 0.700 was the *raw* number; the natural one is 0.52. The fix commit relabeled it. Even after the big leak, the small lies keep trying to get back in through the wording.

## The $5,600 question

Then Go. The Go full-dev lane launched into a Codex quota that was already exhausted. Every one of its 692 logical judge calls retried to the ceiling: 2,076 attempts, 346 out of 346 rows abstained. Across the clean runs that kept attempt ledgers there were 5,071 judge attempts, and about 41% of them were Go buying nothing.

The bill I came back to, by my own count, was **$5,600.** My message to the session: *"Apparently you unleashed codex and grew a $5,600 codex bill - was it worth it?"* And after seeing the table: *"these metrics appear to show evergreen as very mid."* And then, inevitably: *"so we spent $5,000 for a worse tool."*

The answer I got back is the best sentence anyone wrote that week:

> The money didn't buy a worse tool. It bought the number that told you the tool is mid.

That's correct, and it doesn't make the Go part less dumb. A single health check before launch would have caught the empty quota. The agent wrote that itself in the post-mortem, which I appreciated, in the way you appreciate a contractor telling you the leak was their fault.

## The cascade: stop paying the jury for boring rows

Out of the bill came the right engineering question: why does every pair go through the full jury? Most pairs are boring. The doc says the function returns a list, the function returns a list, done.

The staged cascade puts one cheap screen in front of the jury and a router that is deliberately asymmetric:

```python
def route_screen_v3(result):
    """Asymmetric router: may cheaply clear a boring negative, never a drift flag."""
    value = valid_screen_value(result)
    if value is None:
        return {"decision": "jury", "reason": "screen-invalid-or-abstained"}
    if value["verdict"] != "consistent":
        return {"decision": "jury", "reason": value["verdict"]}
    if value["proof"] != "direct":
        return {"decision": "jury", "reason": "non-direct-proof"}
    if value["category"] is not None:
        return {"decision": "jury", "reason": "category-present"}
    if value["uncertain"]:
        return {"decision": "jury", "reason": "screen-uncertain"}
    return {"decision": "clear", "reason": "direct-consistent"}
```

The screen can clear a pair only when it says consistent, cites direct proof, names no drift category, and isn't uncertain. It can never clear a drift flag. Anything else goes to the unchanged jury. A hard ceiling on provider attempts counts every retry, so a dead quota can't run up another Go-sized bill.

Before running it, I put the paid-run proposal itself on trial with my blind decision-trial skill. Two independent reviewers, neither seeing the other. The Opus reviewer said READY. The Codex reviewer said REVISE and found a real defect: parts of the jury already ran on the *cheap* model, so swapping in a cheaper screen model would have quietly changed the jury too. The proposal was revised to keep one model throughout. The point of two vendors is that they miss different things.

On Python, the cascade cleared 96 rows cheaply and sent 198 to the jury, with one false negative from an auto-clear. That's about a third of rows skipping the jury. By my math, that's not enough to pass the 70% cost-reduction gate I'd set for it, and the gate script was never actually run. So the cascade's cost case is unproven. I'm saying that here instead of letting the design doc imply otherwise.

## The verifier that could never say yes

The last story is my favorite, because it's the tool's whole thesis turned on itself.

Back in July I'd built a fail-closed `grade verify` command: give it the evidence, and it tells you whether Evergreen has earned an A. Later, a code-quality pass found what was inside it. From the commit message that deleted it:

> `grade.py` seeded the detector category with a failing reason unconditionally and never set five of its eight predicates, its own tests asserted the unreachability, and nothing called it.

A verifier that could not award an A to any input, with tests that *confirmed* it couldn't, wired to nothing. It was fail-closed in the most literal possible way. It and the grade policy were deleted in 0.7.0. The next release made a second-provider judge mandatory, so no verdict ships on one vendor's word.

And because a docs-honesty tool can't escape its own subject: release 0.8.2 found that Evergreen's README documented public install paths for what is a private repository. That had been flagged as "the owner's call" three times instead of fixed. An eval "decoy" I'd planted as a fake drift turned out to be real drift. And as I write this, the benchmark README still says "The cascade has not yet been run," a few screens above the cascade's results. The tool that checks if your docs are true has a doc that isn't.

## What I'm not claiming

- **It's not A-grade.** No language met the bar. The bar was deleted along with the verifier, which I want to be clear about: deleted because the *verifier* was broken, not met. If I write "A-grade" about Evergreen again, it'll be next to a number that clears it.
- **No result is human-verified.** The labels come from a three-model majority. The repo has a human audit lane that requires three human annotators, and it has never run.
- **There's no sealed holdout result.** The Java holdout was never unsealed, and the CoDocBench one was burned by the leak.
- **One run each, no variance.** That's an open item in the repo, not a footnote I'm adding for modesty.
- **The label-noise upside is a hypothesis.** One model's triage of Python's 53 false positives judged 31 of them defensible, which would put precision near 0.87. That's one model's read, of false positives only, and the session itself called it an optimistic bound. I'm not putting 0.87 in a headline.

## Correction to the June post

The June post's benchmark section ("killing my own perfect score") reports recall 0.89 and specificity 0.95 on 332 Python pairs. Those numbers were measured with the label-revealing pair ID inside the judge prompt and should be treated as invalid. The clean Python number is the one above: F1 0.70 raw, 0.52 at natural prevalence. The parts of that section about *why* self-made balanced benchmarks inflate scores are still correct. I just didn't apply them hard enough to myself.

## The shape of it

I keep a line at the top of the Evergreen README: *"A number you can't recompute is an opinion with decimal places."* July taught me the follow-up. A number you *can* recompute is still an opinion if the question gave away the answer. I'd recomputed those June numbers plenty of times. They were reproducible, and they were wrong every time.

So Evergreen is honestly mid: a promising Rust prototype, a weak TypeScript result, a Python judge that catches drift and over-flags, an unfinished system. That's less than I wanted to write in July. It's also the first set of Evergreen numbers I'd sign.

Cheers,
Chris
