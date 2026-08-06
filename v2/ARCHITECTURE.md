# Architecture

Behavior notes for the module surfaces whose contracts are not recoverable from
their names and signatures. Visual and brand rules live in `DESIGN.md`; audience
and product rules live in `PRODUCT.md`.

## Content pipeline — `src/lib/blog.js`

### `POSTS`

A shallow per-item copy of `CATALOG`, not a reference to it (`blog.js:7`), so
mutating a post object does not write back into `src/lib/catalog.js`.

Array order is whatever `catalog.js` declares; nothing sorts it at runtime
(`blog.js:7`). That order is load-bearing — `getAdjacent` derives prev/next
from array position alone. The order is broadly newest-first but not strictly:
index 12 is `Sep 2025` (`catalog.js:21`) while index 13 is `Mar 2026`
(`catalog.js:22`).

<!-- seed:gap — author: what rule governs catalog order, given it is not strictly reverse-chronological? -->

### `getPost(slug)`

Looks up two keyspaces, not one: the public `slug` first, then `fileSlug` as a
fallback (`blog.js:14`). A URL slug and a filename slug therefore both resolve,
which is what lets prerendered article routes and in-app navigation share one
lookup.

Returns `null` on a miss (`blog.js:14`) — it never throws and never returns
`undefined`.

### `getAdjacent(slug)`

**`prev` and `next` are inverted relative to array index.** `prev` is
`POSTS[i + 1]` and `next` is `POSTS[i - 1]` (`blog.js:20`), so "previous" walks
*up* the array and "next" walks *down* it. Reading the index arithmetic as a
bug is the expected first reaction.

Both ends degrade to `null` rather than wrapping (`blog.js:20`), and an unknown
slug returns `{ prev: null, next: null }` instead of throwing (`blog.js:19`).

### `loadPostBody(slugOrPost)`

Accepts either a slug string or an already-resolved post object (`blog.js:29`).

**Misses are cached as aggressively as hits.** When no markdown module matches
`post.fileSlug`, the empty string is written into the cache before returning
(`blog.js:34`), so a missing file is attempted once per page load and never
retried.

Returns `''` for an unresolvable post (`blog.js:30`) and for a missing module
(`blog.js:35`) — callers get a string in every path, never `null`.

YAML frontmatter is stripped before the body is returned (`blog.js:38`); the
regex requires the fence at position zero (`blog.js:24`), and raw text is passed
through unchanged when it does not match (`blog.js:25`).

Bodies load as separate chunks via `import.meta.glob` (`blog.js:5`), so no
markdown ships until an article is opened.

## Routing — `src/lib/router.js`

### `useRoute()`

**There is no 404 route.** Exactly two routes parse: home, and
`/writing/<slug>` (`router.js:6`, `router.js:9`). Every other pathname —
including an unrecognized top-level path — resolves to home (`router.js:11`),
and a bare `/writing/` with no slug does the same (`router.js:9`). Trailing
slashes are stripped from the slug before matching (`router.js:8`).

`flowMode` is carried in `history.state` rather than the URL (`router.js:33`)
and falls back to `'full'` whenever history state is absent (`router.js:18`) —
including on a cold load or a hard refresh, where the previous mode is lost.

`readState` is server-safe: with no `window` it returns the home route and
`'full'` (`router.js:15`).

`navigate` selects `replaceState` over `pushState` when passed `replace`
(`router.js:32`), which is how a navigation avoids adding a history entry.

## Build scripts — `scripts/render-og.mjs`

### `renderOgCards(posts, outDir)`

Writes one PNG per post into `outDir`, named `<post.slug>.png`
(`render-og.mjs:223`) — the return value is not the output; the files are.
`outDir` is not created by this function.

Cards render at a fixed 1200×630 (`render-og.mjs:218`).

**System fonts are disabled** (`render-og.mjs:221`), so only the fonts loaded by
`loadFonts()` (`render-og.mjs:215`) can render; a glyph outside them will not
fall back to an installed face.

Category strings are truncated to the first two items (`render-og.mjs:211`),
so a three-category post loses its third on the card but not on the page.

<!-- seed:gap — author: why must system fonts be disabled here — reproducibility across machines, or a specific rendering defect? -->
