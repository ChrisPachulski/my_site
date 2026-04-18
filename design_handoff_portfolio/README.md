# Handoff: Chris Pachulski Portfolio — v2 Redesign

## Overview

This is a full redesign of `chrispachulski.com` (repo: `ChrisPachulski/my_site`). The current site is a Hugo theme (`portio-hugo-data-science`) — this redesign replaces the entire front end with a custom single-scroll portfolio targeted at a **Senior Economic Analyst @ Wizards of the Coast / MTG: The Gathering** audience. It emphasizes Chris's current role, his MTGBAN co-founder story (divested Nov 2025), and 7+ years of analytics engineering work.

**Goal of this handoff:** deploy this as the new live site at `chrispachulski.com`. The existing repo uses Netlify (`netlify.toml` is already present). The plan is either (a) replace the Hugo theme with this static build, or (b) drop a standalone `index.html + styles.css + components/` bundle into the repo and point Netlify at it.

## About the Design Files

The files in this bundle are **design references created in HTML** — a working prototype showing final look, behavior, and content. They are **not** intended to be shipped as-is to production because:

1. **React + Babel are loaded in-browser from CDN.** That works for preview but has a slow first paint (~1–2s while Babel transpiles JSX at runtime). Production should **pre-compile JSX with Vite / esbuild / Next.js** and ship plain JS.
2. **No bundling or minification.** CSS is one 850-line file; JSX is four separate files loaded via `<script type="text/babel">`.
3. **Missing production essentials.** No favicon, no OG/Twitter meta tags, no analytics, no 404 page, no sitemap.

The task is to **recreate this design in a production-ready setup** — either keep it as a lightly-tooled static site (Vite is a good fit), or integrate into Next.js / Astro / similar. Visual output and behavior must match the prototype exactly.

## Fidelity

**High-fidelity.** All colors, typography, spacing, copy, interactions, animations, and content are final. Recreate pixel-perfectly.

## Deployment Target

- **Repo:** `ChrisPachulski/my_site` (branch: `master`)
- **Host:** Netlify (already configured via `netlify.toml`)
- **Custom domain:** currently `chrispachulski.com` (assumed — confirm with Chris)
- **Replace:** the entire existing Hugo theme output. Chris has explicitly said the new design supersedes the Hugo site.

### Recommended deploy path (Vite)

```
npm create vite@latest my_site_v2 -- --template react
# copy components/*.jsx (convert `.jsx` script-loaded files to proper ES module imports)
# copy styles.css into src/
# add Google Fonts link to index.html
npm run build
# netlify.toml → publish = "dist"
git push
```

### Alternative (no build step)

Ship `index.html + styles.css + components/*.jsx` as-is. Works, but has the Babel-in-browser penalty. Only do this if Chris explicitly wants zero tooling.

## Architecture

```
index.html                  Root HTML, loads React/Babel/Fonts + mounts #root
styles.css                  All styling — 850 lines, includes base + cyberpunk layer
components/
  Hero.jsx                  Hero section + animated SQL terminal + stat tiles
  AboutSkills.jsx           About + Skills grid + MTGBAN Feature block
  Sections.jsx              Projects + Resume (GitLog) + Writing + Contact
  App.jsx                   Nav + Tweaks panel + scrollspy + App shell (mount point)
```

