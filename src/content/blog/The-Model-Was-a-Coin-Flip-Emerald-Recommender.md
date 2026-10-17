---
title: "The Model Was a Coin Flip: Rebuilding the Emerald Exchange Recommender Around the Red Dots"
date: 2026-10-15T04:00:00.000Z
excerpt: "The old model was tuned to the wrong question. When I finally scored it on what the household did, it couldn't tell a title you'd want from one you'd veto any better than chance."
---

# The Model Was a Coin Flip

Here's the request as I typed it on a Thursday evening in October, minus the asterisks: *the recommendation engine is utter sh\*t — make it as close to best in class as is reasonable, not seeking perfection.*

That was a little unfair to the June version of me who built it, and to the July post where the recommender "earned a number." It did earn a number. It was the wrong number. The rebuild took about 53 minutes from that message to a new model live in production and merged to main, including a rollback in the middle. This is the field note on what was actually wrong, what replaced it, and the correction I owe the July post.

## The take, first

The old model was tuned to the wrong question. It got good at reconstructing the library, and nobody asked it to do that. When I finally scored it on what the household *did*, freezing the data at a date and checking it against what people added or red-dotted afterward, it couldn't tell a title you'd want from one you'd veto any better than chance. TV came in at an AUC of 0.495. A coin flip is 0.5.

The household had already told me this, in the only language the strip gives them. By early October there were about **1,900 red dots against roughly 120 adds**, and usage tells the rest: 647 red-dot actions in June, 261 in July, and then essentially nothing in August and September. Two actions in two months. They didn't complain. They stopped looking.

So the fix wasn't tuning. The new recipe is a small per-household model that learns what separates a *want* from a *veto*, and then builds a slate that looks like the household instead of like the single genre it happens to own the most of.

## What the old one did

For context, the recommender lives in a FastAPI sidecar on the NAS. It holds a local TMDB catalog of about 35,000 movies and 6,800 TV titles, each with a 384-dimension text embedding plus cast, crew, and keyword tables. The library itself (895 movies and 335 shows at the time) comes from Radarr and Sonarr. The feedback is red and green dots, strip clicks, adds, and a "watched" signal once something's 40% played.

The June recipe, `fused`, worked like this:

- Pull ~2,400 nearest neighbors around the centroid of everything owned, keep 800.
- Score each by its best "fused" similarity to any *single* owned title: 1.0 content, 0.7 cast, 0.5 crew, IDF-weighted, all hand-set.
- Subtract a flat 0.30 penalty if it looked like something red-dotted.
- Cap kids titles. That was the only diversity control.

It was tuned by leave-one-out: hide an owned title, see if the model brings it back. That's the metric the July post bragged about, and it's the root of the problem.

## The flattering metric

Leave-one-out reconstruction rewards exactly one skill: predicting franchise siblings. If you own four Pixar movies and I hide one, the model wins by recommending the fifth Pixar movie. That's easy, and it says nothing at all about the 1,900 times someone looked at a pick and said no.

When I rewrote the evaluation harness, I put the reason in the docstring so I'd never forget it:

```
WHY THIS AND NOT LEAVE-ONE-OUT
  The earlier research loop scored library reconstruction (hold out an owned
  title, see if it comes back). That rewards predicting franchise siblings and
  says nothing about the ~1,900 red dots the household has put on served picks.
```

The new harness is a replay. Freeze the household at a cutoff date, use only what was known before it, and score the model on what actually happened after: titles later added or liked versus titles later red-dotted. Two cutoffs, June 15 and July 1, separately for movies and TV. The headline metric is judgment AUC: given one title the household later wanted and one it later vetoed, how often does the model rank the wanted one higher?

Old `fused`, on that test: 0.615 and 0.541 for movies, **0.495 and 0.430 for TV**. The July 1 TV number is *worse* than a coin. It wasn't just failing to find good picks, it was actively steering toward the things that got red-dotted.

I also owe a correction. The July post says the research loop "converged at roughly 10.4 times the baseline." That's true of the research loop. It's not what shipped. Production ran the iteration-3 port, roughly 5x by its own config note, and the absolute number behind the "10.4x" was nDCG@10 going from 0.0021 to 0.0219. Ten times almost nothing is still almost nothing, and that should have been the sentence I wrote. Multipliers on tiny baselines are how you fool yourself in public.

## The new one: learn the veto

The new recipe, `ranker`, is about 670 lines of numpy and scipy in the same sidecar. No new service, no GPU, no deep model. It's two stages and a slate builder.

**Candidates.** Three sources feed a pool of about 600:

- Multi-interest clustering: spherical k-means over everything the household is positive about, with a quota per cluster. A household that likes both nature documentaries and heist movies has two tastes, not one blurry average. (This is the PinnerSage idea, scaled down to a NAS.)
- A cheap first pass of the household model over every eligible title in the catalog, held in memory so there's no 4,096-neighbor cap this time.
- The best recent releases, so the strip isn't all catalog.

