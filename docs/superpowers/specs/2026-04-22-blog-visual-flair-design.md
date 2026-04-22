# Blog Visual Flair — Featured Article Super-Tiles

**Date:** 2026-04-22
**Project:** `my_site/v2` (React + Vite portfolio, cyberpunk theme, hand-rolled motion)
**Status:** Design approved, pending implementation plan

## Goal

Give three hand-picked blog posts genuinely eye-grabbing, per-post custom flair on the Writing-section grid cards — without touching the blog modal's interior. "Shock and awe" is the explicit intent: each featured card should visually dominate its slice of the grid and hint at the post's subject matter through motion and iconography rather than generic "highlighted" chrome.

## Scope — what's in, what's out

**In:**
- Three new bespoke React card components, one per featured post, replacing `ArticleCard` only for those slugs.
- A small `FEATURED` slug-to-component map in `Sections.jsx`.
- CSS change to `styles.css` letting featured cards span a 2-column × 2-row footprint in the Writing grid (with mobile fallback).
- A shared `usePrefersReducedMotion()` hook for accessibility.
- Keyboard activation (`role="button"`, `tabIndex`, Enter-key) added to all article cards including the base `ArticleCard` — closing a pre-existing accessibility gap since we're in the neighborhood.

**Out (explicit):**
- No changes to `BlogModal` or any modal-interior behavior.
- No frontmatter changes to `.md` files, no changes to `v2/src/lib/blog.js`.
- No image assets — every card's flair is SVG + CSS in-code, consistent with the existing hero/serpentine/hero-card work.
- No refactor of `Sections.jsx` for size (it is already ~530 lines; that cleanup is a separate change).

## Featured posts — first pass

| Slug | Title (short) | Theme |
|---|---|---|
| `Building-an-Autonomous-Research-Loop` | Research Loop | The Iteration Engine |
| `At-Home-Media` | Home Media Server | Home Theater HUD |
| `208-Survived-Opinionated-Obsidian-Wiki` | Opinionated Wiki (latest) | Knowledge Graph |

The three are manually placed near the top of the `ARTICLES` array so the super-tiles land in the first visible rows rather than scattered down-page.

## Treatments — per-card specification

### 1. Research Loop — "The Iteration Engine"

