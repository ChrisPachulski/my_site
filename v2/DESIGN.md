---
name: Chris Pachulski Portfolio
description: A senior economic analyst's portfolio that signals taste, range, and craft — staged as a grimoire and a git log.
colors:
  bg-deep: "oklch(0.10 0.04 280)"
  bg-elev: "oklch(0.16 0.05 280)"
  bg-card: "oklch(0.18 0.07 280)"
  ink-cool: "oklch(0.92 0.04 270)"
  ink-dim: "oklch(0.65 0.08 270)"
  ink-mute: "oklch(0.40 0.07 275)"
  line-quiet: "oklch(0.22 0.06 280)"
  line-bright: "oklch(0.30 0.08 280)"
  plasma-violet: "oklch(0.70 0.26 300)"
  plasma-violet-soft: "oklch(0.70 0.26 300 / 0.22)"
  cryo-blue: "oklch(0.82 0.21 195)"
  cryo-blue-soft: "oklch(0.82 0.21 195 / 0.22)"
  solar-red: "oklch(0.82 0.21 28)"
  solar-red-soft: "oklch(0.68 0.25 28 / 0.22)"
  izzet-sapphire: "oklch(0.72 0.22 250)"
  izzet-fire: "oklch(0.68 0.25 28)"
  chartreuse-spark: "oklch(0.88 0.20 125)"
  success: "oklch(0.72 0.13 150)"
  warn: "oklch(0.72 0.13 65)"
  danger: "oklch(0.68 0.18 25)"
typography:
  display:
    fontFamily: "Orbitron, sans-serif"
    fontSize: "clamp(26px, 3.2vw, 42px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Instrument Serif, Source Serif Pro, Georgia, serif"
    fontSize: "clamp(32px, 4vw, 60px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Instrument Serif, Source Serif Pro, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter Tight, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  none: "0px"
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "8px"
  card: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "80px"
  5xl: "120px"
components:
  button-primary:
    backgroundColor: "{colors.plasma-violet}"
    textColor: "{colors.bg-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "14px 22px"
  button-primary-hover:
    backgroundColor: "{colors.bg-deep}"
    textColor: "{colors.plasma-violet}"
    rounded: "{rounded.none}"
    padding: "14px 22px"
  button-ghost:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.ink-cool}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "14px 22px"
  button-ghost-hover:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.plasma-violet}"
    rounded: "{rounded.none}"
    padding: "14px 22px"
  nav-cta:
    backgroundColor: "transparent"
    textColor: "{colors.ink-cool}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  nav-cta-hover:
    backgroundColor: "{colors.plasma-violet}"
    textColor: "{colors.bg-deep}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  chip:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  chip-accent:
    backgroundColor: "{colors.plasma-violet-soft}"
    textColor: "{colors.plasma-violet}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
  input-field:
    backgroundColor: "{colors.bg-deep}"
    textColor: "{colors.ink-cool}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  input-field-focus:
    backgroundColor: "{colors.bg-deep}"
    textColor: "{colors.ink-cool}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  panel-card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-cool}"
    rounded: "{rounded.md}"
    padding: "28px"
  project-row:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.ink-cool}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
    padding: "20px 28px"
  project-row-expanded:
    backgroundColor: "{colors.bg-elev}"
    textColor: "{colors.plasma-violet}"
    rounded: "{rounded.none}"
    padding: "20px 28px"
---

# Design System: Chris Pachulski Portfolio

## 1. Overview

**Creative North Star: "The Grimoire and the Git Log."**

This is a senior economic analyst's portfolio staged as two registers in one frame: the arcane (Magic: The Gathering, Izzet guild colors, summoning seals, "Legendary Creature, Human Wizard") and the version-controlled (git log resume, commit hashes, DAG flow, hand-coded everything). Every page element answers to one of those two registers, often both. The MTG card in the hero IS the resume. The git-log layout IS the career timeline. The Izzet aura around the About card IS the visual signature for "intellect plus impulse, applied to data."

The system is dark, cool, and wide-spaced. The base layer is a deep aurora-painted purple; content panels float in front, lit from underneath by violet halos that breathe on a 7-second cycle. Surfaces are quiet at rest. Color, glow, and motion arrive on cue, when the user does something to earn them. Nothing performs on its own. Cyberpunk is an undertone, not a costume — the data-attribute is `data-vibe="cyberpunk"`, the display font is Orbitron, the violet accent is electric — but there are no scanlines pretending to be a CRT, no neon green-on-black, no synthwave gradients. The mood is *sorcerer's workshop at 2am*, not Tron.

