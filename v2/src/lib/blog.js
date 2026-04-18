const modules = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default', eager: true });

const posts = {};
for (const [path, content] of Object.entries(modules)) {
  const file = path.split('/').pop();
  const slug = file.replace(/\.md$/, '');
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  let title = slug;
  let body = content;
  if (m) {
    const frontmatter = m[1];
    body = m[2];
    const t = frontmatter.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
    if (t) title = t[1];
  }
  posts[slug] = { slug, title, body };
}

export function getPost(slug) {
  return posts[slug] || null;
}
