// Regression guard for the whole-project ESLint gate (`npm run lint`, i.e. `eslint .`).
//
// This is a zero-dependency Node test (built-in `node:test` + `node:assert`).
// Run it with:  node --test scripts/lint-gate.test.mjs   (from the v2/ dir)
//
// It locks in the four invariants that keep the gate green so a future edit
// can't silently re-red it:
//   1. The three React-Compiler advisory rules that eslint-plugin-react-hooks 7.x
//      promoted to `error` are pinned back to `warn` for source files. They flag
//      correct, intentional pre-existing animation code (setState inside
//      rAF-driven effects, ref reads for down-tick styling); as errors they broke
//      the gate on code we deliberately keep.
//   2. Vendored skill scripts under `.claude/**` are ignored, so `eslint .` does
//      not sweep third-party code we don't own.
//   3. The unused symbols removed from the hot source files stay removed
//      (CardArt `colors`, Hero `variant`/`heroVariant`, App `HERO_VARIANT`).
//   4. `eslint .` reports ZERO errors across the project — the gate is green.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V2_ROOT = path.resolve(__dirname, '..');

// One ESLint instance, resolved against the real eslint.config.js in v2/.
const eslint = new ESLint({ cwd: V2_ROOT });

// The three rules react-hooks 7.x promoted to `error`. We keep them advisory.
const DOWNGRADED_RULES = [
  'react-hooks/set-state-in-effect',
  'react-hooks/purity',
  'react-hooks/refs',
];

function severityOf(config, ruleId) {
  const entry = config.rules?.[ruleId];
  if (entry == null) return undefined;
  const level = Array.isArray(entry) ? entry[0] : entry;
  // ESLint normalizes to a numeric level: 0 = off, 1 = warn, 2 = error.
  return level;
}

test('React-Compiler rules are advisory (warn), not errors, for source files', async () => {
  const config = await eslint.calculateConfigForFile(
    path.join(V2_ROOT, 'src/App.jsx'),
  );
  for (const ruleId of DOWNGRADED_RULES) {
    const level = severityOf(config, ruleId);
    assert.equal(
      level,
      1,
      `${ruleId} must resolve to warn (1) for src files, got ${JSON.stringify(level)}. ` +
        `Re-promoting it to error would re-red the gate on intentional animation code.`,
    );
  }
});

test('vendored skill scripts under .claude/** are ignored by eslint .', async () => {
  const ignored = await eslint.isPathIgnored(
    path.join(V2_ROOT, '.claude/skills/impeccable/scripts/live-browser.js'),
  );
  assert.equal(
    ignored,
    true,
    '.claude/** must be globally ignored so `eslint .` does not lint vendored scripts.',
  );
});

test('vite build outputs (dist, dist-ssr) are ignored by eslint .', async () => {
  // Both are git-ignored generated dirs. If `npm run build` runs before
  // `npm run lint` (e.g. a CI build-then-lint job), the SSR bundle exists on
  // disk and would otherwise re-red the gate on machine-generated code.
  for (const rel of ['dist/index.html', 'dist-ssr/entry-server.js']) {
    const ignored = await eslint.isPathIgnored(path.join(V2_ROOT, rel));
    assert.equal(
      ignored,
      true,
      `${rel} must be globally ignored so a post-build lint run stays green.`,
    );
  }
});

test('removed unused symbols stay removed from the hot source files', async () => {
  const card = await readFile(
    path.join(V2_ROOT, 'src/components/ghostmatch/Card.jsx'),
    'utf8',
  );
  assert.doesNotMatch(
    card,
    /function CardArt\([^)]*\bcolors\b/,
    'CardArt must not declare an unused `colors` param.',
  );
  assert.doesNotMatch(
    card,
    /<CardArt[^>]*\bcolors=/,
    'CardArt call site must not pass a `colors` prop.',
  );

  const hero = await readFile(
    path.join(V2_ROOT, 'src/components/Hero.jsx'),
    'utf8',
  );
  assert.doesNotMatch(
    hero,
    /\b(?:variant|heroVariant)\b/,
    'Hero.jsx must not reference the removed variant/heroVariant params.',
  );

  const app = await readFile(path.join(V2_ROOT, 'src/App.jsx'), 'utf8');
  assert.doesNotMatch(
    app,
    /\b(?:HERO_VARIANT|heroVariant)\b/,
    'App.jsx must not reference the removed HERO_VARIANT const / heroVariant prop.',
  );
});

test('`eslint .` reports zero errors across the whole project (gate is green)', async () => {
  const results = await eslint.lintFiles(['.']);
  const errorCount = results.reduce((n, r) => n + r.errorCount, 0);
  if (errorCount > 0) {
    const detail = results
      .filter((r) => r.errorCount > 0)
      .flatMap((r) =>
        r.messages
          .filter((m) => m.severity === 2)
          .map(
            (m) =>
              `${path.relative(V2_ROOT, r.filePath)}:${m.line} ${m.ruleId ?? 'core'} — ${m.message}`,
          ),
      )
      .join('\n');
    assert.fail(`Expected 0 lint errors, found ${errorCount}:\n${detail}`);
  }
  assert.equal(errorCount, 0);
});
