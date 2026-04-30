# Product

## Register

brand

## Users

Three audiences arrive here roughly equally — and the design has to land all three without picking a favorite.

1. **Hiring managers and data leads at top-tier orgs.** Reading peer-to-peer, looking for a Senior Data Scientist / Analytics Engineer who has actually shipped at scale. They scan the resume git-log, click case studies for evidence, and judge taste from the way the page is built.
2. **Consulting and mentoring prospects.** Founders and ops leaders with a warehouse on fire or a reporting layer that won't compose. They look for the "available" line, scan the case studies for proof of repair work, and want a low-friction way to start a conversation.
3. **Technical peers and the open-source community.** Builders who landed here from a blog post or a GitHub repo. They want the writing, the code, and the metaphors that actually hold (MTG, git, cyberpunk) to be load-bearing, not decorative.

The job-to-be-done is the same across all three: *decide whether this person is worth a conversation in the next 90 seconds.* No one is reading the whole page. The hero card, the case-study list, the resume git-log, and the warehouse-on-fire copywriting all need to do that job alone, in any order.

## Product Purpose

A senior data scientist's portfolio that signals taste, range, and craft simultaneously, without resorting to the templates the category collapses to (centered hero, gradient text, three-feature grid).

It exists to start three kinds of conversations: hiring, consulting, and peer collaboration. It succeeds when readers in any of those three audiences walk away with a specific sentence they can repeat about Chris Pachulski: *"the MTG arbitrage guy who works at Wizards now," "the analytics engineer who builds his own Python platforms," "the writer who actually ships what he writes about."*

The MTG/Magic frame, the git-log resume, the Izzet card metaphor, and the cyberpunk theme aren't decoration. They are the differentiation strategy. They prove the same thing the case studies prove: this person commits to a take, makes it hold under load, and has the technical chops to execute it. Strip them and you get another portfolio template.

## Brand Personality

**Senior, playful, hand-built.**

- **Senior.** Speaks peer-to-peer with hiring managers and CTOs. No "passionate," no "I love impact." Confidence sounds like terse claims with numbers attached, not adjectives.
- **Playful.** The MTG card hero. The "Legendary Creature, Human Wizard" type line. The "git log of the work" resume framing. The "Built by hand, no frameworks harmed" footer. The metaphors are committed-to, not tossed in. Playfulness is restraint that lets a single weird choice carry the whole vibe.
- **Hand-built.** No frameworks for chrome's sake. Custom SVG git connectors, hand-coded particles, scroll-reveal system, Izzet-card aura. Craft is visible in the source, and the source is part of the product.

Voice samples that should sound on-brand: *"A warehouse on fire, a dashboard to rescue, a coffee chat..."* · *"git log --oneline --graph career"* · *"hire me, mentor me, or just chat MTG, same mailbox."* · *"Built by hand, no frameworks harmed."*

## Anti-references

What this should explicitly NOT look or feel like. These stay verbatim in DESIGN.md's Don'ts.

- **Generic Vercel/Linear-clone tech-bro portfolio.** Centered hero, gradient-text headline, glassmorphism cards, three-feature grid of identical icons-with-headings, dark-mode-violet-accent template. The category-reflex aesthetic. If a viewer can't tell whose site this is from a screenshot, the design failed.
- **Recruiter-baiting buzzword soup.** "Passionate." "Data-driven storyteller." "Unicorn." "I love coffee and impact." LinkedIn-bio voice. Linktree-style one-page-bio reduction. The site's voice is peer-to-peer, not job-board-applicant-to-recruiter.
- **Cinematic autoplay / scroll-jacking.** Lottie sequences that play themselves, big effects that perform without user input, trailer energy instead of engagement. Interactive features must respond to mouse, scroll, or keyboard input. They earn their motion by being agency-bound.
- **Cyberpunk LARP.** Heavy synthwave gradients, scanlines, fake-terminal hero with Matrix rain, neon-on-black gamer aesthetic. The cyberpunk vibe is a cool-mature undertone (the data-attribute, the Orbitron display font, the violet accent), not a Tron costume.

## Design Principles

1. **Commit to the metaphor.** MTG, git, cyberpunk, Izzet color identity. These aren't garnish. The whole page reads as "what would this look like if a Senior Data Scientist who cares about MTG actually built their portfolio?" Don't water them down. A single committed metaphor beats five hedged ones.

2. **Show, don't tell.** The hand-built site is the proof-of-craft. The git-log resume is the proof-of-history. The case studies' challenge/solution/numbers are the proof-of-impact. Every claim has visible evidence within one scroll.

3. **Agency over autoplay.** Interactive features need user input AND response, not scripted cinematics. The cursor-tracking MTG-card tilt, the parallax aurora, the Izzet aura on hover, the project-row expand-on-click. All of these reward action. A trailer isn't engagement.

4. **Practice what you preach.** A data person's portfolio should be data-shaped. Performance, accessibility (reduced-motion respected throughout), responsive behavior, and crawler-readability are not optional polish, they ARE the work sample.

5. **MTGBAN history, not MTGBAN live wire.** The MTGBAN era is a load-bearing piece of the story (8 years, $1.2M, 500+ subs) and stays as historical-stat showpieces. Stats stay frozen, never live-wire, never link out to active feeds. Compliance line drawn from divestiture.

## Accessibility & Inclusion

- **WCAG AA color contrast** across both dark (default) and light themes for body text and interactive elements.
- **Reduced motion is a first-class state, not a fallback.** Every animation in the codebase respects `prefers-reduced-motion: reduce`: aurora layers freeze, scroll-reveals pop in instantly, the MTG card stops tilting, particles disappear, animation durations clamp to 1ms. New components must follow the same pattern.
- **Keyboard navigation.** Article cards are focusable, blog modal closes on Escape, focus order follows visual order, focus rings are visible (not just removed).
- **Screen-reader semantics.** SVG flourishes carry `aria-hidden="true"`. Decorative spans (Izzet corners, particle field, mana symbols, set symbol) don't enter the accessibility tree. The MTG card has a meaningful `role="img"` + `aria-label` so its content is summarized.
- **Color is never the sole signal.** Skill rows have numeric depth values, the active-nav indicator pairs with an underline (not just color), the project-row expand state pairs chevron + class change.