This system explicitly rejects the category-reflex aesthetic. It is not a Vercel/Linear-clone tech-bro portfolio (centered hero, gradient-text headline, glassmorphism cards, three-feature grid). It is not a recruiter-baiting buzzword surface. It is not a cinematic auto-trailer. It is not a cyberpunk LARP. If a viewer cannot identify whose site this is from a single screenshot, the design has failed.

**Key Characteristics:**
- Dark + cool: deep purple base, cool-white ink, violet primary accent.
- Aurora-layered: continuous color field underneath, translucent panels in front. No hard drop-shadows.
- Editorial typography: Instrument Serif headlines (italic accents on the operative word) over Inter Tight body, with JetBrains Mono carrying every label, hash, and code fragment. Orbitron arrives for cyberpunk-mode display headers.
- Izzet duality: sapphire + fire as a paired signature on the two largest content cards (About = blue-dominant, Skills = red-dominant), with violet as the permanent base hue between them.
- Sharp geometry: cards are flat panels with 0–8px radii. No bevels, no embossment, no glassmorphism in the macOS sense — just translucency + halo.
- Motion is agency-bound: every animation responds to mouse, scroll, click, or focus. The two breathing auras are the only autoplay, and they are deliberately slow and color-only.

## 2. Colors: The Plasma Palette

The palette runs cool by default, with two warm signal flares (Solar Red, Solar Red on the Skills card aura) that exist precisely to show contrast can pierce the violet field when the design needs it.

### Primary
- **Plasma Violet** (`oklch(0.70 0.26 300)`): The site's voice. Used on links, active nav, primary CTA fills, hover borders, the hero card's outer halo, the contact form's focus glow, and as the source of every soft alpha-wash. If a screen has only one accent color, it is this one.

### Secondary
- **Cryo Blue** (`oklch(0.82 0.21 195)`): The cool counterpoint. Used as the cyberpunk-mode `--accent-2`, on the parallax grid layer, on the hero card's secondary glow band, on stat unit suffixes, and on commit-card "current" glow. Reads as "data layer" in the page's metaphor.
- **Solar Red** (`oklch(0.82 0.21 28)`): The fire. Used as the dominant hue on the Skills card's Izzet aura, on the skill-bar-fill leading edge, and on the MTG card mana pip. Reads as "build / impulse / shipping" in the page's metaphor.

### Tertiary
- **Chartreuse Spark** (`oklch(0.88 0.20 125)`): A high-energy accent reserved for two specific roles — the featured-tag chip and the git-flow trace pulse animation on the resume connectors. Used for ≤3% of any screen.
- **Izzet Sapphire** (`oklch(0.72 0.22 250)`) + **Izzet Fire** (`oklch(0.68 0.25 28)`): A paired aura color set, used only on the two large editorial cards (About = sapphire-dominant, Skills = fire-dominant) and on the hero MTG card. These are not generic accent colors — they are the Izzet guild signature and only appear together.

### Neutral
- **Bg Deep** (`oklch(0.10 0.04 280)`): The page background. Tinted toward 280° (deep blue-violet) so it never reads as black.
- **Bg Elev** (`oklch(0.16 0.05 280)`): Hover state for project rows, secondary panel surface, the elevated zone behind cards.
- **Bg Card** (`oklch(0.18 0.07 280)`): The translucent base for every floating panel (commit, project-row, skills-table, contact-form). Always combined with backdrop-filter blur and a `color-mix` alpha (typically 55–60%) so the aurora bleeds through.
- **Ink Cool** (`oklch(0.92 0.04 270)`): Primary text. A cool white tinted toward periwinkle.
- **Ink Dim** (`oklch(0.65 0.08 270)`): Secondary text — body paragraphs, fact-list values, project descriptions.
- **Ink Mute** (`oklch(0.40 0.07 275)`): Tertiary text — labels, hashes, captions, idle states.
- **Line Quiet** (`oklch(0.22 0.06 280)`): Default divider.
- **Line Bright** (`oklch(0.30 0.08 280)`): Strong divider, default border on flat surfaces, idle button border.

### Named Rules

**The One Voice Rule.** Plasma Violet is the page's voice. Every other accent (Cryo Blue, Solar Red, Chartreuse) earns its place by carrying a specific role the violet cannot. Never use two accents of equal weight on the same screen — pick one to lead.