**Load order matters** — `App.jsx` must load last; it references components defined in the others via global scope (Babel in-browser doesn't give you ES modules). When porting to Vite, convert to real `import`/`export` statements.

## Sections (in scroll order)

1. **Hero** — headline, stat grid (4 tiles), animated terminal
2. **About** — short bio + facts list (location, role, prev, education, etc.)
3. **Skills** — categorized stack with usage notes and years
4. **Feature** — MTGBAN pipeline highlight (full-width card)
5. **Projects / Work** — 8 case studies, chronological
6. **Resume / GitLog** — experience styled as a git log (hash + role + company + date range + bullets)
7. **Writing** — 30 real blog posts pulled from the repo, newest first
8. **Contact** — email + GitHub + LinkedIn

## Design Tokens

### Colors (editorial / default dark theme)

```css
--bg:            #12110f        /* page background */
--bg-elev:       #1a1815        /* elevated surfaces */
--bg-card:       #1f1c18        /* card surface */
--ink:           #f4efe6        /* primary text */
--ink-dim:       #b8ada0        /* secondary text */
--ink-mute:      #7a7268        /* tertiary / metadata */
--line:          #2a2620        /* hairlines */
--line-bright:   #3a342c        /* emphasized hairlines */
```

### Accent (default: violet)

All accents are defined in oklch and swappable via `data-accent` on `<html>`:

```css
rust:   oklch(0.64 0.15 35)
amber:  oklch(0.75 0.14 70)
olive:  oklch(0.70 0.13 115)
cyan:   oklch(0.72 0.13 195)
violet: oklch(0.70 0.14 300)    /* default */
```

Each accent also has `--accent-soft` (10% opacity) and `--accent-ink` (the legible color on top of the accent).

### Cyberpunk theme layer (default ON)

Activated via `<html data-vibe="cyberpunk">`. Adds:
- Neon cyan (primary) + magenta (secondary) accents that override the standard accent for headings/dots
- Scanline overlay on `body::after` (z-index 2, pointer-events none)
- Faint grid overlay on `body::before`
- Chromatic-aberration text-shadow on `.hero-headline` (static, NOT animated — flicker was explicitly removed)
- Orbitron uppercase on all `<h2>` headings and section labels
- Glowing box-shadows on interactive elements (cta, dots, active nav idx)
- JetBrains Mono stays for body mono; Inter Tight for body; Instrument Serif for editorial headlines

### Typography

```
--sans:  'Inter Tight', system-ui, sans-serif
--serif: 'Instrument Serif', Georgia, serif     (editorial italic lede, headlines)
--mono:  'JetBrains Mono', ui-monospace, monospace
--display: 'Orbitron', sans-serif               (cyberpunk uppercase headings only)
```

Hero headline scale: `clamp(48px, 6vw, 96px)`, serif, italic emphasis via `<em>`.
Body: 16–17px, sans.
Meta / nav / labels: 11–13px, mono, often uppercase with tracked letter-spacing.

### Spacing / layout

- Max content width: `1200px` wrap
- Section padding: `120px 32px` (desktop), `80px 20px` (mobile)
- Nav: fixed, 18px padding, transparent until scrolled (then hairline bottom border)
- Grids: CSS grid, breakpoints at 1040px (single col) and 780px (hide nav links)

### Border radii

- Cards: 6px
- Small (buttons, tags): 2px (intentionally sharp for the technical feel)
- Pills (badges): 999px

## Interactions & Behavior

### Nav

- Sticky top nav, becomes subtle when scrolled (border-bottom)
- Scrollspy: highlights active section as user scrolls
- Smooth scroll on hash link clicks (CSS `scroll-behavior: smooth`)
- Nav tabs **must** sit at `z-index: 100` — the cyberpunk scanline overlay at z-index 2 and section content at z-index 3 previously caused click-eating issues; this is explicitly fixed in `styles.css` under the cyberpunk block

### Hero terminal

- Animated type-on effect that runs a fake SQL query returning Chris's current role
- Three variants (togglable via Tweaks): `sql`, `psql`, `shell` (DAG style)
- Default: `sql`
- Typing animation driven by `setInterval`; cursor blinks at 1Hz

### Tweaks panel

- Bottom-right floating panel, only visible when the host toolbar toggles edit mode
- Controls: accent swatches (5), theme (dark/light), vibe (editorial/cyberpunk), hero terminal variant
- Persists changes via `postMessage` to parent — **remove this for production**; replace with a simpler color/theme picker if Chris wants user-facing customization, or hardcode the defaults if not
- Defaults: `{ accent: "violet", theme: "dark", heroVariant: "sql", vibe: "cyberpunk" }`

### Projects cards

- Hover: card lifts slightly, accent hairline appears on left edge
- No modal; cards are purely informational

### Resume / GitLog

- Each entry styled like a `git log` output
- Hash (fake 7-char) in mono + accent color
- Role, company, date range on one line
- Bullets below with `{+delta}` stat pills

## State Management

All state is local React (`useState`) — no routing library, no data fetching, no external stores. Everything is static content embedded in the JSX files.

- `App.jsx`: `tweaks`, `editMode`, `active` (scrollspy)
- `Hero.jsx` → `HeroTerminal`: `typed` (int, typing cursor position)

## Content

All content is **final and signed off by Chris**. Do not paraphrase or shorten.

Key data structures in `Sections.jsx`:
- `PROJECTS` — 8 case studies, chronological
- `EXPERIENCE` — 6 roles, reverse-chronological
- `ARTICLES` — 30 blog posts, reverse-chronological (dates pulled from frontmatter in `ChrisPachulski/my_site/content/blog/`)

Key data in `AboutSkills.jsx`:
- `SKILLS` — grouped stack (Languages, Warehousing, BI, Orchestration, etc.)
- About paragraph — Seattle-based, WotC Sr Economic Analyst, dachshunds, Leafs, daughter

## Critical Copy Rules (from user review)

- **"MTGBAN" is always uppercase** — never "MTGBan"
- **No "divested" language** — the end date 2025 is sufficient
- **Location is Seattle, WA · Remote** — NOT Long Island NY (that was Hugo default)
- **Current role is Sr Economic Analyst @ WotC** — start Nov 2025
- **Writing includes R, Python, SQL** — don't say "mostly R, SQL"
- **"Betting" is banned** — use "shipping", "building", etc.
- **Email:** `pachun95@gmail.com`
- **GitHub:** `ChrisPachulski`
- **Contact section must NOT link to `mtgban.com`** — Chris explicitly does not own/represent that site anymore

## Assets

None bundled. No images, no icons, no SVGs beyond inline. All visual interest comes from typography, color, and CSS. If Chris wants a headshot on the About section later, that's a follow-up.

## SEO / Social — TODO for implementer

Before shipping, add to `index.html` `<head>`:

```html
<!-- Basic -->
<meta name="description" content="Chris Pachulski — Senior Economic Analyst @ Wizards of the Coast. Analytics engineer with 7+ years shipping data systems for ad-tech, consumer, and gaming.">
<meta name="author" content="Chris Pachulski">
<link rel="canonical" href="https://chrispachulski.com/">

<!-- Open Graph -->
<meta property="og:type" content="website">
<meta property="og:title" content="Chris Pachulski — Analytics Engineer">
<meta property="og:description" content="Sr Economic Analyst @ WotC. 7+ years of data systems.">
<meta property="og:image" content="https://chrispachulski.com/og.png">
<meta property="og:url" content="https://chrispachulski.com/">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">

<!-- Favicon -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

Create an `og.png` (1200×630) — can be a rendered screenshot of the hero section.

## Files in this handoff

- `index.html` — entry point
- `styles.css` — all styling
- `components/Hero.jsx` — hero + terminal
- `components/AboutSkills.jsx` — about + skills + MTGBAN feature
- `components/Sections.jsx` — projects + resume + writing + contact
- `components/App.jsx` — nav + tweaks + app shell
- `README.md` — this file

## Implementation checklist for Claude Code

1. [ ] Clone `ChrisPachulski/my_site`, create branch `v2-redesign`
2. [ ] Scaffold Vite + React in a subdirectory (or replace Hugo root entirely — confirm with Chris)
3. [ ] Port each `.jsx` file to use proper ES imports/exports
4. [ ] Drop `styles.css` in as-is; import from `App` entry
5. [ ] Add Google Fonts link or self-host (Inter Tight, Instrument Serif, JetBrains Mono, Orbitron)
6. [ ] Add SEO/OG meta tags
7. [ ] Generate `og.png` (screenshot hero or design one)
8. [ ] Add favicon
9. [ ] Remove the Tweaks panel + edit-mode wiring from `App.jsx` (or keep as a hidden dev affordance)
10. [ ] Update `netlify.toml` → `publish = "dist"` (or wherever Vite outputs)
11. [ ] `npm run build` and verify locally
12. [ ] Push to `v2-redesign`, open PR, preview-deploy via Netlify
13. [ ] Once Chris signs off on the preview, merge to `master` → auto-deploys to `chrispachulski.com`

## Notes

- The current Hugo site has `config.yaml`, `data/*.yml`, `content/blog/*.md`, and `theme: portio-hugo-data-science`. All of this can be archived (`git mv` to `_archive/`) or deleted. The blog post markdown files in `content/blog/` are the source of truth for the 30 articles linked in the Writing section — if Chris wants those posts to actually render (rather than just list titles), keep them and wire up a Vite + MDX or Astro content collection. If he doesn't care about rendering them on the new site, the titles-only list is fine.
- Chris's resume PDF was shared in chat but is not bundled here. The experience + education data in `Sections.jsx` matches it.
