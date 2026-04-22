# Blog Visual Flair — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give three hand-picked blog posts bespoke per-post animated super-tile treatments on the Writing-section grid, each visually dominant and thematically tied to the post's subject matter.

**Architecture:** A small slug-to-component `FEATURED` map in `Sections.jsx` swaps `ArticleCard` for a custom tile on three specific slugs. Each featured tile is its own React component under `v2/src/components/featured/`, sharing only a CSS framing file and a `usePrefersReducedMotion` hook. Featured tiles span a 2-column × 2-row footprint via a single `.featured` CSS class on the tile root. No changes to the blog modal, the markdown loader, or any `.md` frontmatter.

**Tech Stack:** React 19, Vite, plain CSS, SVG + `requestAnimationFrame` for animation. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-22-blog-visual-flair-design.md` (commit `3923dfa`).

**Plan deviation from spec:** Grid breakpoint for the super-tile span uses the existing 780px site breakpoint rather than the spec's 900px — the existing writing-grid already collapses to single-column at 780px, so using the same threshold keeps CSS consistent. Above 780px a `span 2 / span 2` tile works naturally against both the 2-column and 3-column states.

---

## Files to create or modify

**Create:**
- `v2/src/components/featured/usePrefersReducedMotion.js` — ~10-line hook, sole purpose is returning the reduced-motion preference as a boolean React state.
- `v2/src/components/featured/ResearchLoopCard.jsx` — the "Iteration Engine" tile.
- `v2/src/components/featured/AtHomeMediaCard.jsx` — the "Home Theater HUD" tile.
- `v2/src/components/featured/ObsidianWikiCard.jsx` — the "Knowledge Graph" tile.
- `v2/src/components/featured/featured.css` — shared tile framing (border, overflow, focus ring), reduced-motion rules, keyframes used across tiles.

**Modify:**
- `v2/src/components/Sections.jsx` — add `FEATURED` map + swap logic in Writing grid render (line ~441); reorder `ARTICLES` to move `At-Home-Media` to position 2; add keyboard props to base `ArticleCard`.
- `v2/src/styles.css` — append `.writing-grid .featured` span rule + mobile fallback near the existing `.writing-grid` block (line 344-346); add `:focus-visible` outline rule for articles.

---

## Task 1: Scaffold hook, shared CSS, grid span rule, and placeholder featured components

This task stands up the plumbing with placeholder components that match `ArticleCard` exactly — no flair yet. At the end of this task, the three featured slugs already render as 2×2 super-tiles containing the same content as a regular article card. This proves the wiring works before we invest in animation work.

**Files:**
- Create: `v2/src/components/featured/usePrefersReducedMotion.js`
- Create: `v2/src/components/featured/featured.css`
- Create: `v2/src/components/featured/ResearchLoopCard.jsx`
- Create: `v2/src/components/featured/AtHomeMediaCard.jsx`
- Create: `v2/src/components/featured/ObsidianWikiCard.jsx`
- Modify: `v2/src/components/Sections.jsx` (imports, `FEATURED` map, ARTICLES reorder, grid render)
- Modify: `v2/src/styles.css` (grid span rule, focus ring)

---

- [ ] **Step 1.1: Create the `featured/` directory**

Run from the repo root:
```bash
mkdir -p v2/src/components/featured
```

---

- [ ] **Step 1.2: Write `usePrefersReducedMotion.js`**

Create file `v2/src/components/featured/usePrefersReducedMotion.js` with this exact content:

```js
import { useEffect, useState } from 'react';

export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
```

---

- [ ] **Step 1.3: Write `featured.css`**

Create file `v2/src/components/featured/featured.css` with this exact content:

```css
/* Shared framing for featured super-tiles.
   Per-post flair lives in the component files themselves. */

.featured-tile {
  background: var(--bg);
  padding: 28px 30px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  color: inherit;
  transition: background 0.25s;
}

.featured-tile:hover {
  background: var(--bg-elev);
}

.featured-tile .cats {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  position: relative;
  z-index: 2;
}

.featured-tile h4 {
  font-family: var(--serif);
  font-size: clamp(20px, 2.2vw, 26px);
  line-height: 1.2;
  letter-spacing: -0.01em;
  margin: 0;
  font-weight: 400;
  position: relative;
  transition: color 0.2s;
  z-index: 2;
}

.featured-tile:hover h4 {
  color: var(--accent);
}

.featured-tile .meta {
  display: flex;
  gap: 14px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-mute);
  margin-top: auto;
  padding-top: 14px;
  position: relative;
  z-index: 2;
}

.featured-tile .flair-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.featured-tile .badge {
  position: absolute;
  top: 14px;
  right: 16px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--ink-mute);
  text-transform: uppercase;
  z-index: 3;
  padding: 4px 8px;
  border: 1px solid var(--line-bright);
  background: color-mix(in oklab, var(--bg) 70%, transparent);
}

