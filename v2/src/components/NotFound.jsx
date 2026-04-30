import { POSTS } from '../lib/blog.js';
import { articlePath } from '../lib/router.js';

export default function NotFound({ onNavigate }) {
  const featured = POSTS.slice(0, 3);
  const handle = (e, path) => {
    if (!onNavigate) return;
    e.preventDefault();
    onNavigate(path);
  };
  return (
    <article className="article-doc article-doc--notfound" tabIndex={-1}>
      <header className="article-head">
        <a
          href="/#writing"
          className="article-back mono"
          onClick={(e) => handle(e, '/#writing')}
        >
          <span className="back-arrow" aria-hidden="true">←</span> writing
        </a>
        <div className="article-eyebrow mono">404</div>
        <h1 className="article-title">
          No such <em>field note.</em>
        </h1>
        <p className="article-lede dim">
          Either it moved, the slug got rewritten, or it never existed in the first place.
          Try one of these instead.
        </p>
      </header>
      <div className="notfound-suggest">
        {featured.map(p => (
          <a
            key={p.slug}
            href={articlePath(p.slug)}
            className="notfound-row"
            onClick={(e) => handle(e, articlePath(p.slug))}
          >
            <span className="notfound-meta mono">{p.date} · {p.read}</span>
            <span className="notfound-title">{p.title}</span>
            <span className="notfound-arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </div>
    </article>
  );
}
