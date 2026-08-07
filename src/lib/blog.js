import { CATALOG } from './catalog.js';

// Lazy: each markdown file becomes its own chunk, fetched only when an article
// opens. The homepage and writing list never touch raw bodies.
const modules = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default' });

export const POSTS = CATALOG.map((c) => ({ ...c }));

const bySlug = new Map(POSTS.map((p) => [p.slug, p]));
const byFileSlug = new Map(POSTS.map((p) => [p.fileSlug, p]));
const bodyCache = new Map();

export function getPost(slug) {
  return bySlug.get(slug) || byFileSlug.get(slug) || null;
}

export function getAdjacent(slug) {
  const i = POSTS.findIndex((p) => p.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: POSTS[i + 1] || null, next: POSTS[i - 1] || null };
}

function stripFrontmatter(raw) {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return m ? m[1] : raw;
}

export async function loadPostBody(slugOrPost) {
  const post = typeof slugOrPost === 'string' ? getPost(slugOrPost) : slugOrPost;
  if (!post) return '';
  if (bodyCache.has(post.fileSlug)) return bodyCache.get(post.fileSlug);
  const loader = modules[`../content/blog/${post.fileSlug}.md`];
  if (!loader) {
    bodyCache.set(post.fileSlug, '');
    return '';
  }
  const raw = await loader();
  const body = stripFrontmatter(raw);
  bodyCache.set(post.fileSlug, body);
  return body;
}