/* Focus ring for keyboard users, applied uniformly to all article-type cards */
.article:focus-visible,
.featured-tile:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .featured-tile *,
  .featured-tile ::before,
  .featured-tile ::after {
    animation-duration: 0.001s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.15s !important;
  }
}
```

---

- [ ] **Step 1.4: Write placeholder `ResearchLoopCard.jsx`**

Create file `v2/src/components/featured/ResearchLoopCard.jsx` with this exact content. This is a placeholder that mirrors `ArticleCard`; animation is added in Task 3.

```jsx
import './featured.css';

export default function ResearchLoopCard({ a, onOpen }) {
  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };
  return (
    <article
      className="featured-tile featured research-loop-card"
      onClick={open}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
    >
      <div className="badge">{a.read?.toUpperCase()} · DEEP READ</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
```

---

- [ ] **Step 1.5: Write placeholder `AtHomeMediaCard.jsx`**

Create file `v2/src/components/featured/AtHomeMediaCard.jsx` with this exact content:

```jsx
import './featured.css';

export default function AtHomeMediaCard({ a, onOpen }) {
  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };
  return (
    <article
      className="featured-tile featured at-home-media-card"
      onClick={open}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
    >
      <div className="badge">HOME THEATER · S01E11</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
```

---

- [ ] **Step 1.6: Write placeholder `ObsidianWikiCard.jsx`**

Create file `v2/src/components/featured/ObsidianWikiCard.jsx` with this exact content:

```jsx
import './featured.css';

export default function ObsidianWikiCard({ a, onOpen }) {
  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };
  return (
    <article
      className="featured-tile featured obsidian-wiki-card"
      onClick={open}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
    >
      <div className="badge">LATEST · APR 2026</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
```

---

- [ ] **Step 1.7: Append grid span rule to `styles.css`**

Open `v2/src/styles.css`. Find the existing writing-grid block (currently lines 344-346):

```css
.writing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
@media (max-width: 1040px) { .writing-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 780px) { .writing-grid { grid-template-columns: 1fr; } }
```

You will edit the first of those three lines to add one property (`grid-auto-flow: dense`) — this prevents empty grid cells around the super-tiles. Change:

```css
.writing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
```

to:

```css
.writing-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-flow: dense; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; }
```

The two `@media` lines after it stay untouched.

Immediately after that third `@media` line, insert these new rules:

```css
.writing-grid .featured { grid-column: span 2; grid-row: span 2; }
@media (max-width: 780px) { .writing-grid .featured { grid-column: 1; grid-row: auto; min-height: 320px; } }
```

Note: `grid-auto-flow: dense` may cause the visible order of cards to deviate slightly from the `ARTICLES` array order when span-2 tiles create gaps the grid then backfills with smaller items. This is intentional; the alternative is visible empty cells. The three featured cards are placed near the top of `ARTICLES` so they still land in the first visible rows.

---

- [ ] **Step 1.8: Wire the `FEATURED` map into `Sections.jsx`**

Open `v2/src/components/Sections.jsx`. Three edits are needed.

**Edit A — add the three imports near the top.** Just after the existing `import { getPost } from '../lib/blog.js';` line (line 4), add:

```jsx
import ResearchLoopCard from './featured/ResearchLoopCard.jsx';
import AtHomeMediaCard from './featured/AtHomeMediaCard.jsx';
import ObsidianWikiCard from './featured/ObsidianWikiCard.jsx';
```

**Edit B — reorder `ARTICLES` to place `At-Home-Media` near the top.** In the `ARTICLES` array (starts at line ~335), find this line:

```js
  { slug: 'At-Home-Media', cats: 'Plex · Usenet', title: 'At Home Media Server', date: 'Sep 2025', read: '14 min' },
```

Cut that line and paste it so it sits immediately after the existing line for slug `Adding-a-Brain-to-a-Fork-career-ops-card-ops` (the second entry in the array). The first three entries of `ARTICLES` must end up in this order:
1. `208-Survived-Opinionated-Obsidian-Wiki`
2. `Adding-a-Brain-to-a-Fork-career-ops-card-ops`
3. `At-Home-Media`   ← moved up
4. `Four-Terminals-Four-Sounds-session-sounds`
5. `Building-an-Autonomous-Research-Loop`

Leave every other entry in the array exactly where it is.

**Edit C — add the `FEATURED` map and swap the grid render.** In the `Writing` component (starts at line ~425), find this block:

```jsx
        <div className="writing-grid reveal" data-delay="2">
          {ARTICLES.map(a => <ArticleCard key={a.slug} a={a} onOpen={setOpenSlug} />)}
        </div>
```

Replace it with:

```jsx
        <div className="writing-grid reveal" data-delay="2">
          {ARTICLES.map(a => {
            const Card = FEATURED[a.slug] || ArticleCard;
            return <Card key={a.slug} a={a} onOpen={setOpenSlug} />;
          })}
        </div>
```

Then, immediately **before** the `export function Writing() {` line, insert the `FEATURED` constant:

```jsx
const FEATURED = {
  'Building-an-Autonomous-Research-Loop':   ResearchLoopCard,
  'At-Home-Media':                          AtHomeMediaCard,
  '208-Survived-Opinionated-Obsidian-Wiki': ObsidianWikiCard,
};
```

---

- [ ] **Step 1.9: Run the dev server and verify baseline wiring**

Run from the repo root:
```bash
cd v2 && npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Scroll to the Writing section (`#writing`).

Expected:
- Three tiles visibly larger than the others — occupying a 2×2 footprint on wide viewports — at the top of the Writing grid, in this visible order: Obsidian wiki, then (somewhere in the top rows) Home Media Server, then Building-an-Autonomous-Research-Loop.
- Each super-tile shows a small mono badge in the top-right (`14 MIN · DEEP READ` / `HOME THEATER · S01E11` / `LATEST · APR 2026`).
- Clicking any of the three super-tiles opens the existing blog modal with the correct article.
- Regular cards around them render normally.
- Browser console: no errors.

If badges display wrong read-time values or any super-tile doesn't open the modal, stop and debug before continuing.

---

- [ ] **Step 1.10: Run the production build**

Run from the repo root:
```bash
cd v2 && npm run build
```

Expected: build completes without errors. Any `vite build` warning about chunk size is pre-existing and unrelated.

---

- [ ] **Step 1.11: Commit**

Run from the repo root:
```bash
git add v2/src/components/featured v2/src/components/Sections.jsx v2/src/styles.css
git commit -m "$(cat <<'EOF'
feat(writing): scaffold featured super-tile system (placeholders)

Three hand-picked blog posts (research loop, at-home media,
obsidian wiki) now render as 2x2 super-tiles via a slug-to-component
map in Sections.jsx. Placeholder components match ArticleCard's
layout; flair lands in follow-up commits.

Also moves At-Home-Media higher in the ARTICLES array so the three
super-tiles cluster near the top of the grid.
EOF
)"
```

---

## Task 2: Keyboard activation on the base `ArticleCard`

The featured cards already handle Enter/Space in their placeholder scaffolds. The existing `ArticleCard` (base) does not — currently only responds to mouse clicks. Closing that gap now so the whole grid behaves consistently.

**Files:**
- Modify: `v2/src/components/Sections.jsx` — `ArticleCard` component (line ~403-423)

---

- [ ] **Step 2.1: Update `ArticleCard` to be keyboard-activatable**

Open `v2/src/components/Sections.jsx`. Find the current `ArticleCard` function (around line 403):

```jsx
function ArticleCard({ a, onOpen }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  return (
    <article className="article" ref={ref} onMouseMove={onMove} onClick={() => onOpen(a.slug)}>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
```

Replace with:

```jsx
function ArticleCard({ a, onOpen }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(a.slug); }
  };
  return (
    <article
      className="article"
      ref={ref}
      onMouseMove={onMove}
      onClick={() => onOpen(a.slug)}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
    >
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
```

The focus-ring CSS already shipped in `featured.css` covers `.article:focus-visible`.

---

- [ ] **Step 2.2: Verify keyboard navigation in the dev server**

With `npm run dev` running, load the page. Tab repeatedly until focus lands on a Writing-section card (you may need to click once in the page, then Tab).

Expected:
- A violet outline appears around the focused card.
- Pressing `Enter` opens the blog modal for that article.
- Pressing `Space` on a focused card also opens the modal (and does not scroll the page).
- Pressing `Escape` inside the modal closes it (pre-existing behavior).

---

- [ ] **Step 2.3: Commit**

```bash
git add v2/src/components/Sections.jsx
git commit -m "feat(writing): keyboard activation on article cards"
```

---

## Task 3: Build the Research Loop "Iteration Engine" flair

Replace the placeholder with the full treatment: an SVG loop path, traveling dot, step-labelled nodes, iteration counter, and the hover-triggered devil's-advocate / replication beat.

**Files:**
- Modify: `v2/src/components/featured/ResearchLoopCard.jsx` (full rewrite)

---

- [ ] **Step 3.1: Write the full `ResearchLoopCard` component**

Open `v2/src/components/featured/ResearchLoopCard.jsx` and replace the entire file contents with:

```jsx
import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

const NODES = [
  { label: 'read',          angle:   0 },
  { label: 'weakest-link',  angle:  72 },
  { label: 'propose',       angle: 144 },
  { label: 'refute',        angle: 216 },
  { label: 'verify',        angle: 288 },
];

const RADIUS = 70;
const CX = 100;
const CY = 100;

function polar(angleDeg) {
  const r = (angleDeg - 90) * Math.PI / 180;
  return { x: CX + RADIUS * Math.cos(r), y: CY + RADIUS * Math.sin(r) };
}

export default function ResearchLoopCard({ a, onOpen }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [iter, setIter] = useState(1);
  const [activeNode, setActiveNode] = useState(0);
  const tickRef = useRef(null);

  useEffect(() => {
    if (reduced) return;
    const interval = hover ? 900 : 2800;
    tickRef.current = setInterval(() => {
      setActiveNode((n) => {
        const next = (n + 1) % NODES.length;
        if (next === 0) setIter((i) => (i >= 9 ? 1 : i + 1));
        return next;
      });
    }, interval);
    return () => clearInterval(tickRef.current);
  }, [hover, reduced]);

  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  const dot = polar(NODES[activeNode].angle);
  const pathD = `M ${polar(0).x} ${polar(0).y} ` +
    NODES.slice(1).map(n => {
      const p = polar(n.angle); return `L ${p.x} ${p.y}`;
    }).join(' ') + ' Z';

  return (
    <article
      className={`featured-tile featured research-loop-card${hover ? ' is-hover' : ''}`}
      onClick={open}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
    >
      <div className="flair-bg">
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="loop-svg">
          <path d={pathD} className="loop-path" />
          {NODES.map((n, i) => {
            const p = polar(n.angle);
            return (
              <g key={n.label} className={`loop-node${i === activeNode ? ' active' : ''}`}>
                <circle cx={p.x} cy={p.y} r="4" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" className="loop-label">{n.label}</text>
              </g>
            );
          })}
          <circle cx={dot.x} cy={dot.y} r="5" className="loop-dot" />
          <line className="loop-adv-pulse" x1="0" y1="0" x2="200" y2="200" />
          <circle cx="100" cy="100" r="95" className="loop-replication" />
        </svg>
      </div>

      <div className="iter-counter" aria-hidden="true">
        <span className="iter-label">iter</span>
        <span className="iter-num">{String(iter).padStart(2, '0')}</span>
      </div>

      <div className="badge">{a.read?.toUpperCase()} · DEEP READ</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
```

---

- [ ] **Step 3.2: Append component-scoped styles to `featured.css`**

Open `v2/src/components/featured/featured.css` and append to the end:

```css
/* ═══ Research Loop ═══ */

.research-loop-card .loop-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.55;
}

.research-loop-card .loop-path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 0.8;
  stroke-dasharray: 3 4;
  opacity: 0.55;
}

.research-loop-card .loop-node circle {
  fill: var(--ink-mute);
  transition: fill 0.25s;
}
.research-loop-card .loop-node.active circle {
  fill: var(--accent);
  filter: drop-shadow(0 0 6px var(--accent));
}
.research-loop-card .loop-node .loop-label {
  font-family: var(--mono);
  font-size: 7px;
  fill: var(--ink-mute);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: fill 0.25s;
}
.research-loop-card .loop-node.active .loop-label {
  fill: var(--ink);
}

.research-loop-card .loop-dot {
  fill: var(--accent);
  filter: drop-shadow(0 0 8px var(--accent));
  transition: cx 0.6s cubic-bezier(.4,0,.2,1), cy 0.6s cubic-bezier(.4,0,.2,1);
}

.research-loop-card.is-hover .loop-dot {
  transition-duration: 0.2s;
}

.research-loop-card .loop-adv-pulse {
  stroke: oklch(0.68 0.18 25);
  stroke-width: 0;
  opacity: 0;
}
.research-loop-card.is-hover .loop-adv-pulse {
  animation: loop-adv 0.9s ease-out 0.05s;
}
@keyframes loop-adv {
  0%   { stroke-width: 0; opacity: 0; }
  30%  { stroke-width: 2; opacity: 0.8; }
  100% { stroke-width: 0; opacity: 0; }
}

.research-loop-card .loop-replication {
  fill: none;
  stroke: oklch(0.72 0.13 150);
  stroke-width: 0;
  opacity: 0;
}
.research-loop-card.is-hover .loop-replication {
  animation: loop-rep 1.1s ease-out 0.5s;
}
@keyframes loop-rep {
  0%   { stroke-width: 0; opacity: 0; transform: scale(0.85); transform-origin: center; }
  40%  { stroke-width: 1.5; opacity: 0.7; }
  100% { stroke-width: 0; opacity: 0; transform: scale(1.05); }
}

.research-loop-card .iter-counter {
  position: absolute;
  left: 24px;
  bottom: 56px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-mute);
  z-index: 2;
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.research-loop-card .iter-counter .iter-label {
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.research-loop-card .iter-counter .iter-num {
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
}

@media (prefers-reduced-motion: reduce) {
  .research-loop-card .loop-dot { transition: none; }
  .research-loop-card.is-hover .loop-adv-pulse,
  .research-loop-card.is-hover .loop-replication { animation: none; }
}
```

---

- [ ] **Step 3.3: Visual verification in dev**

Reload the dev server if it isn't already watching. Scroll to the Writing section.

Expected for the Research Loop tile:
- A dashed loop path is visible across the tile's background.
- Five dots sit around the loop; one labelled node is brighter (accent colour, glowing).
- A bright dot travels between node positions every ~2.8 seconds.
- An `iter 01` counter sits above the meta row; it increments each full loop, wrapping at 09 → 01.
- On mouse-over: the traveling dot speeds up to ~0.9s intervals. A red diagonal sweeps once. ~0.5s later, a green-ring pulse scales outward from center.
- On mouse-leave: pulses stop, dot returns to slow cadence.

Toggle OS reduced-motion (Windows: Settings → Accessibility → Visual effects → Animation effects OFF; or Chrome DevTools → Rendering → Emulate CSS media feature prefers-reduced-motion). Expected:
- Loop dot holds at `read` position (node 0).
- Counter holds at `01`.
- Hover still changes background and title colour (CSS hover is preserved).
- No red/green pulses fire.

---

- [ ] **Step 3.4: Build verification**

```bash
cd v2 && npm run build
```

Expected: success, no new warnings specific to this file.

---

- [ ] **Step 3.5: Commit**

```bash
git add v2/src/components/featured/ResearchLoopCard.jsx v2/src/components/featured/featured.css
git commit -m "feat(writing): research loop 'iteration engine' flair"
```

---

## Task 4: Build the At-Home Media "Home Theater HUD" flair

Replace the placeholder with the full treatment: scanlines, RGB chromatic aberration on the title, a "NOW PLAYING" marquee, pulsing progress bar, format chips, and the hover PLAY ► beat. Uses an amber accent override locally.

**Files:**
- Modify: `v2/src/components/featured/AtHomeMediaCard.jsx` (full rewrite)
- Modify: `v2/src/components/featured/featured.css` (append)

---

- [ ] **Step 4.1: Write the full `AtHomeMediaCard` component**

Open `v2/src/components/featured/AtHomeMediaCard.jsx` and replace the entire file contents with:

```jsx
import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

const NOW_PLAYING_ITEMS = [
  'S04E08 · Better Call Saul',
  'The Thing (1982)',
  'Cowboy Bebop · Session #22',
  'Blade Runner 2049',
  'Chef’s Table · Vol. IX',
];

const CHIPS = ['4K', 'HDR', 'DOLBY', 'USENET'];

export default function AtHomeMediaCard({ a, onOpen }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [marqueeIdx, setMarqueeIdx] = useState(0);
  const [progress, setProgress] = useState(0.32);

  useEffect(() => {
    if (reduced || hover) return;
    const id = setInterval(() => {
      setMarqueeIdx((i) => (i + 1) % NOW_PLAYING_ITEMS.length);
    }, 3400);
    return () => clearInterval(id);
  }, [hover, reduced]);

  useEffect(() => {
    if (reduced || hover) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + 0.015;
        return next >= 0.95 ? 0.1 : next;
      });
    }, 600);
    return () => clearInterval(id);
  }, [hover, reduced]);

  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  return (
    <article
      className={`featured-tile featured at-home-media-card${hover ? ' is-hover' : ''}`}
      onClick={open}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
      data-accent-override="amber"
    >
      <div className="flair-bg">
        <div className="scanlines" />
        <div className="vignette" />
      </div>

      <div className="play-overlay" aria-hidden="true">▶</div>

      <div className="badge">HOME THEATER · S01E11</div>
      <div className="cats">{a.cats}</div>
      <h4 className="amh-title" data-text={a.title}>{a.title}</h4>

      <div className="now-playing" aria-hidden="true">
        <span className="np-label">NOW PLAYING</span>
        <span className="np-current">{NOW_PLAYING_ITEMS[marqueeIdx]}</span>
      </div>

      <div className="progress-row" aria-hidden="true">
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress * 100}%` }} /></div>
        <span className="timecode">
          {Math.floor(progress * 90)}:{String(Math.floor((progress * 90 * 60) % 60)).padStart(2, '0')}
        </span>
      </div>

      <div className="chips">
        {CHIPS.map(c => <span key={c} className="chip">{c}</span>)}
      </div>

      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Play ►</span>
      </div>
    </article>
  );
}
```

---

- [ ] **Step 4.2: Append Home Theater styles to `featured.css`**

Open `v2/src/components/featured/featured.css` and append:

```css
/* ═══ At-Home Media (amber override) ═══ */