**Features.** Eighteen of them, each computed against *both* sides: positives (library, likes, adds, clicks, watches) and negatives (dislikes and household vetoes). Content cosine, as both the max and a top-10 mean. A hinge for "this is closer to the vetoes than to the positives." IDF-weighted cast, crew, and keyword overlap with each side. Genre, language, and decade log-odds. Bayesian rating, vote volume, votes per year, popularity, age.

**The model.** A class-balanced logistic regression, fit separately for every user and media kind by Newton's method. It's ridge-shrunk toward a hand-set prior, so a sparse household still gets sane weights instead of overfit noise. Each title's own vote is excluded from its features during training, which matters more than it sounds: otherwise the model learns "things I red-dotted look like things I red-dotted." The fit is cached and redone after 12 hours or when the judgment counts drift.

That's it. Logistic regression. The whole improvement came from asking the right question and giving the model the vetoes as real training data instead of a flat penalty.

## The slate is half the product

A ranked list isn't a strip. The old strip's top 20 was 85–95% one genre, because the household owns a lot of one genre. The new slate builder is a greedy calibrated selection (Steck's calibrated recommendations, RecSys 2018): at each position it picks the title that best balances relevance against keeping the slate's genre mix close to the household's real mix. Constraints are enforced at every position:

```python
repeat = np.array([c != 0 and c in seen_coll for c in collection])
if (allowed & ~repeat).any():
    allowed &= ~repeat
if n_kids + 1 > kids_cap * m and (allowed & ~kids).any():
    allowed &= ~kids
if n_fresh < int(fresh_floor * m) and (allowed & fresh).any():
    allowed &= fresh
q = (1 - CALIBRATION_SMOOTHING) * (qsum + gdist) / m + CALIBRATION_SMOOTHING * target
kl = (target[has_target] * np.log(target[has_target] / q[:, has_target])).sum(axis=1)
obj = np.where(allowed, (1 - lam) * rel - lam * kl - mu * best_sim, -np.inf)
```

One title per TMDB collection. Kids titles capped at 15%. At least 25% fresh releases. A small penalty for near-duplicates. Every constraint is written as "only if something else is still allowed," so the slate degrades gracefully instead of coming back empty.

The result: the top genre's share of the top 20 went from 0.85–0.95 down to 0.35–0.50, intra-list similarity fell from about 0.5 to about 0.12, and the average TMDB rating of the top 20 went up a full point or more (movies 6.1 to 7.4, TV 7.1 to 8.0). It's more varied, and it's better.

## The numbers

On the replay, old to new:

| Cutoff (Jun 15 / Jul 1) | old `fused` | new `ranker` |
|---|---|---|
| Judgment AUC, movies | 0.615 / 0.541 | **0.852 / 0.785** |
| Judgment AUC, TV | 0.495 / 0.430 | **0.817 / 0.868** |
| Top 50 later wanted vs. vetoed, movies | 0 vs 9, 0 vs 8 | 3 vs 4, 5 vs 2 |
| Top 50 later wanted vs. vetoed, TV | 2 vs 13, 2 vs 15 | 4 vs 1, 4 vs 0 |

That top-50 row is the one I'd show anyone. The old model's top 50 movies at the June cutoff contained *zero* titles the household later wanted and *nine* it later red-dotted. The new one's TV top 50 at the July cutoff has four wants and no vetoes.

Then live, comparing the first week of the new model to the four months of the old one:

| | served | adds | red dots | add rate | red-dot rate |
|---|---|---|---|---|---|
| `fused` (Jun 1 – Oct 8) | 4,324 | 70 | 970 | 1.6% | 22.4% |
| `ranker` (first ~6.5 days) | 1,860 | 28 | 55 | 1.5% | **3.0%** |

Read that honestly: **adds per impression didn't move.** What moved is vetoes, which fell about sevenfold. That's still a real win, because a strip where one pick in five gets red-dotted is a strip people stop opening (see: August). But "fewer bad picks" isn't the same claim as "more good picks," and I'm not going to round one up into the other.

Launch day alone: 880 served, 22 adds, 43 red dots. Compare the last Sunday under the old model: 680 served, 1 add, 62 red dots. 172 tests pass, seven of them new for the ranker.

## What "within reason" meant

The other half of the request was *not seeking perfection*, and that's a real constraint. These are the things I tested and deliberately left out. They're in the `ranker.py` docstring under "TESTED AND LEFT OUT" so future me doesn't redo them:

- **Collaborative filtering from TMDB's per-title "recommendations."** About 3,200 read-only TMDB calls, one per owned or judged title, to see if "people who liked X liked Y" helped. It was a wash at both cutoffs, below noise in both directions. It doesn't earn a new table, a migration, and an ingest worker. Out.
- **Recency-weighting the positives.** No measurable effect. Out.
- **Anything deep.** No two-tower model, no GPU, no new serving infrastructure. The NAS has a weak CPU and the household has one or two active users. Logistic regression with good features is the right size of tool, and it's the one I can debug at 11pm.
- **Tuning the old model.** I didn't. The data showed the problem plainly, so I replaced it instead of tuning it.

## Three things that went wrong on the way

**I shipped it after timing it on the wrong machine.** First activation on the NAS served requests in 8 to 14 seconds against a 15-second backend timeout. I'd measured latency on the Mac, where it was fine, even though the NAS's weak CPU and FUSE-mounted database were documented. Every request was re-running full-table scans over a 2 GB database on spinning storage. I rolled back to `fused` about four and a half minutes after going live, moved the cast, crew, and keyword matrices into memory so nothing gets rebuilt on the request path, and re-activated. Warm requests now take 1.25 s for movies and 0.41 s for TV on the NAS. The lesson is the oldest one there is: benchmark where it runs.

**Tagesschau.** The first good-looking TV slate had a 1952 German news program sitting near the top with a z-score of 3.16. Nobody in this house has ever red-dotted or green-dotted a German news program, and that was the problem. Plain Laplace smoothing on log-odds, with very unequal class sizes (far more vetoes than wants), hands an *unjudged* category a free boost of about +0.9 toward whichever class is smaller. The fix smooths each category toward its share of the whole catalog and shrinks the result by how much evidence there actually is:

```python
def lo(cp_, n_p_, cn_, n_n_):
    rate_p = (cp_ + LOGODDS_PRIOR * n_p_ * share) / ((1 + LOGODDS_PRIOR) * max(n_p_, 1.0))
    rate_n = (cn_ + LOGODDS_PRIOR * n_n_ * share) / ((1 + LOGODDS_PRIOR) * max(n_n_, 1.0))
    evidence = cp_ + cn_
    with np.errstate(divide="ignore", invalid="ignore"):
        raw = np.log(rate_p / rate_n)
    return np.where(evidence > 0, np.nan_to_num(raw), 0.0) * evidence / (evidence + LOGODDS_EVIDENCE)
```

No evidence, no opinion. Tagesschau disappeared.

**Success broke Radarr. Sort of.** About ninety minutes after launch I got this message: *"Recommendation engine is MASSIVE upgrade but seems something funky with radarr."* The picks were good enough that the household queued several big movies at once. The unpack queue plus a Plex transcode pushed the NAS load to about 15 on six cores, grabs started taking 25 to 46 seconds, and because the Grab button didn't stay "Grabbed," a second impatient click re-queued the same 10 GB release. The button now stays grabbed after one click. While digging, I also found the Cloudflare-challenge solver had been cut off from its network since a VPN restart four days earlier. A good recommender found a problem that had nothing to do with recommendations.

And one bug that was quietly hurting the old model the whole time: the retrieval layer dropped any candidate whose title before the colon matched something owned. Owning *Pirates of the Caribbean: The Curse of the Black Pearl* silently banned *At World's End*. Sequels were invisible. The new slate recommends *At World's End* with the explanation "matches The Curse of the Black Pearl," which is about as on-the-nose as a recommendation gets.

## What I'm not claiming

- **One household, small samples.** Each cell in the replay has 25 to 80 later-wanted titles. And the calibration strength and fresh-release floor were swept on the same two cutoffs I report, so the offline gain is somewhat optimistic. It's a strong result, not a clean one.
- **The old model wasn't a pure coin flip everywhere.** Scored only on titles it actually served, its movie AUC was 0.69 and 0.75. The headline uses all later judgments, which is the fairer test, but it's the less flattering slice for the old model.
- **"Positive" mostly means owned, not enjoyed.** The player's watch signal barely exists yet: five "watched" rows. Until that fills in, the model knows what we keep, not what we finish.
- **No A/B test.** Six and a half days, essentially one active user, and probably some novelty effect. The red-dot drop is large enough that I believe it. The flat add rate is the number I'll watch.
- **TV still leans documentary.** The household owns a lot of nature docs, and the model believes it. Fair enough.

Old configs stay in the table, so rollback is one row. I haven't needed it since that first four-and-a-half-minute detour.

## The shape of it

The useful lesson isn't logistic regression or calibrated slates. It's that the household had been answering the right question for four months, one red dot at a time, and I'd built a model that never listened. The metric I was proud of measured something nobody wanted. The metric that mattered was sitting in a table the whole time.

Measure the thing people actually do. Then believe it, even when it says the thing you wrote a blog post about was a coin flip.

Cheers,
Chris
