---
title: 'Math Correctness First: How Mortgage-Ops Forbids the LLM from Owning a Number'
date: 2026-05-17T05:00:00.000Z
---

# Math Correctness First

The skill that drives my mortgage tool opens with this rule, in its own voice:

> Every dollar figure, rate, breakeven, or schedule entry in your response MUST come from a script invocation. You do NOT compute mortgage math inline. Reasoning chains like "the payment is roughly X" or "let me estimate the breakeven" are forbidden, even if the answer would be approximately right, because the user's house-buying decision deserves audit-traceable numbers.
>
> **This rule has zero exceptions.**
>
> ALWAYS shell out to scripts/ for math; NEVER compute numbers inline.

That paragraph lives in `.claude/skills/mortgage-ops/SKILL.md`, under a section called *Math Discipline (load-bearing, read carefully)*. It is the load-bearing constraint of the entire project. Every other architectural decision is downstream of it.

This post is the article I want to be able to hand someone who asks why I built a mortgage tool whose Claude skill is forbidden from doing arithmetic. The short version is that arithmetic is the wrong job for a language model, especially when the arithmetic is money and the money is mine. The longer version is what follows: the contract, the disciplines that hold the contract together, the one place a language model is allowed inside the system, and what gets ruled out as a consequence.

## Why this matters to me personally

The tool I am describing is called *mortgage-ops*. It exists because my household is shopping for a house in 2026, and the questions I needed to answer (what is the payment on this offer, what does refinancing this scenario actually cost over five years, what is my real DTI under stress, how much can we afford if rates jump 75 basis points, which of three lender quotes is best after the points are amortized) deserve numbers I trust.

The space of available tools is dominated by two extremes. On one end are the consumer calculators on Zillow, Bankrate, and NerdWallet: friendly UIs, opaque math, no audit trail, no way to vary day-count conventions or PMI dropoff or biweekly payment modes. On the other end are professional loan-origination systems (Encompass, ARIVE, the like) that cost thousands per seat and are not licensable to me as an individual.

The middle space (a personal-use, auditable, mathematically honest mortgage tool) had no inhabitant I could trust. So I built one. The act of building it taught me that the most consequential architectural choice was not which library to wrap, which framework to use, or how to model the schedule. It was where the language model was *allowed to be*. The answer turned out to be: nowhere near a number.

## The category mistake

Large language models are good at language and at pattern recognition. They are mediocre at arithmetic. They are confidently mediocre, which is the dangerous version. Ask one to compute the monthly payment on a $400,000 loan at 6.5% over 30 years and you will get an answer that is roughly correct, sometimes exactly correct, occasionally off by a few cents, and occasionally off by a few dollars in a way that survives a sanity check. The model does not flag which response it produced. You cannot tell by reading the output.

A few dollars per month on a mortgage compounds. Over 360 months it is hundreds to thousands. Over a 30-year term it is the cost of a used car. The cost of being wrong is not zero. The cost of being subtly wrong (right magnitude, slightly off) is worse than the cost of being obviously wrong, because the wrong answer survives review.

The failure modes are real and predictable:

- **Rounding direction.** US consumer mortgage software uses ROUND_HALF_UP at end-of-period. Python's default for `Decimal` is ROUND_HALF_EVEN (banker's rounding), which is correct for accounting averages and wrong for amortization schedules. A language model emitting Python code, asked to "compute the monthly payment," will silently inherit whichever default the model's training corpus emphasized. There is no flag that fires when the wrong default is used; the schedule just drifts by cents over the term.
- **Day-count convention.** APR under Regulation Z Appendix J depends on the day-count convention the creditor used to compute the finance charge. The three legal conventions are 30/360, actual/365, and actual/actual. The fractional first-period adjustment looks different under each. A language model asked to "calculate the APR" will pick one (probably 30/360, because it is the most common in its training data) and proceed silently.
- **Off-by-one in the schedule tail.** Numerical amortization of a fixed-rate loan accumulates rounding error in the principal column. The final payment is typically a few cents off the nominal monthly. A correct engine reconciles this in the final period; a model-emitted calculation rarely thinks to do so. The schedule sums to off by a quarter or three quarters.
- **Confidently wrong intermediate steps.** Newton-Raphson iteration for APR can converge to a local extremum if seeded badly, return NaN if the unit-period equation degenerates, or oscillate without converging on certain odd-first-period inputs. A language model improvising the iteration loop will frequently emit code that "looks right" and produces a number that is plausibly correct but is in fact the result of failed convergence.