.at-home-media-card {
  --accent: oklch(0.75 0.14 70);
  --accent-soft: oklch(0.75 0.14 70 / 0.14);
}

.at-home-media-card .scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 2px,
    oklch(0.75 0.14 70 / 0.06) 2px,
    oklch(0.75 0.14 70 / 0.06) 3px
  );
  opacity: 0.9;
  transition: opacity 0.3s;
}
.at-home-media-card.is-hover .scanlines { opacity: 1; }

.at-home-media-card .vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%);
}

.at-home-media-card .amh-title {
  position: relative;
}
.at-home-media-card .amh-title::before,
.at-home-media-card .amh-title::after {
  content: attr(data-text);
  position: absolute;
  top: 0; left: 0;
  pointer-events: none;
  opacity: 0.45;
  transition: transform 0.3s, opacity 0.3s;
}
.at-home-media-card .amh-title::before {
  color: oklch(0.68 0.18 25);
  transform: translate(-1.5px, 0);
}
.at-home-media-card .amh-title::after {
  color: oklch(0.72 0.13 195);
  transform: translate(1.5px, 0);
}
.at-home-media-card.is-hover .amh-title::before,
.at-home-media-card.is-hover .amh-title::after {
  transform: translate(0, 0);
  opacity: 0;
}