**The Izzet Pair Is Sacred.** Sapphire + Fire only appear together, only on the two large editorial cards and the hero MTG card. Never use sapphire alone, never use fire alone. The pair is the signature; splitting it dissolves it.

**The Tinted-Black Rule.** No `#000`. Every dark surface is tinted toward 280° (deep violet). The page background reads as charcoal-with-aurora, never as void.

## 3. Typography

**Display Font:** Orbitron (with sans-serif fallback). Used only in cyberpunk-mode headers — uppercase, weight 600, letter-spacing tightish.
**Headline / Title Font:** Instrument Serif (with Source Serif Pro, Georgia, serif fallback). The page's primary voice.
**Body Font:** Inter Tight (with system-sans fallback).
**Label / Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo fallback).

**Character.** A serif/sans/mono trio with strict role separation. Serif is for argument (headlines, project titles, commit roles, blog content). Sans is for prose (body paragraphs, lede). Mono is for evidence (hashes, labels, code, stack tags, navigation indices). Orbitron arrives only in cyberpunk mode and only on h2-class headers, signaling "this is a frame, not a document." The trio is the site's tone of voice — playful seriousness, technical confidence, editorial restraint.

### Hierarchy
- **Display** (Orbitron 600, `clamp(26px, 3.2vw, 42px)`, line-height 1.08, uppercase): Cyberpunk-mode section titles. Used in place of the serif headline when `data-vibe="cyberpunk"`. Example: the section h2 inside `.izzet-card` re-renders as Orbitron uppercase.
- **Headline** (Instrument Serif 400, `clamp(32px, 4vw, 60px)`, line-height 1.05, letter-spacing −0.02em): Hero only. Italic span on the operative word (e.g. *data*, *shipping*). Never repeated on the page.
- **Title** (Instrument Serif 400, 22–28px, line-height 1.15, letter-spacing −0.015em): Project rows, commit roles, blog modal h1, feature h3.
- **Body** (Inter Tight 400, 16px, line-height 1.55, max-width 65–75ch via 520–560px container caps): Paragraph prose, hero lede, about copy, project descriptions.
- **Body Small** (Inter Tight 400, 13–15px, line-height 1.5): The `.dim` class. Project metadata, fact-list values, card supporting copy.
- **Label** (JetBrains Mono 500, 11–13px, letter-spacing 0.08em, uppercase): Section labels, tab buttons, form labels, fact-list keys, KPI captions, stack chip text, commit hashes.
- **Caps** (Inter Tight 500, 11px, letter-spacing 0.12em, uppercase): Reserved alternate label style — used sparingly for sub-section badges.

### Named Rules

**The Italic Pivot Rule.** In every serif headline and h2, exactly one word is set in italic and tinted Plasma Violet. That word IS the meaning of the line. *"Turning messy data into decisions worth shipping."* — italic on `data` and `shipping`, the verbs/nouns that carry the claim. Never two italic words. Never zero. The pivot does the work the rest of the line supports.

**The Mono-Carries-Evidence Rule.** Anything that needs to read as machine-recorded — git hashes, file paths, stack tags, schedule cadences, line numbers, indices — is JetBrains Mono. Anything written by a person is sans (body) or serif (headline). The font is the truth-claim.

**The Display Font Is Cyberpunk-Only.** Orbitron only fires under `data-vibe="cyberpunk"`. In light mode or default vibe, headlines stay in Instrument Serif. The display font is a costume the site wears when it's in cyberpunk register, not a baseline.

## 4. Elevation: Aurora Layering

This system does not use drop-shadows in the conventional sense. It uses **aurora layering** — a continuous color field underneath, content panels floating in front, depth communicated through halo glow rather than hard shadow.

The base layer is a fixed-position radial gradient field tinted with violet, magenta, and cyan ellipses. It animates on a 72–95s loop (slow). On top of that, every content panel is a translucent surface using `backdrop-filter: blur(18–22px) saturate(140%)` plus a `color-mix` alpha background — so the aurora visibly bleeds through. Important elements (the two Izzet cards, the hero MTG card) get an additional **breathing halo aura** — a blurred radial gradient that pulses on a 7-second cycle, color only, 1.012–1.035x scale at most. Other elements (commit cards, contact-form on focus) get a contained glow on hover/focus.