None of these are theoretical. Every one is something I observed during a single afternoon of asking Claude, Gemini, and Codex to compute mortgage math directly. The numbers they produced were usually close, occasionally exact, and sometimes wrong in ways I would not have caught without an independent oracle. That afternoon convinced me to write the rule that opens this post.

## The shell-out contract

The mechanics that enforce the rule are mundane. The skill is a router and a narrator. When the user asks a question, the skill determines the mode (`evaluate`, `compare`, `refinance`, `affordability`, `stress`, `amortize`, `arm`), collects the inputs in free-form English, writes a JSON file to a tempfile, and invokes a Python script:

```bash
python ${CLAUDE_SKILL_DIR}/scripts/amortize.py --input /tmp/mortgage-ops-input-<uuid>.json
```

The script reads the JSON, validates it with Pydantic v2 in strict mode, computes the result with deterministic Python, and writes JSON to stdout. The skill reads the stdout JSON, decides whether the response was a success or a structured error, and narrates the answer to the user in English. The skill never reads the script's source. The skill never holds a number in its own context that it did not get from a script.

The error contract is uniform across every script. When a Pydantic validation fails (the user supplied a float where a Decimal was required, or omitted a required field, or supplied an out-of-range value), the script emits a six-key envelope to stderr and exits with a non-zero code:

```json
[{
  "type": "decimal_type",
  "loc": ["loan", "principal"],
  "msg": "Input should be a valid Decimal",
  "input": 400000.00,
  "ctx": {"class_name": "Decimal"},
  "url": "https://errors.pydantic.dev/2.13/v/decimal_type"
}]
```

When the input is structurally valid but the engine itself raises a domain-specific exception (the APR solver failed to converge inside the 50-iteration cap, the conforming-loan-limit lookup did not find the county, the ATR/QM threshold matrix had no row for the given lien position), the script catches the exception, writes a single-key envelope `{"error": "<message>"}` to stderr, and *still exits with code 0*. The exit code is reserved for the structural failures that the model could plausibly fix by writing different JSON. The domain failures are recovery contracts the model narrates to the user; the model does not retry them mechanically.

The contract is documented in two places: at the top of every `scripts/*.py` file (so the skill can read the docstring via `--help`), and in the `Envelope Shape Contract (WR-02 closure)` block of `scripts/amortize.py`. The doubled documentation is intentional. The model is supposed to use `--help` as its primary source of truth, and `--help` is supposed to be cheap (under 100ms) because argparse parses arguments before lazy-importing `numpy_financial` and friends.

The result of this contract is that the language model in the loop is doing exactly what language models are good at. It is reading English, recognizing intent, mapping intent to a JSON schema, populating the JSON, and translating a structured response back into a sentence. Each of those steps benefits from a model's strength at language. None of them involves a number that the model invented.

## Money discipline

The arithmetic itself lives in `lib/`. The single source of truth for project-wide Decimal handling is `lib/money.py`, which is fewer than a hundred lines and which every other module in the project imports from.

The core helpers:

```python
CENT: Final[Decimal] = Decimal("0.01")
MONEY_CONTEXT: Final[Context] = Context(prec=28, rounding=ROUND_HALF_UP)

def to_money(value: str) -> Decimal:
    return Decimal(value)

def quantize_cents(value: Decimal) -> Decimal:
    with localcontext(MONEY_CONTEXT):
        return value.quantize(CENT, rounding=ROUND_HALF_UP)
```

The rules these helpers encode are explicit:

1. **Decimals are constructed from strings, never from Python floats.** The string `"0.065"` is exact; the float literal `0.065` is the IEEE-754 approximation `0.064999999999999997...`. A `Decimal(0.065)` (note the float arg) silently inherits the float's imprecision and the Decimal carries it through the rest of the calculation. The fix is `Decimal("0.065")`. The codebase rejects the float form at the type level (`mypy --strict`) and at the boundary (Pydantic v2 `condecimal(max_digits=14, decimal_places=2)`).
2. **Rounding happens once, at end-of-period, with `ROUND_HALF_UP`.** Banker's rounding (Python's default) is correct for accounting averages because over many independent calculations the half-cases distribute evenly and the net rounding bias is zero. Mortgage amortization is not many independent calculations; it is a single recursive schedule where the half-cases stack. US consumer-mortgage software uses ROUND_HALF_UP, so the schedules I produce match the schedules a real lender will produce.
3. **The `MONEY_CONTEXT` is applied via `localcontext`, not by mutating the global Decimal context.** Mutating the global context is a footgun: it changes the rounding behavior for code outside this module, including test fixtures and library calls. The `with localcontext(...)` block scopes the change to the quantization itself.