.at-home-media-card .now-playing {
  font-family: var(--mono);
  font-size: 11px;
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-top: 6px;
  z-index: 2;
  position: relative;
}
.at-home-media-card .np-label {
  color: var(--accent);
  letter-spacing: 0.12em;
}
.at-home-media-card .np-current {
  color: var(--ink-dim);
  transition: opacity 0.3s;
}

.at-home-media-card .progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 2;
  position: relative;
}
.at-home-media-card .progress-bar {
  flex: 1;
  height: 3px;
  background: var(--line);
  position: relative;
  overflow: hidden;
}
.at-home-media-card .progress-fill {
  height: 100%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent-soft);
  transition: width 0.6s linear;
}
.at-home-media-card .timecode {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-mute);
  min-width: 36px;
}

.at-home-media-card .chips {
  display: flex;
  gap: 6px;
  z-index: 2;
  position: relative;
  margin-top: 2px;
}
.at-home-media-card .chip {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  padding: 2px 6px;
  border: 1px solid color-mix(in oklab, var(--accent) 50%, var(--line));
  color: var(--accent);
}

.at-home-media-card .play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  color: var(--accent);
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.25s ease-out, transform 0.25s cubic-bezier(.2,.8,.2,1);
  pointer-events: none;
  z-index: 3;
  text-shadow: 0 0 24px var(--accent);
}
.at-home-media-card.is-hover .play-overlay {
  opacity: 0.9;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .at-home-media-card .progress-fill { transition: none; }
  .at-home-media-card .play-overlay { transition: opacity 0.15s; }
}
```

---

- [ ] **Step 4.3: Visual verification in dev**

Reload. Scroll to the Writing section.

Expected for the At-Home Media tile:
- Whole tile is visibly amber-tinted (scanlines, accent chips, progress-fill) — distinct from the violet elsewhere.
- Faint horizontal scanlines across the tile.
- Vignette darkening at the edges.
- Title shows slight red/blue RGB ghosting (chromatic aberration).
- "NOW PLAYING" label with a rotating media title changing every ~3.4 seconds.
- A thin progress bar with a timecode (e.g., `28:07`) that ticks upward then loops.
- Row of chips: `4K HDR DOLBY USENET`.
- On mouse-over: RGB ghosting collapses to zero (title goes sharp); large amber `▶` icon grows center; marquee freezes; progress-bar stops ticking; `Play ►` in the bottom right still visible.
- On mouse-leave: everything resumes.

Reduced-motion check:
- Marquee shows first item only (`S04E08 · Better Call Saul`).
- Progress bar fixed at ~32%.
- RGB ghosting still visible (static CSS — intentional; it's texture, not motion).
- Hover PLAY ► still appears (faster, no bounce) so interactivity remains obvious.

---

- [ ] **Step 4.4: Build verification**

```bash
cd v2 && npm run build
```

Expected: success.

---

- [ ] **Step 4.5: Commit**

```bash
git add v2/src/components/featured/AtHomeMediaCard.jsx v2/src/components/featured/featured.css
git commit -m "feat(writing): at-home media 'home theater HUD' flair"
```

---

## Task 5: Build the Obsidian Wiki "Knowledge Graph" flair

Replace the placeholder with the full treatment: a small force-directed graph simulation running in `requestAnimationFrame`, edges that stochastically brighten, a `0 → 208` counter that triggers on scroll-into-view, and the hover re-organization beat.

**Files:**
- Modify: `v2/src/components/featured/ObsidianWikiCard.jsx` (full rewrite)
- Modify: `v2/src/components/featured/featured.css` (append)

---

- [ ] **Step 5.1: Write the full `ObsidianWikiCard` component**

Open `v2/src/components/featured/ObsidianWikiCard.jsx` and replace the entire file contents with:

```jsx
import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

