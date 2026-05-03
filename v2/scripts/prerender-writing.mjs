import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { CATALOG } from '../src/lib/catalog.js';
import { renderOgCards } from './render-og.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');
const CONTENT    = path.join(ROOT, 'src', 'content', 'blog');

const SITE_URL = 'https://chrispachulski.com';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s = '') {
  return escapeHtml(s).replace(/\n/g, ' ');
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: raw };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    fm[kv[1]] = v;
  }
  return { frontmatter: fm, body: m[2] };
}

function deriveExcerpt(body) {
  if (!body) return '';
  const stripped = body
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[*_`>#]+/g, '')
    .trim();
  const para = stripped.split(/\n\s*\n/).find(p => p.trim().length > 80) || stripped;
  const flat = para.replace(/\s+/g, ' ').trim();
  return flat.length > 180 ? flat.slice(0, 177) + '…' : flat;
}

function dateToISO(s) {
  // "Mar 2024" -> "2024-03-15"; gracefully default to first of month.
  const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
  const m = String(s).match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return new Date().toISOString().slice(0, 10);
  return `${m[2]}-${months[m[1]] || '01'}-15`;
}

function italicTitle(title) {
  // Mirror Article.jsx ItalicTitle. Italicize the segment after the first
  // colon when present; otherwise the last 1–2 words.
  const colonSplit = title.split(/:\s+/);
  if (colonSplit.length >= 2) {
    const head = escapeHtml(colonSplit[0]);
    const tail = escapeHtml(colonSplit.slice(1).join(': '));
    return `${head}: <em>${tail}</em>`;
  }
  const words = title.split(/\s+/);
  if (words.length <= 3) {
    const last = words.pop();
    return `${escapeHtml(words.join(' '))}${words.length ? ' ' : ''}<em>${escapeHtml(last)}</em>`;
  }
  const tail = words.slice(-2).join(' ');
  return `${escapeHtml(words.slice(0, -2).join(' '))} <em>${escapeHtml(tail)}</em>`;
}

function articleHtml(post, bodyHtml) {
  const i = CATALOG.findIndex(p => p.slug === post.slug);
  const prev = CATALOG[i + 1];
  const next = CATALOG[i - 1];
  const adjacent = `
    <div class="article-adjacent">
      ${prev ? `<a href="/writing/${prev.slug}" class="article-adj"><span class="article-adj-label mono">Older</span><span class="article-adj-title">${escapeHtml(prev.title)}</span></a>` : ''}
      ${next ? `<a href="/writing/${next.slug}" class="article-adj article-adj-next"><span class="article-adj-label mono">Newer</span><span class="article-adj-title">${escapeHtml(next.title)}</span></a>` : ''}
    </div>`;
  return `
<main class="article-shell" data-screen-label="Field Notes">
  <article class="article-doc article-doc--page">
    <header class="article-head">
      <a href="/#writing" class="article-back mono"><span class="back-arrow" aria-hidden="true">←</span> writing</a>
      <div class="article-eyebrow mono">Field Notes</div>
      <h1 id="article-title" class="article-title">${italicTitle(post.title)}</h1>
      <div class="article-meta">
        <span class="article-chip mono">${escapeHtml(post.date)}</span>
        <span class="article-chip mono">${escapeHtml(post.read)}</span>
        <span class="article-chip mono">${escapeHtml(post.cats)}</span>
      </div>
    </header>
    <div class="article-content">${bodyHtml}</div>
    <footer class="article-foot">
      <a href="/#writing" class="article-foot-back mono"><span aria-hidden="true">←</span> all field notes</a>
      ${adjacent}
    </footer>
  </article>
</main>`;
}

function homePageHtml(posts) {
  // Static SEO body for the homepage. React's createRoot().render() replaces
  // #root children on mount, so users never see this — but Googlebot reads
  // it as the initial HTML response, which is what fixes "empty SPA shell"
  // indexing. Copy mirrors what the live React UI shows; no cloaking.
  const writingItems = posts.map(p =>
    `<li><a href="/writing/${p.slug}">${escapeHtml(p.title)}</a> <span class="prerender-meta">${escapeHtml(p.date)} · ${escapeHtml(p.read)} · ${escapeHtml(p.cats)}</span></li>`
  ).join('\n        ');

  return `
<main class="prerender-home" data-prerender="home">
  <header class="prerender-hero">
    <p class="prerender-eyebrow">Senior Economic Analyst · Wizards of the Coast</p>
    <h1>Chris Pachulski</h1>
    <p class="prerender-lede">
      I'm Chris Pachulski. I turned a hobby into a career: co-founded MTGBAN,
      a Magic: The Gathering arbitrage engine that grew to 500+ subscribers,
      while spending 7+ years shipping analytics pipelines across five industries
      for Ad.Net, Mozilla, SPINS, and Providencia. Now I'm a Senior Economic Analyst
      at Wizards of the Coast, working on the game I built a business around.
    </p>
    <p class="prerender-links">
      <a href="mailto:pachun95@gmail.com">pachun95@gmail.com</a> ·
      <a href="https://github.com/ChrisPachulski" rel="me">GitHub</a> ·
      <a href="https://www.linkedin.com/in/chris-pachulski/" rel="me">LinkedIn</a>
    </p>
  </header>
  <section id="portfolio-static">
    <h2>Case studies</h2>
    <p>A curated list of the work I'd show you over coffee — analytics platforms,
    revenue models, and the data systems behind them.</p>
  </section>
  <section id="resume-static">
    <h2>Seven years of shipping</h2>
    <p>Analytics, BI, and data engineering across ad-tech, consumer, gaming,
    and CPG: Ad.Net, Mozilla, SPINS, Providencia, and Wizards of the Coast.
    Python, SQL, R, BigQuery, dbt, Airflow.</p>
  </section>
  <section id="writing-static">
    <h2>Field notes from the warehouse</h2>
    <p>${posts.length} posts on Python, R, SQL, BigQuery, Claude Code, and
    applied analytics.</p>
    <ul class="prerender-writing-list">
        ${writingItems}
    </ul>
  </section>
  <section id="contact-static">
    <h2>Let's go.</h2>
    <p>Hiring for analytics, BI, or data-engineering work? Need help designing a
    warehouse from scratch, or rescuing one that's on fire? I answer every
    genuine email at <a href="mailto:pachun95@gmail.com">pachun95@gmail.com</a>.</p>
  </section>
</main>`;
}

function notFoundHtml(featured) {
  const rows = featured.map(p => `
    <a href="/writing/${p.slug}" class="notfound-row">
      <span class="notfound-meta mono">${escapeHtml(p.date)} · ${escapeHtml(p.read)}</span>
      <span class="notfound-title">${escapeHtml(p.title)}</span>
      <span class="notfound-arrow" aria-hidden="true">→</span>
    </a>`).join('');
  return `
<main class="article-shell" data-screen-label="Not Found">
  <article class="article-doc article-doc--page article-doc--notfound">
    <header class="article-head">
      <a href="/#writing" class="article-back mono"><span class="back-arrow" aria-hidden="true">←</span> writing</a>
      <div class="article-eyebrow mono">404</div>
      <h1 class="article-title">No such <em>field note.</em></h1>
      <p class="article-lede dim">Either it moved, the slug got rewritten, or it never existed in the first place. Try one of these instead.</p>
    </header>
    <div class="notfound-suggest">${rows}</div>
  </article>
</main>`;
}

function injectMeta(template, meta) {
  // Replace head meta + title; rewrite/insert canonical, og:url, og:title,
  // og:description, og:image, og:type, twitter:title, twitter:description,
  // twitter:image. Inject Article JSON-LD before </head>.
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = html.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeAttr(meta.description)}" />`);

  const replaceOrInsert = (re, replacement) => {
    if (re.test(html)) {
      html = html.replace(re, replacement);
    } else {
      html = html.replace('</head>', `    ${replacement}\n  </head>`);
    }
  };

  replaceOrInsert(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${escapeAttr(meta.url)}" />`);
  replaceOrInsert(/<meta\s+property="og:type"[^>]*>/i,        `<meta property="og:type" content="article" />`);
  replaceOrInsert(/<meta\s+property="og:title"[^>]*>/i,       `<meta property="og:title" content="${escapeAttr(meta.title)}" />`);
  replaceOrInsert(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeAttr(meta.description)}" />`);
  replaceOrInsert(/<meta\s+property="og:url"[^>]*>/i,         `<meta property="og:url" content="${escapeAttr(meta.url)}" />`);
  replaceOrInsert(/<meta\s+property="og:image"[^>]*>/i,       `<meta property="og:image" content="${escapeAttr(meta.image)}" />`);
  replaceOrInsert(/<meta\s+property="og:image:width"[^>]*>/i, `<meta property="og:image:width" content="1200" />`);
  replaceOrInsert(/<meta\s+property="og:image:height"[^>]*>/i,`<meta property="og:image:height" content="630" />`);
  replaceOrInsert(/<meta\s+property="og:image:alt"[^>]*>/i,   `<meta property="og:image:alt" content="${escapeAttr(meta.title)}" />`);

  replaceOrInsert(/<meta\s+name="twitter:title"[^>]*>/i,       `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`);
  replaceOrInsert(/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`);
  replaceOrInsert(/<meta\s+name="twitter:image"[^>]*>/i,       `<meta name="twitter:image" content="${escapeAttr(meta.image)}" />`);

  if (meta.jsonLd) {
    // Replace existing Person JSON-LD with article JSON-LD.
    const ldRe = /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/;
    const articleLd = `<script type="application/ld+json">\n${JSON.stringify(meta.jsonLd, null, 2)}\n</script>`;
    if (ldRe.test(html)) html = html.replace(ldRe, articleLd);
    else html = html.replace('</head>', `    ${articleLd}\n  </head>`);
  }

  return html;
}

function injectRoot(template, innerHtml) {
  return template.replace(/<div\s+id="root"><\/div>/, `<div id="root">${innerHtml}</div>`);
}

function buildSitemap(slugs) {
  const urls = [
    `<url><loc>${SITE_URL}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
    ...slugs.map(s =>
      `<url><loc>${SITE_URL}/writing/${s.slug}</loc><lastmod>${dateToISO(s.date)}</lastmod><changefreq>yearly</changefreq><priority>0.7</priority></url>`
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

async function loadPosts() {
  const out = [];
  for (const c of CATALOG) {
    const file = path.join(CONTENT, `${c.fileSlug}.md`);
    let raw = '';
    try {
      raw = await fs.readFile(file, 'utf8');
    } catch (err) {
      console.warn(`[prerender] missing markdown for ${c.fileSlug}, skipping`);
      continue;
    }
    const { frontmatter, body } = parseFrontmatter(raw);
    out.push({
      ...c,
      excerpt: frontmatter.excerpt || deriveExcerpt(body),
      body,
    });
  }
  return out;
}

async function writeFileEnsured(filepath, contents) {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, contents);
}

export function writingPrerender() {
  return {
    name: 'writing-prerender',
    apply: 'build',
    async closeBundle() {
      const dist = path.resolve(ROOT, 'dist');
      const indexPath = path.join(dist, 'index.html');
      let template;
      try {
        template = await fs.readFile(indexPath, 'utf8');
      } catch (err) {
        console.error('[prerender] dist/index.html not found; skipping');
        return;
      }

      const posts = await loadPosts();

      // OG cards first — written to dist/og/<slug>.png
      const ogDir = path.join(dist, 'og');
      await fs.mkdir(ogDir, { recursive: true });
      try {
        await renderOgCards(posts.map(p => ({ slug: p.slug, title: p.title, date: p.date, read: p.read, cats: p.cats })), ogDir);
        console.log(`[prerender] wrote ${posts.length} OG cards to dist/og/`);
      } catch (err) {
        console.warn(`[prerender] OG card generation failed: ${err.message}`);
      }

      // Per-post HTML
      for (const post of posts) {
        const url = `${SITE_URL}/writing/${post.slug}`;
        const description = post.excerpt;
        const ogImage = `${SITE_URL}/og/${post.slug}.png`;

        const meta = {
          title: `${post.title} — Chris Pachulski`,
          description,
          url,
          image: ogImage,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description,
            url,
            datePublished: dateToISO(post.date),
            image: ogImage,
            author: {
              '@type': 'Person',
              name: 'Chris Pachulski',
              url: SITE_URL,
            },
            publisher: {
              '@type': 'Person',
              name: 'Chris Pachulski',
              url: SITE_URL,
            },
            mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          },
        };

        const bodySource = post.body.replace(/^[\s\n]*#\s+[^\n]+\n+/, '');
        const bodyHtml = marked.parse(bodySource, { mangle: false, headerIds: false });
        const inner = articleHtml(post, bodyHtml);
        const html = injectRoot(injectMeta(template, meta), inner);
        await writeFileEnsured(path.join(dist, 'writing', post.slug, 'index.html'), html);
      }

      // 404 page
      const featured = posts.slice(0, 3);
      const nfMeta = {
        title: 'No such field note — Chris Pachulski',
        description: 'That writing slug does not match any published field note.',
        url: `${SITE_URL}/writing/_not-found/`,
        image: `${SITE_URL}/hero-portrait.jpg`,
        jsonLd: null,
      };
      const nfHtml = injectRoot(injectMeta(template, nfMeta), notFoundHtml(featured));
      await writeFileEnsured(path.join(dist, 'writing', '_not-found', 'index.html'), nfHtml);

      // Sitemap
      await fs.writeFile(path.join(dist, 'sitemap.xml'), buildSitemap(posts));

      // Homepage: rewrite dist/index.html with real body content inside #root
      // so the initial HTML response is no longer an empty SPA shell. Must run
      // last — earlier steps use the unmodified template captured above.
      const homeHtml = injectRoot(template, homePageHtml(posts));
      await fs.writeFile(indexPath, homeHtml);

      console.log(`[prerender] wrote ${posts.length} article pages + 404 + sitemap + home`);
    },
  };
}
