# Portfolio v2 — Session Handoff

## What this is
Vite + React port of the original `design_handoff_portfolio` prototype, deployed to Netlify. Superseded the old Hugo theme. Lives at **https://chrispachulski.netlify.app**.

## Repo
- Path: `C:\Users\pachulc\OneDrive - Hasbro Inc\Documents\best-analytics\Python\external\my_site`
- Remote: `https://github.com/ChrisPachulski/my_site` (master branch)
- `gh auth status` shows both accounts; **personal (ChrisPachulski) is active** — do NOT switch to `pachulc_hasbro`
- **Commits use inline identity** (no git config is set anywhere):
  ```
  git -c user.name="ChrisPachulski" -c user.email="cjpach@icloud.com" commit -m "..."
  ```
- Do NOT run `git config` — matching prior history with inline flags keeps identity clean without modifying config

## Layout
```
my_site/
  netlify.toml              base="v2", command="npm ci && npm run build", publish="dist", NODE_VERSION=20
  design_handoff_portfolio/ original prototype (committed in bb4235d); superseded by v2/
  content/blog/*.md         Hugo blog sources (30 posts) — kept; also copied into v2/src/content/blog/
  v2/                       Vite + React app
    index.html              Google Fonts + SEO/OG/Twitter meta; data-theme=dark data-accent=violet data-vibe=cyberpunk
    package.json            deps: react 19, react-markdown, remark-gfm
    src/
      main.jsx              mounts <App />
      App.jsx               Nav + scrollspy + applies data-* attrs; hardcoded defaults (no Tweaks panel)
      styles.css            ~500 lines; CSS vars + cyberpunk overrides + blog-modal styles
      components/
        Hero.jsx            Headline, SQL/psql/shell terminal, 4 stat tiles
        AboutSkills.jsx     About + Skills (6 tools, daily-driver dot) + Feature (MTGBAN DAG)
        Sections.jsx        Projects (7 case studies, collapsible) + Resume (serpentine gitlog) + Writing (30 articles, modal) + Contact (form + fact-list)
      content/blog/*.md     30 blog posts bundled at build time
      lib/blog.js           Markdown loader via import.meta.glob + frontmatter regex
  Personal Portfolio/       Untracked duplicate of design_handoff_portfolio; safe to delete
  (old Hugo files)          config.yaml, data/, i18n/, themes/ — Netlify no longer builds these
```

## Deploy flow
```
git push origin master  → Netlify auto-build (~30-60s) → publishes v2/dist/
```
- Live URL: https://chrispachulski.netlify.app
- `chrispachulski.com` **does not exist in DNS** (never registered). User decided to stay on the Netlify URL.

## Theme system
Defaults hardcoded in `index.html` root attrs + `App.jsx` useEffect:
- `data-theme="dark"`, `data-accent="violet"`, `data-vibe="cyberpunk"`

Key CSS vars in `styles.css`:
`--bg`, `--bg-elev`, `--bg-card`, `--ink`, `--ink-dim`, `--ink-mute`, `--line`, `--line-bright`, `--accent`, `--accent-soft`, `--accent-ink`, `--accent-2`, `--accent-3`, `--serif` (Instrument Serif), `--sans` (Inter Tight), `--mono` (JetBrains Mono), `--display` (Orbitron)

Cyberpunk vibe adds: Orbitron uppercase on h2, chromatic-aberration text-shadow on hero headline, scanline + grid overlays, neon glows on accents, sharp 0-radius edges on cards.

## What's been done (chronological commits)
1. `bb4235d` — Import original `design_handoff_portfolio` with tuning pass: sized every section to fit one viewport, merged duplicate "previously" row in About, normalized Skills table (6 tools), flipped Case Study titles to `Company — Project`, fixed LinkedIn row layout via flex
2. `0156c13` — Ported to Vite + React under `v2/`; ES modules; Tweaks panel dropped; SEO/OG meta added; Netlify config rewritten
3. `2f9894c` — Writing section: click opens modal with react-markdown-rendered post; ESC / click-outside closes; body scroll locked while open
4. `c03f63e` — Cyberpunk overrides for blog modal (Orbitron uppercase headings, glows, sharp edges, accent-tinted code blocks)

## Known fragile / contentious — READ BEFORE EDITING
### Resume serpentine git log (DO NOT ITERATE CASUALLY)
`Resume()` in `v2/src/components/Sections.jsx` uses a "serpentine" gitlog where each commit alternates left/right with SVG connector curves. **Every attempt to iterate on the connector path during this session was met with frustration** — "worst", "disgusting", "utter shit", "you're fucking fired".

Current state is what the user originally called "YES right behavior":
- `margin-top: -250px` on `:nth-child(n+2)` commits → 35% overlap
- Connector: 180px height, stroke-width 1.5, `viewBox="0 0 100 180"`, `overflow: visible`
- Path structure: dip down-right to `(98, 80)`, vertical line `L 98 25`, curve into next card at `(70, -70)`

If the user asks to change it: **clarify with a sketch or screenshot before touching code**. Vocabulary like "tighter", "sharper", "75% higher", "horizontal S" led to worse outcomes in this session. Small blind iterations compound.

### TINA_TOKEN leak in git history
Prior commits (before this session) contain `TINA_TOKEN = "9e5a8d4de..."` and `NEXT_PUBLIC_TINA_CLIENT_ID` in `netlify.toml`. Current file has them removed but history still shows them. **User should rotate via Tina dashboard** — flagged but not resolved.

### Old Hugo files
`config.yaml`, `data/`, `i18n/`, `themes/`, `.hugo_build.lock`, etc. remain in repo. Safe to bulk-delete; Netlify no longer reads them.

### Duplicate folder
`Personal Portfolio/design_handoff_portfolio/` is an untracked exact duplicate of `design_handoff_portfolio/`. Delete at will.

## User preferences (reinforced this session)
- **Brave browser** — never Edge
- **Edit/Write files**, don't paste code into chat (user runs code from files)
- **No emojis** in output
- Commits on external repos use **personal GitHub account** (`ChrisPachulski`, `cjpach@icloud.com`)
- User gets frustrated fast when iterations miss the mark — **checkpoint early, verify visually, don't chain speculative edits**

## Common commands
```bash
# Dev server (hot reload)
cd my_site/v2 && npm run dev        # http://localhost:5173

# Production preview
cd my_site/v2 && npm run build && npm run preview   # http://localhost:4173

# Deploy
git add <files>
git -c user.name="ChrisPachulski" -c user.email="cjpach@icloud.com" commit -m "..."
git push origin master
```

## Open from handoff checklist
- [ ] Add a real favicon (Vite default SVG still in place)
- [ ] Generate `og.png` (1200×630) for social shares
- [ ] Optional: archive/delete old Hugo files
- [ ] Rotate the leaked TINA_TOKEN

## If the user asks to "pick up where we left off"
1. Read this file first
2. Confirm the site still loads at `chrispachulski.netlify.app`
3. Ask what they want to work on before opening files — don't assume based on memory alone