const TARGET = 208;
const N_NODES = 11;
const WIDTH = 200;
const HEIGHT = 200;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function initNodes(seed) {
  const rand = seededRandom(seed);
  return Array.from({ length: N_NODES }, (_, i) => ({
    id: i,
    x: 40 + rand() * (WIDTH - 80),
    y: 40 + rand() * (HEIGHT - 80),
    vx: 0,
    vy: 0,
  }));
}

function initEdges(nodes, seed) {
  const rand = seededRandom(seed);
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    const connections = 1 + Math.floor(rand() * 2);
    for (let c = 0; c < connections; c++) {
      const j = Math.floor(rand() * nodes.length);
      if (j !== i && !edges.find(e => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
        edges.push({ a: i, b: j, pulse: rand() });
      }
    }
  }
  return edges;
}

export default function ObsidianWikiCard({ a, onOpen }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [count, setCount] = useState(0);
  const [seed, setSeed] = useState(7);
  const [nodes, setNodes] = useState(() => initNodes(7));
  const edgesRef = useRef(initEdges(nodes, 7));
  const rafRef = useRef(null);
  const cardRef = useRef(null);
  const startedRef = useRef(false);

  // Counter: tick up to TARGET on scroll-into-view
  useEffect(() => {
    if (!cardRef.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          if (reduced) { setCount(TARGET); return; }
          const start = performance.now();
          const duration = 1600;
          const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setCount(Math.floor(eased * TARGET));
            if (t < 1) requestAnimationFrame(step);
            else setCount(TARGET);
          };
          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.35 });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, [reduced]);

  // Force-directed simulation
  useEffect(() => {
    if (reduced) return;
    let running = true;
    const tick = () => {
      if (!running) return;
      setNodes((prev) => {
        const next = prev.map(n => ({ ...n }));
        const k = 0.015;  // spring
        const rep = 600;  // repulsion strength
        for (const e of edgesRef.current) {
          const a = next[e.a]; const b = next[e.b];
          const dx = b.x - a.x; const dy = b.y - a.y;
          const dist = Math.max(Math.hypot(dx, dy), 0.001);
          const target = 55;
          const force = (dist - target) * k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i]; const b = next[j];
            const dx = b.x - a.x; const dy = b.y - a.y;
            const dist = Math.max(Math.hypot(dx, dy), 0.001);
            const force = rep / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
        for (const n of next) {
          n.vx *= 0.82;
          n.vy *= 0.82;
          n.x += n.vx * 0.5;
          n.y += n.vy * 0.5;
          n.x = Math.max(20, Math.min(WIDTH - 20, n.x));
          n.y = Math.max(20, Math.min(HEIGHT - 20, n.y));
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [reduced]);

  // Hover = re-seed the graph and restart counter
  useEffect(() => {
    if (!hover) return;
    const newSeed = Math.floor(Math.random() * 1000) + 1;
    setSeed(newSeed);
    const fresh = initNodes(newSeed);
    edgesRef.current = initEdges(fresh, newSeed);
    setNodes(fresh);
    if (!reduced) {
      setCount(0);
      startedRef.current = false;
      // re-trigger the counter on next IO check; if still in view, restart manually:
      const start = performance.now();
      const duration = 1100;
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setCount(Math.floor(eased * TARGET));
        if (t < 1) requestAnimationFrame(step);
        else setCount(TARGET);
      };
      requestAnimationFrame(step);
    }
  }, [hover, reduced]);

  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  return (
    <article
      ref={cardRef}
      className={`featured-tile featured obsidian-wiki-card${hover ? ' is-hover' : ''}`}
      onClick={open}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
    >
      <div className="flair-bg">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="graph-svg">
          {edgesRef.current.map((e, i) => {
            const a = nodes[e.a]; const b = nodes[e.b];
            if (!a || !b) return null;
            const pulsed = ((performance.now() / 900) + e.pulse) % 1;
            const opacity = 0.2 + 0.55 * Math.abs(Math.sin(pulsed * Math.PI));
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="graph-edge" style={{ opacity }} />;
          })}
          {nodes.map((n) => (
            <circle key={n.id} cx={n.x} cy={n.y} r="3.5" className="graph-node" />
          ))}
        </svg>
      </div>

      <div className="graph-counter" aria-hidden="true">
        <div className="count-num">{count}</div>
        <div className="count-sub">ARTICLES SURVIVED · FIVE TYPES · ONE STOP HOOK</div>
      </div>

      <div className="badge">LATEST · APR 2026</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Traverse ›</span>
      </div>
    </article>
  );
}
```

---

- [ ] **Step 5.2: Append Knowledge Graph styles to `featured.css`**

Open `v2/src/components/featured/featured.css` and append:

```css
/* ═══ Obsidian Wiki Knowledge Graph ═══ */

.obsidian-wiki-card .graph-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.55;
  transition: opacity 0.3s;
}
.obsidian-wiki-card.is-hover .graph-svg { opacity: 0.85; }

.obsidian-wiki-card .graph-edge {
  stroke: var(--accent);
  stroke-width: 0.6;
}
.obsidian-wiki-card .graph-node {
  fill: var(--accent);
  filter: drop-shadow(0 0 4px var(--accent-soft));
}

.obsidian-wiki-card .graph-counter {
  position: absolute;
  left: 28px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  pointer-events: none;
}
.obsidian-wiki-card .count-num {
  font-family: var(--display, var(--mono));
  font-size: clamp(56px, 8vw, 96px);
  font-weight: 700;
  line-height: 1;
  color: var(--ink);
  letter-spacing: -0.02em;
  text-shadow: 0 0 16px var(--accent-soft);
}
.obsidian-wiki-card .count-sub {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-mute);
  letter-spacing: 0.12em;
  margin-top: 8px;
  max-width: 60%;
  text-transform: uppercase;
}

@media (prefers-reduced-motion: reduce) {
  .obsidian-wiki-card .graph-edge { opacity: 0.4 !important; }
}
```

---

- [ ] **Step 5.3: Visual verification in dev**

Reload. Scroll to the Writing section.

Expected for the Obsidian Wiki tile:
- A constellation of ~11 dots with connecting lines animates subtly in the background — nodes drifting slowly into equilibrium, edges pulsing stochastically in brightness.
- Large `208` counter sits center-left, ticking up from 0 the first time the tile scrolls into view.
- Subtitle line under the counter: `ARTICLES SURVIVED · FIVE TYPES · ONE STOP HOOK`.
- On mouse-over: the graph reshuffles — nodes animate to new equilibrium positions, edges brighten. Counter resets to 0 and ticks up again to 208 (~1.1s).
- On mouse-leave: no re-animation, graph continues drifting.

Reduced-motion check:
- Graph is drawn once, does not move.
- Counter snaps immediately to 208.
- Hover does nothing animation-wise; hover background/title colour change still works.

---

- [ ] **Step 5.4: Build verification**

```bash
cd v2 && npm run build
```

Expected: success. No new warnings.

---

- [ ] **Step 5.5: Commit**

```bash
git add v2/src/components/featured/ObsidianWikiCard.jsx v2/src/components/featured/featured.css
git commit -m "feat(writing): obsidian wiki 'knowledge graph' flair"
```

---

## Task 6: Responsive and integration verification

A final gate that exercises all three tiles at the three critical breakpoints and confirms there are no cross-tile regressions. No code changes expected; any bug found here gets fixed as its own commit referencing this plan.

**Files:** none unless a bug surfaces.

---

- [ ] **Step 6.1: Test at wide viewport (>= 1041px)**

In dev, resize the window to ~1400px wide. Scroll to Writing.

Expected:
- Grid shows 3 columns.
- Each super-tile occupies 2 columns × 2 rows (spans 2/3 of the row width, double-tall).
- Regular cards wrap around the super-tiles with no stray empty cells above or between them in the first two visible rows.
- All animations on all three tiles run simultaneously without jank.
- Hover each of the three super-tiles in turn — hover beats fire independently.

---

- [ ] **Step 6.2: Test at medium viewport (781-1040px)**

Resize the window to ~900px.

Expected:
- Grid shows 2 columns.
- Each super-tile spans both columns (full row width), double-tall.
- Regular cards fill around them cleanly.

---

- [ ] **Step 6.3: Test at mobile viewport (<= 780px)**

Resize to ~500px.

Expected:
- Grid is single-column.
- Super-tiles are single-width with `min-height: 320px`, so they read as taller than regular cards but aren't cramped.
- All per-tile animations still run or hold appropriately.
- Hover effects aren't expected on mobile; tapping a card still opens the modal.

---

- [ ] **Step 6.4: Console + build final pass**

With dev running, navigate to every main section of the page once and back to Writing. Keep the browser DevTools console open. Expected: no React warnings, no runtime errors, no unresolved imports.

Run one last production build:
```bash
cd v2 && npm run build
```

Expected: success.

---

- [ ] **Step 6.5: Final git status check**

From the repo root:
```bash
git status
git log --oneline -10
```

Expected status:
- Working tree clean with respect to the files this plan touched. Pre-existing modifications to other files (e.g., `v2/src/content/blog/*.md` shown in the initial git status) are untouched — they're outside this plan's scope.
- The last 5 commits on `master` are the ones from this plan: scaffold, keyboard, research-loop, at-home-media, obsidian-wiki.

No commit in this step unless a fix was needed during 6.1-6.4.

---

## Done

When Task 6 passes, the feature is complete:
- Three hand-picked blog posts render as 2×2 super-tiles at the top of the Writing grid.
- Each tile has a bespoke animated treatment thematically tied to the post.
- Keyboard and reduced-motion accessibility are handled uniformly.
- No changes leaked beyond `v2/src/components/featured/`, `v2/src/components/Sections.jsx`, and `v2/src/styles.css`.
- Adding a future featured post requires one new component file + one line in the `FEATURED` map.