- **Background:** a slow-rotating SVG loop path (closed, self-returning) with a traveling dot. Every ~3 seconds the dot halts at a labelled node; nodes read in sequence `read → weakest-link → propose → refute → verify`.
- **Ambient element:** a mono iteration counter that increments `01 → 02 → 03 → …`, then resets at some cap (e.g., 09 → 01) so it feels alive without running up forever.
- **Hover:** loop speeds up ~3×, a red diagonal pulse sweeps the tile (devil's advocate), a mana-green `replication ✓` flash resolves it, counter briefly accelerates.
- **Corner badge:** `28 MIN · DEEP READ` in `var(--mono)`.
- **Color:** violet primary (site default); red/green only on hover beats.
- **Still-visible baseline:** title, cats, date, `Read ›` affordance remain legible throughout.

### 2. At-Home Media — "Home Theater HUD"

- **Background:** faint CRT scanlines + subtle RGB chromatic aberration on title text; aberration settles on hover.
- **Foreground HUD:** a `NOW PLAYING` marquee (text scrolls slowly), a pulsing progress bar, a row of chips — `4K · HDR · DOLBY · USENET`. Small remote-control icon set in the corner.
- **Hover:** marquee freezes, a cinema-gold `PLAY ►` icon grows and centers, scanlines intensify for one beat, title fades to accent color.
- **Corner badge:** `HOME THEATER · S01E11` in `var(--mono)`.
- **Color:** amber override. Card sets `--accent: oklch(0.75 0.14 70)` locally (matching the existing `html[data-accent="amber"]` scheme) so the gold cinema feel reads within the dark theme without breaking site palette.

### 3. Obsidian Wiki (latest) — "Knowledge Graph"

- **Background:** a small force-directed graph (8-12 nodes, light edges). Edges stochastically brighten; nodes drift gently.
- **Ambient element:** a large `208` counter that ticks from `0` to `208` on scroll-into-view (IntersectionObserver) and holds.
- **Subtitle:** `ARTICLES SURVIVED · FIVE TYPES · ONE STOP HOOK`.
- **Hover:** graph reorganizes — nodes animate to a new force-directed configuration, edges brighten, counter re-animates from 0 to 208.
- **Corner badge:** `LATEST · APR 2026` in `var(--mono)`.
- **Color:** violet (on-brand; this is the newest post, not a thematic detour).

## Architecture

### File layout

```
v2/src/components/
├── featured/
│   ├── ResearchLoopCard.jsx
│   ├── AtHomeMediaCard.jsx
│   ├── ObsidianWikiCard.jsx
│   ├── featured.css             # shared tile framing, reduced-motion rules, keyboard focus ring
│   └── usePrefersReducedMotion.js  # small hook, ~10 lines
└── Sections.jsx                  # FEATURED map + grid render swap (minimal change)
```

### Component contract

All three featured components accept the same props as `ArticleCard`:

```js
function FeaturedCard({ a, onOpen }) { ... }
```

Where `a` is an entry from the `ARTICLES` array (`{ slug, cats, title, date, read }`) and `onOpen` is `setOpenSlug`. This keeps them as drop-in swaps — the grid render becomes:

```js
const FEATURED = {
  'Building-an-Autonomous-Research-Loop':   ResearchLoopCard,
  'At-Home-Media':                          AtHomeMediaCard,
  '208-Survived-Opinionated-Obsidian-Wiki': ObsidianWikiCard,
};

// inside the .writing-grid render:
{ARTICLES.map(a => {
  const Card = FEATURED[a.slug] || ArticleCard;
  return <Card key={a.slug} a={a} onOpen={setOpenSlug} />;
})}
```

Each featured card applies a `.featured` class on its outer element so the grid sizing CSS can pick it up.

### Grid sizing

A single CSS addition to `styles.css`:

```css
@media (min-width: 900px) {
  .writing-grid .featured {
    grid-column: span 2;
    grid-row: span 2;
  }
}
/* below 900px: featured cards stay single-column but get extra height for content */
@media (max-width: 899px) {
  .writing-grid .featured { min-height: 320px; }
}
```

The 900px threshold sits above the existing 780px nav-collapse breakpoint, ensuring regular cards still have room to breathe in the rows next to a super-tile. Below 900px the super-tile reverts to a single-column tall card — still visually distinct via its bespoke animation, but no grid disruption.

The existing `writing-grid` declaration (`grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`) accommodates variable-span children without changes.

### Motion & accessibility

- Every animation is gated by `usePrefersReducedMotion()`. When `true`:
  - Counters land at their final value immediately.
  - Loops, marquees, and graph force-simulations pause at initial state.
  - **Hover intensification is preserved** — it is the user's cue that the card is interactive; motion is decoration.
- Each card (including the base `ArticleCard`, opportunistically) gets:
  - `role="button"`
  - `tabIndex={0}`
  - `onKeyDown` handler that opens the article on `Enter` or `Space`.
  - Visible `:focus-visible` outline using `var(--accent)`.

### Card inner composition

Each featured card must remain functionally a blog-post card. Inside the flair, the following must be legible:

- Cats (category labels), title, date, read-time.
- A "Read ›" affordance (can be styled per-theme — e.g., "Play ►" for Home Theater, "Traverse ›" for Knowledge Graph — but behaviorally identical).
- Clicking anywhere on the card opens the modal.

## Performance notes

- All animations use CSS keyframes or `requestAnimationFrame` where per-frame JS is unavoidable (force-directed graph). No external animation libraries.
- Animations pause when the card is not in the viewport (IntersectionObserver) to avoid idle CPU.
- Total new JS expected: roughly 500-700 lines across three components + a small ~10-line `usePrefersReducedMotion` hook; roughly 80 lines of new CSS. No new dependencies.

## Testing

- **Dev-server visual check:** `npm run dev`, scroll to the Writing section, confirm the three super-tiles appear at the top, regular cards flow around them, hover states fire.
- **Reduced-motion:** toggle OS-level preference (or emulate in DevTools), confirm animations hold at rest and hover still works.
- **Keyboard:** `Tab` through the Writing grid, `Enter` on a featured card opens the modal.
- **Responsive:** resize browser through the 820px breakpoint, confirm the super-tile drops to single column without overflow.
- **Build:** `npm run build` must succeed.

No unit tests are proposed — these are visual components with no testable data transformation; the existing codebase has no component test infrastructure and this change doesn't justify adding one.

## Risks & unknowns

- **Force-directed graph in ObsidianWikiCard** is the most complex animation; a naive verlet implementation at 10-12 nodes is cheap, but tuning aesthetics may take more iteration than the other two cards.
- **RGB chromatic aberration** on AtHomeMediaCard could clash with the cyberpunk palette at the wrong intensity. If it muddies the title, back it off to zero by default and only apply on hover.
- **Grid reflow** when the three featured cards live among 38 regulars: verify that at the 820px breakpoint the 2×2 span doesn't leave odd empty cells below. If it does, adjust the placement of the featured slugs in `ARTICLES`.

## Out of scope — future considerations (not this change)

- Adding a 4th+ featured post (pattern supports it — add component + one line to `FEATURED`).
- Modal-interior flair (per-post themed modal headers) — we declined this option earlier; could revisit.
- Promoting featured-post flair metadata to frontmatter (only worth it if the list grows past ~6-8).
- Generalizing the three motion patterns into a reusable `FeaturedCardShell` — premature at N=3; reconsider at N=5+.