A companion helper, `quantize_rate`, handles fractional rates at six decimal places (matching `lib/models.Rate`'s `condecimal(max_digits=7, decimal_places=6)`). It exists because rates and money have different quantums and conflating them led to drift in early phases.

There is also a test that scans the codebase for `Decimal(0.` patterns and fails the build if it finds any (`tests/test_money.py::test_no_float_to_decimal_construction`). The string `Decimal("0.065")` passes; the float-from-literal `Decimal(0.065)` fails the test before it can ship. The pattern is brittle (it does not catch every case), but it catches the obvious ones, which is enough to keep new contributions honest.

## Pinned oracles

The arithmetic engine is tested against pinned oracles, four for the amortization engine and similar small batches for the other engines. Each oracle is hand-calculated against an independent authority, with the citation in a docstring comment so that a future me cannot quietly "correct" the oracle by re-running the engine against itself:

- **Wikipedia $200,000 @ 6.5% / 30yr → $1,264.14.** The Wikipedia article on the standard mortgage formula gives this monthly principal-and-interest figure in its worked example. It is reproducible by hand: `P × (r(1+r)^n) / ((1+r)^n − 1)` where `P = 200000`, `r = 0.065 / 12 = 0.005416...`, `n = 360`.
- **CFPB Loan Estimate $162,000 @ 3.875% / 30yr → $761.78.** The CFPB publishes a worked Loan Estimate example with this exact P&I as the "Projected Payments" first-period value. It is the canonical regulatory check.
- **Computed $400,000 @ 6.5% / 30yr → $2,528.27.** A round-number sanity check for the rate environment current at project start.
- **Computed $200,000 @ 7% / 15yr → $1,797.66.** A second sanity check at a different term and rate.

The test asserts exact Decimal equality, not approximate:

```python
assert schedule.payments[0].monthly_pi == Decimal("1264.14")
```

`assertAlmostEqual` and other tolerance-based comparators are banned for money. The reasoning is that if my answer is off by even one cent against a hand-calculated oracle, I want the test to fail loudly, so I can find the rounding bug before the next refactor entrenches it.

The four oracles appear in JSON fixtures under `tests/fixtures/amortize/` and are reused across the biweekly-true mode, the biweekly half-monthly mode, the one-shot extra-principal entry, the recurring extra-principal entry, the step-up extra entry, and the month-end edge case (`relativedelta` handling of January 31 to February 28). Every variant must reproduce the same P&I as the baseline oracle. When one diverges, the schedule has drifted; when all four agree, the engine is trustworthy.

## Newton-Raphson APR under Reg Z Appendix J

The most mathematically rigorous calculation in the project is the *estimated APR* solver, which lives in `lib/apr.py` and which is invoked by the `apr_reg_z.py` CLI. It is also the calculation I would least want a language model anywhere near.

APR under Regulation Z is defined by the unit-period equation in 12 CFR Part 1026 Appendix J. The equation is implicit: APR is the rate `i` such that the present value of all payments equals the amount financed, where "amount financed" is `loan.principal - finance_charges`. There is no closed-form solution. The implementation is Newton-Raphson, seeded from `numpy_financial.rate` and refined.

The Decimal arithmetic is unavoidable. The unit-period equation involves fractional exponents (`(1 + i)^(-t - f)` where `f` is the odd-first-period fraction), and Python's `Decimal.__pow__` requires integer exponents. The workaround in `_decimal_pow`:

```python
def _decimal_pow(base: Decimal, exponent: Decimal) -> Decimal:
    if base <= Decimal("0"):
        raise ValueError(f"_decimal_pow requires positive base; got {base}")
    with localcontext(MONEY_CONTEXT):
        return (base.ln() * exponent).exp()
```

The route through `Decimal.ln` and `Decimal.exp` is exact within the 28-digit precision of `MONEY_CONTEXT`, far more than the 5-decimal-place convergence tolerance the solver targets. The negative-base guard is locked because fractional exponents of negative bases are not defined in the reals.

The solver itself runs under three explicit constraints:

1. **Convergence tolerance `Decimal("0.00001")` plus a dual dollar-residual criterion.** The iteration stops when the change in `i` is less than `0.00001` *and* the residual of the unit-period equation is less than one dollar. The dual criterion catches the case where `i` is barely moving but the equation is still far from balanced (a sign of misseeding).
2. **A 50-iteration hard cap.** If the solver does not converge in 50 iterations, it raises `APRConvergenceError` *before* constructing the response. The 50-iteration limit is also enforced at the Pydantic boundary via `Field(ge=1, le=50)` on `APRResponse.iterations`, so a future bug that tries to emit a malformed response with `iterations > 50` would fail validation before the response leaves the model layer. Defense in depth.
3. **A literal-text invariant on the response summary.** `APRResponse.summary` must contain the literal substring `"estimated APR"`, enforced by a `@model_validator(mode="after")` on the Pydantic model. The validator also forbids any bare `APR` word outside the allowed phrases `"estimated APR"` and `"APR tolerance"`. The reason is regulatory: mortgage-ops is a personal-use tool, not a commercial creditor, so it does not make Reg Z APR disclosures. The literal-text guard pins that fact at the deepest possible boundary, so a future LLM-narrated summary cannot accidentally produce a sentence that reads like a regulated disclosure.

The cross-validation regime for the APR engine is twenty-plus capture fixtures from the CFPB's HMDA Platform (the canonical open-source APR reference, the same one the agency uses for its Home Mortgage Disclosure Act submission validation). Each fixture is a `(request, expected_apr)` pair captured from the HMDA tool. The engine must match each fixture exactly within the convergence tolerance.

The Reg Z Appendix J §(b)(5)(iii) odd-first-period fraction `f` depends on the day-count convention the creditor used. The three v1-supported conventions are documented in the engine, with their formulas:

```
30/360:        f = (days - 30) / 30                # FFIEC tool default; standard for closed-end mortgages
actual/365:    f = (days - 365/12) / (365/12)      # used by some adjustable-rate products
actual/actual: f = (days - actual_unit_days) / actual_unit_days  # treasuries; rare for mortgages
```

The helper `_compute_odd_first_period_fraction(origination, first_payment, day_count)` returns the fraction in `[-1, 1)` per §1026.17(c)(4). Short first periods (negative `f`) are mathematically valid per Reg Z and the engine accepts them; v1 cross-validates only long cases. `f >= 1` raises `ValueError` because the caller should insert an extra `t=1` advance instead.

If you have not stared at the unit-period equation before, none of the preceding paragraph reads as anything but jargon. That is the point. The entire mass of Reg Z Appendix J detail is mechanical and unforgiving, and the cost of getting it slightly wrong is a wrong number. There is no version of "let the model do the math" that survives the unit-period equation. The job belongs to deterministic Python.

## Rules-as-predicates

The regulatory layer is structured around a pattern I lifted from the CFPB's open-source HMDA Platform: one file per regulatory citation, each file exposing a single predicate (or a small family of related predicates), with the citation in the docstring and the threshold data in a sibling YAML.

Here is the top of `lib/rules/atr_qm.py`:

```python
"""ATR/QM General-QM + Safe-Harbor price-based test per 12 CFR §1026.43(e)(2).

Citation: 12 CFR §1026.43(e)(2) - General Qualified Mortgage Loan Definition,
as amended by the CFPB Dec 2020 final rule (mandatory compliance 2022-10-01),
which replaced the legacy 43% DTI cap with a price-based test on the spread
between APR and the Average Prime Offer Rate (APOR). Safe-Harbor variant
in §1026.43(b)(4) uses tighter spread thresholds.
Source URL: https://www.federalregister.gov/documents/2020/12/29/...
Effective: 2022-10-01
"""
```

The predicate `general_qm_passes(apr, apor, loan_amount, lien_position) -> bool` returns whether a hypothetical loan passes the General-QM price-based test. The threshold table (loan-amount tier × lien position → APR-APOR threshold in percentage points) is loaded from `data/reference/atr-qm-thresholds.yml`. The YAML is the single source of truth for the numbers; the Python is the single source of truth for the decision logic.

The pattern composes into a directory full of single-citation modules:

```
lib/rules/
  atr_qm.py            (12 CFR §1026.43(e)(2))
  conventional_pmi.py  (HUD/PMI dropoff rules)
  fannie_eligibility.py (Fannie Mae Selling Guide)
  fha_mip.py           (FHA Mortgage Insurance Premium tables)
  freddie_eligibility.py (Freddie Mac AUS)
  irs_pub936.py        (IRS Publication 936: mortgage interest deduction)
  loan_type.py         (conforming / FHA / VA / USDA / jumbo classification)
  reg_z.py             (Reg Z APR-tolerance check)
  usda.py              (USDA Rural Development income limits)
  va_funding_fee.py    (VA Funding Fee schedule)
  va_residual_income.py (VA underwriting residual-income table)
```

Each predicate has a 1:1 corresponding test file (`tests/test_rules/test_atr_qm.py`, etc.), and each test file has at least one fixture pinned to the regulatory source. The discipline is that when a regulation changes (CFPB updates the loan-amount tier thresholds in their annual index, or the FHA publishes a new MIP rate table, or the FHFA announces next year's conforming-loan limits), I edit the corresponding YAML and the matching test, never the Python predicate.

The Python predicate is the *behavior*, which is stable across years; the YAML is the *parameters*, which are not. Separating them turns the annual regulatory refresh into a YAML edit and a commit. No code change.

## Reference data as YAML

The YAML files in `data/reference/` are not casual. Each is required to declare two top-level fields:

```yaml
source: "https://www.fhfa.gov/news/news-release/fhfa-announces-conforming-loan-limit-values-for-2026"
effective: 2026-01-01
notes: |
  FHFA news release of 2025-12-04: "FHFA Announces Conforming Loan Limit Values
  for 2026." Effective for loans with pool issue dates on or after 2026-01-01.
  Baseline 1-unit = $832,750; ceiling 1-unit = $1,249,125 (= 150% x baseline).
limits:
  baseline:
    one_unit: "832750"
    ...
```

The loader (`lib/rules/_loader.py`) validates the file at import time. It refuses path-traversal payloads in the `name` argument (`name` must match `^[a-z0-9][a-z0-9-]*$`, so `"../../etc/passwd"` is rejected with a clear `ValueError`). It raises `MissingReferenceFieldError` if `source:` or `effective:` is absent. It emits a `StaleReferenceWarning` at module-load time when the `effective:` date is more than twelve months in the past.

The stale-warning is loud-by-default. It is not suppressed by library code, and tests assert it fires when the loader is given a deliberately-stale fixture:

```python
def test_loader_warns_when_effective_more_than_12_months_old(tmp_path: Path) -> None:
    with pytest.warns(StaleReferenceWarning, match="more than 12 months old"):
        load_reference("synthetic-stale-fixture")
```

The numeric scalars in the YAML are quoted strings (`"832750"`, not `832750`). PyYAML otherwise emits Python `float` for unquoted numerics, which would invite the `Decimal(float)` failure mode against rule 1 of money discipline. Quoting forces PyYAML to emit `str`, and the loader's consumers wrap in `Decimal(...)` at consumption time. The quoting is documented in the file headers because it is the kind of invisible rule that breaks the moment someone unfamiliar edits the file.

There is also a second tier of reference data, `data/known-loans.yml`, that catalogs my actual real-world loan facts (initial rate, term, origination date, PMI dropoff date, lender) so that comparative analyses ("would this offer be better than my current loan?") have a real baseline. That file is gitignored as a courtesy to my own privacy and is loaded through the same `_loader` machinery.

## The one place Sonnet IS allowed: extraction

The strict no-arithmetic rule has exactly one carve-out. The Phase 13 property pipeline lets Claude Sonnet read a Zillow listing's HTML and emit structured JSON.

The job is extraction. Zillow embeds a `<script id="__NEXT_DATA__">` tag holding the full property record as JSON inside the HTML response. In principle that JSON is parseable directly. In practice the schema drifts month to month (Zillow rotates field names, adds nested wrappers, occasionally returns A/B-tested variants), so a hand-written parser is unmaintainable. Sonnet, by contrast, can read the HTML and emit a clean record against a fixed schema regardless of which internal-name shift Zillow is doing this week.

The prompt is in `lib/property_extractor.py` and is short enough to quote in full:

```text
You are extracting structured property data from a Zillow listing's HTML.
The HTML contains a <script id="__NEXT_DATA__"> tag holding the full property
record as JSON. Find that JSON. Then output a SINGLE JSON object with exactly
these fields:

  zpid               (string, required)
  price              (string, required - Decimal-safe, e.g. "625000.00")
  zip                (string, required - 5 digits)
  property_type      (one of: "SFH", "condo", "townhouse", "multifamily-2-4")
  beds               (integer or null)
  baths              (string Decimal or null - e.g. "2.5")
  sqft               (integer or null)
  year_built         (integer or null)
  tax_annual         (string Decimal or null - annual)
  hoa_monthly        (string Decimal or null - null if no HOA)
  insurance_estimate_annual  (string Decimal or null)
  zestimate          (string Decimal or null)
  days_on_market     (integer or null)
  list_date          (string YYYY-MM-DD or null)

Rules:
  1. Output JSON ONLY. No prose, no fences, no preamble.
  2. Use null for fields you cannot extract. Null is better than wrong.
  3. Money/decimal fields are JSON STRINGS, never numbers (Pydantic strict
     rejects floats for Decimal).
  4. Do not infer or guess. If the page does not state it, the field is null.
  5. property_type maps: SingleFamily/Detached -> "SFH"; Condo -> "condo";
     Townhouse -> "townhouse"; Multifamily/Duplex/Triplex/Fourplex ->
     "multifamily-2-4". Anything else (Manufactured, Cooperative) -> null
     (gap-fill required).
```

Rule 3 is the load-bearing rule of the entire carve-out. Sonnet is allowed to handle money fields as long as it emits them as JSON strings rather than JSON numbers. The next stage of the pipeline is a Pydantic v2 model with `model_config = ConfigDict(strict=True)`. Strict mode rejects JSON floats for `Decimal` fields with a clean validation error. The moment Sonnet's output crosses the Pydantic boundary, control transfers to deterministic Decimal Python and the arithmetic-allergic part of the project takes over.

The carve-out is bounded in three additional ways:

1. **Block detection runs first.** `lib/property_block_detector.detect_block(html)` looks for captcha pages and rate-limit pages and returns a sentinel that short-circuits the Sonnet call. The detector exists because a single Sonnet extraction round-trip costs roughly sixteen cents at current Sonnet pricing, and there is no point paying that to read a captcha.
2. **The CLI orchestrator uses an always-exit-0 contract.** When extraction fails (Sonnet returns a malformed JSON, or Pydantic validation fails, or the listing is missing required fields), the orchestrator emits a `shape-2 awaiting_user_input` envelope and exits cleanly. The skill narrates the missing fields back to the user and asks them to fill in by hand. Nothing in the pipeline silently invents a number.
3. **The persistence layer is composite-keyed on `(zpid, household_hash)`.** Every persisted record carries a hash of the household profile so that re-imports under a different profile do not collide, and so that the test fixtures are reproducible without leaking the actual profile through commit history.

The Sonnet output never directly produces a dollar figure that exits the system. Sonnet produces *raw extractions*. The downstream pipeline (`lib.affordability`, `lib.rules.atr_qm`, `lib.amortize`, `lib.refinance`) takes those extractions and does the math. By the time a dollar figure leaves the system, it has traced through Pydantic boundary validation, Decimal arithmetic, and a regulatory predicate. Sonnet is in the loop for exactly the part of the job (parsing semi-structured text into a strict schema) that language models are demonstrably good at.

## A worked example: what a single question looks like end to end

To make the contract concrete, here is what happens when I ask the skill *"if I bought at 625,000 with 20% down at 6.625% on a 30-year fixed, what is my payment and what does the schedule look like?"*

The skill recognizes the pattern as the `amortize` mode (single loan, payment question, "schedule"). It collects the four inputs it needs:

- `principal = 625000 * 0.80 = 500000.00` (the LTV implies an 80% loan; the skill applies the multiplication symbolically, since this is a pre-engine parameter setup, not a dollar figure entering a response)
- `annual_rate = 0.066250`
- `term_months = 360`
- `frequency = "monthly"`

It writes the JSON to a tempfile:

```json
{
  "loan": {
    "principal": "500000.00",
    "annual_rate": "0.066250",
    "term_months": 360,
    "origination_date": "2026-05-17",
    "loan_type": "fixed"
  },
  "frequency": "monthly"
}
```

Note the strings around `"500000.00"` and `"0.066250"`. These are intentional; the Pydantic v2 strict-mode validator at the boundary rejects JSON floats for `Decimal` fields with a six-key envelope on stderr. If the skill emitted unquoted numerics it would never reach the engine.

It invokes the script:

```bash
python ${CLAUDE_SKILL_DIR}/scripts/amortize.py --input /tmp/mortgage-ops-input-7c4f.json
```

The script lazy-imports `numpy_financial`, the Pydantic models, and the engine; argparse handles `--help` before any of those imports run, so `--help` returns under 100ms even though the full engine takes longer. The full call on a 360-month schedule returns in under 50ms.

The engine wraps `npf.pmt`, `npf.ipmt`, and `npf.ppmt` per period, quantizes each line to cents with `quantize_cents`, applies any extra-principal entries against the period balance, and reconciles the cents-drift in the final period so that `payments[-1].balance == Decimal("0.00")` exactly and `sum(principal + extra_principal) == original_principal` exactly. Both invariants are asserted by `assert_schedule_invariants` in the test suite and would fail loudly if the engine ever drifted.

The script writes a response to stdout:

```json
{
  "monthly_pi": "3200.99",
  "total_interest": "652356.40",
  "total_paid": "1152356.40",
  "payments": [
    {"period": 1, "payment": "3200.99", "principal": "440.95",
     "interest": "2760.04", "balance": "499559.05",
     "cumulative_interest": "2760.04"},
    ...
    {"period": 360, "payment": "3200.99", "principal": "3183.32",
     "interest": "17.67", "balance": "0.00",
     "cumulative_interest": "652356.40"}
  ]
}
```

Every dollar field is a JSON string. Every dollar field traces to a `Decimal` quantized once at end-of-period with `ROUND_HALF_UP`. The total-interest figure traces to `payments[-1].cumulative_interest` (the `D-15` locked decision); the two are equal by validator-enforced invariant, so a future bug that lets them diverge fails the model layer before it reaches the response.

The skill reads the JSON, parses it into a narration, and answers:

> On a 500,000 loan at 6.625 percent over 30 years, your monthly principal and interest is 3,200.99. Over the full term you pay 652,356.40 in interest, for a total of 1,152,356.40. The first month is mostly interest (2,760.04 of the 3,200.99 payment); by the 360th month, almost all of it (3,183.32) goes to principal. Want me to show you the schedule, run the same numbers with biweekly payments, or compare against a 15-year term?

Every number in that sentence came from the stdout JSON. The skill did not compute any of them. If you ask the skill to repeat the same question with a different rate, it writes a new tempfile and invokes the script again. The cost of an extra invocation is a few hundred milliseconds; the cost of letting the model improvise was paid once, in the design of the contract, and is now zero.

## The other engines: refi NPV, stress sweeps, points breakeven

The amortization engine is the simplest. The other six engines each have their own discipline and their own subagent in the Claude Code subagent layer.

**Refi NPV (`scripts/refi_npv.py` + `refi-npv-agent` on Sonnet).** Given the current loan and 2-5 competing refinance offers (rate, term, points, lender fees, escrow handling, expected hold period), the engine computes the NPV of each offer's cash flows from the borrower's perspective and ranks them. The math is `pyxirr.xnpv` over the dated cash-flow stream of each offer minus the dated cash-flow stream of the current loan, both terminated at the borrower's expected hold horizon (default sixty months, configurable). `pyxirr` is a Rust + PyO3 implementation that handles batch scenarios faster than `numpy_financial.xnpv`, which matters when the stress engine runs thousands of NPV evaluations in a parameter sweep. The ranked output is a markdown table the user can read at a glance; the underlying Decimal arithmetic is exact.

**Stress test (`scripts/stress_test.py` + `stress-test-agent` on Haiku).** Given a base scenario and a parameter grid (rate paths × loan amounts × points × hold horizons), the engine runs the cartesian product and emits a summary capped at one thousand tokens. The Haiku subagent exists because stress sweeps can produce >5 scenarios per request and the outer skill's context budget should not blow up on grid output. The summary is the median plus the percentile bands plus the worst case; the full grid is persisted to DuckDB for later inspection.

**Points breakeven (`lib/points.py`).** Given a loan with a points-buydown option (typically 0.25% rate reduction per 1 point, but configurable per lender), the engine computes the breakeven month, which is the month at which the cumulative interest savings from the lower rate equals the upfront points cost. The breakeven is reported alongside the user's expected hold horizon, so the recommendation is contextual: if breakeven is at month 47 and you plan to hold for 36 months, points are a loss; if breakeven is at month 47 and you plan to hold for 120 months, points are a win.

**Affordability (`lib/affordability.py`).** Given household income, monthly debts, downpayment, target rate and term, and a desired front/back DTI ceiling, the engine computes the maximum loan amount (and therefore maximum home price) that fits. The same engine, run in reverse, validates a target home price against the household's DTI capacity. The DTI definitions are tied to ATR/QM (12 CFR §1026.43) by reference; the configurable PMI dropoff at 78% LTV is tied to HUD Mortgagee Letter rules by reference.

**ARM simulation (`lib/arm.py`).** Given a starting rate, an index (typically SOFR), a margin, periodic and lifetime rate caps, and a rate path (deterministic or stochastic), the engine simulates the ARM's payment trajectory across resets. The locked decisions around floor-rate behavior, look-back periods, and biweekly mode interactions live in the docstring; each is pinned to a fixture.

**Estimated APR (`lib/apr.py`).** Already covered. The Newton-Raphson under Reg Z Appendix J is the same shape as the other engines: deterministic Python, Decimal everywhere, Pydantic boundary, tests pinned to oracles (twenty-plus HMDA Platform fixtures in this case).

Six engines, one discipline. Each engine wraps the part of `numpy_financial` (or `pyxirr` for batched XIRR/XNPV) that handles the underlying numerical kernel. None of them reimplements PMT/IPMT/PPMT/NPV/IRR; the `numpy_financial` library has been around long enough that its edge cases (issues #130 and #131 in particular) are documented, and reimplementing would inherit a different set of edge cases that are not. The wrap-do-not-reimplement rule is itself a discipline; the `CLAUDE.md` explicitly forbids the alternatives (`mortgage` PyPI, `mortgage` jbmohler, `amortization` PyPI, all of which are abandoned, float-based, or unlicensed) and pins the choice to `numpy_financial` because it is the maintained Excel-equivalent.

The skill routes to the right engine, the engine computes, the skill narrates. Eight modes, one contract.

## The smaller disciplines that hold the line

Several smaller rules exist to keep the contract from leaking:

- **`mypy --strict` everywhere.** Every public function is annotated. Decimals, dates, and `Literal` types catch the cases where a float would otherwise slip in.
- **`ruff` lints on top of mypy.** Several custom-disabled rules (`UP033` for `lru_cache(maxsize=None)`, for example) are inline-justified with a comment pointing at the phase plan that locked them.
- **A test that blocks system writes to user-config paths.** `tests/test_block_user_layer.py` greps the `lib/` and `scripts/` source for writes to `config/household.yml`, `config/profile.yml`, and `modes/_profile.md`, and fails the build if it finds any. The reasoning: user-supplied configuration is read-only from the system side, by contract, so that a user's manually-tuned `household.yml` can never be silently overwritten by a future system bug. The user layer is the user's; the system layer is mine.
- **A subagent layer for context isolation.** Three Claude Code subagents (`amortization-agent` on Haiku, `refi-npv-agent` on Sonnet, `stress-test-agent` on Haiku) handle calc-heavy operations in isolated contexts. The subagents themselves obey the shell-out-to-Python rule; their value is bounding the context that the calc-heavy operation consumes from the outer skill's token budget.
- **Live rates via FRED with a seven-day cache.** Current 30-year and 15-year fixed rates come from FRED's `MORTGAGE30US` and `MORTGAGE15US` series via `scripts/fred_cli.py`, cached in `data/cache/fred_*.json` for seven days. The cache is the answer to "what is the current rate?"; the skill reads the file before invoking the engine. FRED is the canonical mirror of Freddie Mac's PMMS, so the source URL traces back to a federal statistical release.

Each discipline is a small thing. They compose into a project where the model is not making numerical decisions, the parameters are auditable, the regulatory citations are visible, the rounding is correct, and a future me can extend the system without breaking the chain of custody from a dollar figure back to a tested function back to a citation back to a federal register URL with an effective date.

## What this rules out

The contract rules out a fairly specific set of behaviors that other AI-assisted tools embrace:

- **Chatty estimation.** "The payment is approximately X" sentences are forbidden in skill responses. The skill is not allowed to ballpark.
- **Tool-emitted convenience math.** A model writing `Decimal("400000") * Decimal("0.005416")` in its response is computing a number inline, even though it is using Decimal. The rule forbids it.
- **Reverse-engineered formulas.** A model that "knows" the standard mortgage formula and types it into its response is owning the number. The rule forbids it. The model is allowed to invoke `scripts/amortize.py` and narrate the result; it is not allowed to derive the result on its own.
- **Multi-step reasoning that touches numbers.** "If your monthly is $2,500 then your annual is $30,000" is a multi-step calculation. The rule forbids it; the model is supposed to invoke the affordability engine, which produces both numbers as part of one calculation.

The cost of these rules is real. The skill is occasionally slower than it would be if it improvised math, and occasionally more verbose because it has to set up a JSON input rather than just answer. The benefit is that every number it ever produces is reproducible, citable, and audit-traceable. For a tool whose users (me, my household) are making a six-figure decision, that tradeoff is correct.

## Coda

The discipline reads better the longer it is enforced. The first month I worked on mortgage-ops, I was constantly tempted to let the skill answer simple questions inline. Two-hundred-thousand at six-point-five over thirty years, what is the payment, just tell me. The temptation faded as the engine got faster and the input JSON got more ergonomic. By the time the Phase 13 property pipeline shipped, the question "what is the payment" was a five-second exchange (the skill collected the inputs, invoked `scripts/amortize.py`, and narrated the result) and the temptation was gone entirely.

The contract is now a habit. The skill routes; Python computes; the tests pin the answers against hand-calculated oracles; the rules predicate against single regulatory citations; the YAML carries the parameters; the loader warns when the parameters go stale; the language model never owns a number it did not get from a script.

That is the whole architecture. It is not the only way to build a financial tool, but it is the only way I know to build one whose output I would stake a house-buying decision on.

The rule, in the SKILL's own voice, one more time:

> **This rule has zero exceptions.**
>
> ALWAYS shell out to scripts/ for math; NEVER compute numbers inline.

The *Number* is not the model's to own. It belongs to the engine, the oracle, the citation, the YAML, and the federal register URL with the effective date. Everything else is narration.