There are exactly three drop-shadow uses in the system, all on the literal MTG card (`box-shadow: 0 40px 80px -20px rgba(0,0,0,0.6)` etc.). They exist because that card is meant to read as a physical Magic: The Gathering card lifted off the page. Everywhere else, depth is halo.

### Halo Vocabulary
- **Ambient halo** (`box-shadow: 0 0 60px -20px var(--accent-soft)`): Idle state on hero card and feature card. Soft, always-on, very low intensity.
- **Hover halo** (`box-shadow: 0 0 0 1px var(--accent), 0 0 40px var(--accent-soft)`): Commit cards, project rows, pipe nodes. The 1px ring is the affordance; the 40px wash is the warmth.
- **Focus halo** (`box-shadow: 0 0 0 1px var(--accent), 0 0 56px var(--accent-soft)`): Contact form on `:focus-within`. A larger, longer wash than hover — focus is more committed than hover.
- **Breathing halo** (Izzet cards' `::before` + `::after` with `filter: blur(46px)` and `animation: izzetBreath 7s`): Color-only pulse. Scale stays ≈1.0 with a brief 1.012x hiccup mid-cycle. The page's signature ambient motion.
- **Pulse trace** (git-log connectors, conic-gradient shimmer borders): Used on hover or scroll-in. Reads as "the data is flowing through this."

### Named Rules

**The No-Shadow Rule.** Drop-shadows are forbidden except on the literal MTG card. Depth is communicated through halo glow, backdrop-filter, and translucent layering — never through `box-shadow: 0 4px 12px rgba(0,0,0,...)`. If a panel needs to feel elevated, it floats over the aurora; if it needs to feel pressable, it gets a halo.

**The Breathing Is Color-Only.** The two Izzet auras and the hero MTG aura breathe on a 7-second cycle. The breath is opacity-and-color, almost no scale (max 1.035x). Never animate width, height, padding, or any layout property — only opacity and `transform: scale()` within ±3.5%. Reduced motion freezes the breath entirely.

**The Halo Earns Hover, Not Idle.** Cards have no permanent ring. The 1px accent border arrives on `:hover` or `:focus-within` and disappears when the user moves on. Permanent rings would clutter the aurora; affordance-on-demand keeps the page quiet at rest.

## 5. Components

### Buttons
- **Shape:** Sharp. Cyberpunk mode flattens to 0px radius with an 8px clipped notch on top-left and bottom-right corners (`clip-path: polygon(...)`). Default mode uses 2px radius. Never rounded pills.
- **Primary:** Plasma Violet fill, deep-bg ink, mono-font label, 14×22px padding. Hover swaps to transparent fill with violet ink and violet 1px ring at 32px wash. A `linear-gradient` sweep moves left-to-right across the surface on hover (decorative, 600ms).
- **Ghost:** Bg-elev fill (clipped corners in cyberpunk), ink-cool text, line-bright 1px border. Hover: violet border, violet ink, 28px violet wash.
- **Arrow affordance:** Trailing arrow `→` translates 4px right on hover. Mandatory on every CTA — the arrow is the signal.

### Chips / Tags
- **Style:** No radius (cyberpunk) or 2px (default). Bg-elev fill, mono label, 4×10px padding, line-bright 1px border. Used on project metadata, stack list, featured tag.
- **Accent variant:** Plasma-Violet-Soft fill (alpha-wash), Plasma Violet text, no border. Used on the featured "FEATURED" tag and active tab indicators.

### Cards / Panels (the Aurora pattern)
- **Corner Style:** 4px (commit, skills-table) to 8px (izzet-card). The literal MTG card is 14px (outlier — the only "physical object" in the system).
- **Background:** `color-mix(in oklab, var(--bg-card) 55%, transparent)` plus `backdrop-filter: blur(18–22px) saturate(140%)`. Always translucent. Aurora bleeds through.
- **Border:** `color-mix(in oklab, var(--line-bright) 45%, transparent) 1px solid` at idle. Plasma Violet 1px on hover/focus.
- **Internal padding:** 28–36px on standard cards, `56px clamp(28px, 4vw, 64px)` on izzet-cards (the editorial showpieces).
- **Inset highlight:** `box-shadow: inset 0 1px 0 rgba(255,255,255,0.05)` — a 1px hairline along the top edge that suggests light catching the panel's lip. Always there, always subtle.

### Izzet Cards (signature, only used on About + Skills)
- **Two variants:** `.izzet-blue` (About — sapphire-dominant aura) and `.izzet-red` (Skills — fire-dominant aura).
- **Aura:** Two stacked pseudo-elements (`::before`, `::after`) with linear/radial gradients and `filter: blur(46px)`. Outer band is violet-dominant — the bleed continues into the page's purple aurora so the two palettes never meet abruptly.
- **Breathing:** 7s cycle, offset −3.5s between blue and red so they never peak together.
- **Summoning seal:** A 1px rectangular outline drawn-in via `stroke-dashoffset` over 2.2s when the card scrolls into view. Sapphire on blue, fire on red.
- **Corner filigrees:** Four 14×14px corner brackets that fade in 1.8s after the seal completes.
- **h2 split:** The card's headline uses `izzet-text-left` + `em` (pivot) + `izzet-text-right` spans, with `background-clip: text` carrying the dominant→pivot→counter gradient. Pivot word is always Plasma Violet for the brand-base anchor.

### Inputs
- **Style:** Bg-deep fill, line-bright 1px border, 2px radius (0 in cyberpunk). 12×14px padding.
- **Focus:** Plasma Violet 1px border + Plasma-Violet-Soft 1px outer ring (`box-shadow: 0 0 0 1px var(--accent-soft)`). Never an OS-default focus glow — always our accent.
- **Form-level focus:** When `:focus-within`, the surrounding card gets the full Plasma Violet halo at 56px wash. The whole form lights up, not just the input.

### Navigation
- **Style:** Fixed top nav, full-width, 18×32px padding. `backdrop-filter: blur(22px) saturate(160%)` over a `color-mix(in oklab, var(--bg) 62%, transparent)` background.
- **Brand:** `chris@home` mono lockup with a 8px Plasma Violet pulse-dot to the left. The brand string deliberately stays employer-agnostic; the portfolio is personal property and must read as separate from any current employer (Wizards of the Coast) or prior venture (MTGBAN). Updating it on a job change would also re-tie the surface to a single role, which the page's three-audience IA explicitly resists.
- **Links:** Mono 12px, ink-dim. Active state: ink-cool text + Plasma Violet underline (`scaleX` from 0 to 1 on `transform-origin: left`, 300ms). No leading index numeral. The `git log` editorial frame is already carried by section labels, commit hashes on the resume, and the `// SELECT * FROM` taglines, so the nav stays quiet.
- **Mobile:** Below 780px, all links except the CTA collapse. The CTA stays as the always-present action.

### Project Row (signature: editorial table-row)
- **Layout:** 48-column index, flexible title+description, right-aligned meta tag + chevron.
- **Title:** 22px Instrument Serif, ink-cool. Hover: Plasma Violet (no underline — the row is the interactive surface).
- **Left edge accent:** A 2px-wide Plasma Violet stripe scales `scaleY(0)→scaleY(1)` from the top on hover/expanded, 300ms cubic-bezier ease-out. This is the row's affordance signal.
- **Expanded state:** Bg-elev fill, chevron rotates 90°, two-column detail panel (challenge/approach/stack on the left, metrics grid on the right).

### Git-Log Resume (signature: serpentine commit graph)
- **Cards:** Commit-style cards alternating left/right, 500px max-width, with a left-edge dot indicator outside the card. The current role's dot pulses Plasma Violet at 2.4s.
- **Connectors:** SVG path between every consecutive pair of cards, with three stacked stroke layers (core / mid / outer) that animate a glow-trace via `stroke-dashoffset`. Color: Chartreuse Spark on the core, Chartreuse alpha on the outer wash. The trace fires at 14s intervals, staggered by `--i` index. This is the only place Chartreuse gets full intensity.
- **Mobile:** Connectors hide (`display: none`); commits stack and align left.

### MTG Card (signature: the hero)
- **Frame:** 2.5:3.5 aspect ratio (real Magic: The Gathering proportions), 14px radius, 1px line-bright border, `backdrop-filter`-free since the card is meant to read as an opaque object.
- **Layout:** Title bar (name + mana cost) → art window → type bar (creature type + set symbol) → text box (rules text + flavor) → P/T box. Each block reveals on a staggered 0.10s–2.05s delay sequence on first paint.
- **Cursor tilt:** `perspective(1100px) rotateX(±10°) rotateY(±12°)` based on cursor position relative to card. Reverts on `mouseleave`.
- **Aura:** Two stacked pseudo-elements blurred at 18–40px, animated on `mtgAuraA` (7s color breath) and `mtgRipple` (9s scale ripple). Hover collapses to a static violet glow.
- **Reduced motion:** All animations halt. Card stops tilting, aura stops breathing, ripple stops.

## 6. Do's and Don'ts

### Do:
- **Do** anchor every screen on Plasma Violet as the single voice color. Use Cryo Blue / Solar Red / Chartreuse only for the specific roles named in §2.
- **Do** italicize exactly one word per serif headline and tint it Plasma Violet — the italic word IS the claim.
- **Do** make every animation respond to a user input — mouse, scroll, click, focus. The two breathing halo auras are the only autoplay; both are color-only and slow.
- **Do** respect `prefers-reduced-motion: reduce`. Halt aurora drift, breathing halos, hero card tilt, particle drift, scroll reveals. Reduce all animation durations to 1ms. New components must follow.
- **Do** translucent panels with `backdrop-filter` blur and a `color-mix` alpha background. The aurora is part of the component — let it bleed through.
- **Do** use Instrument Serif for argument, Inter Tight for prose, JetBrains Mono for evidence. Orbitron only in cyberpunk-mode display headers.
- **Do** keep cards flat at rest. Affordance arrives on `:hover` or `:focus-within` as a 1px violet ring + violet wash, not as a permanent border-or-shadow.
- **Do** preserve the Izzet pair (Sapphire + Fire) as a single signature on About + Skills + the hero card only. Never separate them, never extend them.

### Don't:
- **Don't** ship a generic Vercel/Linear-clone tech-bro portfolio: centered hero, gradient-text headline, glassmorphism cards, three-feature grid of identical icons-with-headings, dark-mode-violet-accent template. *(PRODUCT.md anti-reference, propagated.)*
- **Don't** use recruiter-baiting buzzword voice: "passionate," "data-driven storyteller," "unicorn," "I love coffee and impact." LinkedIn-bio voice. Linktree-style one-page reduction. *(PRODUCT.md anti-reference, propagated.)*
- **Don't** ship cinematic autoplay or scroll-jacking: Lottie sequences that play themselves, big effects that perform without user input, trailer energy. Interactivity must respond to input. *(PRODUCT.md anti-reference, propagated.)*
- **Don't** descend into cyberpunk LARP: heavy synthwave gradients, scanlines used as ornament, fake-terminal hero with Matrix rain, neon-on-black gamer aesthetic. Cyberpunk is the undertone, not the costume. *(PRODUCT.md anti-reference, propagated.)*
- **Don't** use `border-left` greater than 1px as a colored stripe on cards or list items. The project-row's 2px violet edge is the only sanctioned use, and it animates on `transform: scaleY` from 0, not as a static stripe.
- **Don't** use `background-clip: text` with a gradient on regular UI text. The Izzet h2-split is the only sanctioned use, and it's tied to the dominant-aura logic. Headlines elsewhere use a single solid color (`var(--ink)` or `var(--accent)` for the italic pivot).
- **Don't** use macOS-style glassmorphism (heavy blur + bright bg + chunky shadow). The system already uses `backdrop-filter` blur structurally; adding white-tinted glass cards on top reads as clutter, not depth.
- **Don't** add hard `box-shadow: 0 4px 12px rgba(0,0,0,...)` drop-shadows. Depth is halo. The only exception is the literal MTG card.
- **Don't** use `#000` or `#fff`. Every dark surface is tinted toward 280° (violet); every cool-white is tinted toward 270°. Never neutral black, never neutral white.
- **Don't** introduce a new accent color "for variety." The palette has roles. New colors dilute the One Voice.
- **Don't** rebuild the hero around a centered profile photo + name + role triad. The MTG card IS the hero. Replacing it with a generic portfolio template is the failure mode this site exists to refuse.
- **Don't** wire MTGBAN stats live. The `$1.2M`, `500+ subs`, `8 yrs` numbers are historical and frozen by design — divestiture compliance, not a placeholder. *(PRODUCT.md design principle 5, propagated.)*
- **Don't** animate `width`, `height`, `padding`, `margin`, or any layout property. Animate `transform`, `opacity`, `filter`, `box-shadow`, and `background-color` only. Layout animations cause jank and reflow.
- **Don't** wrap every component in a card. Most things don't need one. The aurora itself provides the visual frame; cards are reserved for editorial content (About, Skills, project rows, blog modal, contact form, commit history).
