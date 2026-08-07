import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import wawoff from 'wawoff2';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const FONT_CACHE = path.join(ROOT, 'node_modules', '.og-font-cache');

// Decompress @fontsource woff2 → TTF in memory. wawoff2 is a tiny WASM
// decompressor; the result is cached on disk to avoid re-decoding per build.
const FONT_SOURCES = [
  {
    name: 'Instrument Serif', weight: 400, style: 'normal',
    woff2: '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
  },
  {
    name: 'Instrument Serif', weight: 400, style: 'italic',
    woff2: '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2',
  },
  {
    name: 'JetBrains Mono', weight: 500, style: 'normal',
    woff2: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
  },
];

async function loadFonts() {
  await fs.mkdir(FONT_CACHE, { recursive: true });
  const fonts = [];
  for (const src of FONT_SOURCES) {
    const cacheName = `${src.name.replace(/\s+/g, '_')}_${src.weight}_${src.style}.ttf`;
    const cachePath = path.join(FONT_CACHE, cacheName);
    let data;
    try {
      data = await fs.readFile(cachePath);
    } catch {
      const woff2Path = require.resolve(src.woff2);
      const woff2Buf = await fs.readFile(woff2Path);
      const ttfBytes = await wawoff.decompress(new Uint8Array(woff2Buf));
      data = Buffer.from(ttfBytes);
      await fs.writeFile(cachePath, data);
    }
    fonts.push({ name: src.name, data, weight: src.weight, style: src.style });
  }
  return fonts;
}

function div(props, ...children) {
  const flat = children.flat().filter(c => c != null);
  const out = { ...props };
  if (flat.length === 1) out.children = flat[0];
  else if (flat.length > 1) out.children = flat;
  return { type: 'div', props: out };
}
function span(props, child) {
  return { type: 'span', props: { ...props, children: child } };
}

// satori has a limited CSS subset and does not support oklch(). The runtime
// site uses oklch tokens; we mirror them here as hex approximations.
const C = {
  bgDeep:        '#11102a',
  bgAccentDeep:  '#3f1869', // deep violet bloom for radial bg
  bgBlueDeep:    '#172855', // cool counterpoint bloom
  inkCool:       '#e3e0f0',
  inkBright:     '#ebe8f5',
  inkDim:        '#8e8ab2',
  inkMute:       '#6e6a90',
  lineSoft:      '#3a3760',
  lineMid:       '#555478',
  plasmaViolet:  '#b85ef0',
  plasmaSoft:    '#c685ec',
};

function italicTitleNodes(title) {
  const colon = title.split(/:\s+/);
  if (colon.length >= 2) {
    return [
      `${colon[0]}: `,
      span({ style: { fontStyle: 'italic', color: C.plasmaSoft } }, colon.slice(1).join(': ')),
    ];
  }
  const words = title.split(/\s+/);
  if (words.length <= 3) {
    const last = words.pop();
    return [
      `${words.join(' ')}${words.length ? ' ' : ''}`,
      span({ style: { fontStyle: 'italic', color: C.plasmaSoft } }, last),
    ];
  }
  const tail = words.slice(-2).join(' ');
  return [
    `${words.slice(0, -2).join(' ')} `,
    span({ style: { fontStyle: 'italic', color: C.plasmaSoft } }, tail),
  ];
}

function ogCardTree({ title, date, read, cats }) {
  return div(
    {
      style: {
        width: '1200px', height: '630px',
        display: 'flex', flexDirection: 'column',
        padding: '72px 80px',
        background:
          `radial-gradient(ellipse 90% 70% at 18% 28%, ${C.bgAccentDeep} 0%, ${C.bgDeep} 65%), ` +
          `radial-gradient(ellipse 60% 50% at 88% 90%, ${C.bgBlueDeep} 0%, transparent 60%), ` +
          C.bgDeep,
        color: C.inkCool,
        fontFamily: 'Instrument Serif',
        position: 'relative',
      },
    },
    div({ style: {
      position: 'absolute', top: '36px', left: '36px',
      width: '28px', height: '28px',
      borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: C.lineMid,
      borderLeftWidth: '1px', borderLeftStyle: 'solid', borderLeftColor: C.lineMid,
    } }),
    div({ style: {
      position: 'absolute', top: '36px', right: '36px',
      width: '28px', height: '28px',
      borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: C.lineMid,
      borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: C.lineMid,
    } }),
    div({ style: {
      position: 'absolute', bottom: '36px', left: '36px',
      width: '28px', height: '28px',
      borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: C.lineMid,
      borderLeftWidth: '1px', borderLeftStyle: 'solid', borderLeftColor: C.lineMid,
    } }),
    div({ style: {
      position: 'absolute', bottom: '36px', right: '36px',
      width: '28px', height: '28px',
      borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: C.lineMid,
      borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: C.lineMid,
    } }),

    div(
      {
        style: {
          display: 'flex', alignItems: 'center', gap: '20px',
          fontFamily: 'JetBrains Mono', fontSize: '20px',
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: C.inkMute,
          marginBottom: '36px',
        },
      },
      'FIELD NOTES',
      div({ style: { width: '60px', height: '1px', background: C.lineMid } }),
    ),

    div(
      {
        style: {
          fontSize: title.length > 64 ? '54px' : '64px',
          lineHeight: 1.04,
          letterSpacing: '-0.02em',
          color: C.inkBright,
          marginBottom: 'auto',
          maxWidth: '1000px',
          display: 'flex',
          flexWrap: 'wrap',
          whiteSpace: 'pre-wrap',
        },
      },
      ...italicTitleNodes(title),
    ),

    div(
      {
        style: {
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          width: '100%',
          fontFamily: 'JetBrains Mono', fontSize: '22px',
          letterSpacing: '0.06em',
          color: C.inkDim,
          whiteSpace: 'nowrap',
        },
      },
      div(
        { style: { display: 'flex', gap: '14px', whiteSpace: 'nowrap' } },
        date,
        span({ style: { color: C.inkMute } }, '·'),
        read,
        span({ style: { color: C.inkMute } }, '·'),
        span({ style: { color: C.inkMute } }, truncateCats(cats)),
      ),
      div(
        { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        'chris@wizards',
        div({ style: {
          width: '8px', height: '8px', borderRadius: '50%',
          background: C.plasmaViolet,
        } }),
      ),
    ),
  );
}

function truncateCats(cats) {
  // The on-page cats string can be three items ("R · MTG · ClickHouse"). On
  // 1200×630 OG cards alongside date + read-time + lockup, two is plenty.
  const parts = cats.split(/\s*·\s*/).filter(Boolean);
  return parts.slice(0, 2).join(' · ');
}

export async function renderOgCards(posts, outDir) {
  const fonts = await loadFonts();
  for (const post of posts) {
    const tree = ogCardTree(post);
    const svg = await satori(tree, { width: 1200, height: 630, fonts });
    const png = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
      font: { loadSystemFonts: false },
    }).render().asPng();
    await fs.writeFile(path.join(outDir, `${post.slug}.png`), png);
  }
}
