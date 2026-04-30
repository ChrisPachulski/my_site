import { CATALOG } from './catalog.js';


const modules = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default', eager: true });

const bodies = {};
for (const [path, content] of Object.entries(modules)) {
  const file = path.split('/').pop();
  const fileSlug = file.replace(/\.md$/, '');
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  bodies[fileSlug] = m ? m[2] : content;
}

function deriveExcerpt(body) {
  if (!body) return '';
  const stripped = body
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[*_`>#-]+/g, '')
    .trim();
  const para = stripped.split(/\n\s*\n/).find(p => p.trim().length > 80) || stripped;
  const flat = para.replace(/\s+/g, ' ').trim();
  return flat.length > 180 ? flat.slice(0, 177) + '…' : flat;
}

export const POSTS = CATALOG.map(c => ({
  ...c,
  body: bodies[c.fileSlug] || '',
  excerpt: deriveExcerpt(bodies[c.fileSlug]),
}));

const bySlug = new Map(POSTS.map(p => [p.slug, p]));
const byFileSlug = new Map(POSTS.map(p => [p.fileSlug, p]));

export function getPost(slug) {
  return bySlug.get(slug) || byFileSlug.get(slug) || null;
}

export function getAdjacent(slug) {
  const i = POSTS.findIndex(p => p.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: POSTS[i + 1] || null, next: POSTS[i - 1] || null };
}
