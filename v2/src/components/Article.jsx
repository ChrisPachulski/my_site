import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAdjacent, loadPostBody } from '../lib/blog.js';
import { articlePath } from '../lib/router.js';

function stripLeadingH1(body) {
  return body.replace(/^[\s\n]*#\s+[^\n]+\n+/, '');
}

// Italic Pivot Rule (DESIGN.md): exactly one operative word per headline is
// italicized and tinted plasma-violet. Each post may declare its `pivot` in
// catalog.js; if absent, fall back to the last word (still one word, never two).
function ItalicTitle({ title, pivot }) {
  const trimmed = title.trim();
  if (pivot) {
    const idx = trimmed.indexOf(pivot);
    if (idx >= 0) {
      return (
        <>
          {trimmed.slice(0, idx)}
          <em>{pivot}</em>
          {trimmed.slice(idx + pivot.length)}
        </>
      );
    }
  }
  const match = trimmed.match(/^(.*\s)?(\S+?)(\W*)$/);
  if (!match) return trimmed;
  const [, lead = '', last, tail = ''] = match;
  return (
    <>
      {lead}<em>{last}</em>{tail}
    </>
  );
}

export default function Article({ post, mode = 'page', onNavigate }) {
  const articleRef = useRef(null);
  const adjacent = getAdjacent(post.slug);
  const [body, setBody] = useState(null); // null = loading, '' = missing

  useEffect(() => {
    let cancelled = false;
    setBody(null);
    loadPostBody(post).then((b) => {
      if (!cancelled) setBody(b);
    });
    return () => {
      cancelled = true;
    };
  }, [post.slug]);

  useEffect(() => {
    if (mode === 'page' && articleRef.current) {
      articleRef.current.focus({ preventScroll: true });
    }
  }, [post.slug, mode]);

  const handleNav = (e, path) => {
    if (!onNavigate) return;
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <article
      ref={articleRef}
      className={`article-doc article-doc--${mode}`}
      tabIndex={-1}
      aria-labelledby="article-title"
    >
      <header className="article-head">
        <a
          href="/#writing"
          className="article-back mono"
          onClick={(e) => handleNav(e, '/#writing')}
        >
          <span className="back-arrow" aria-hidden="true">←</span> writing
        </a>
        <div className="article-eyebrow mono">Field Notes</div>
        <h1 id="article-title" className="article-title">
          <ItalicTitle title={post.title} pivot={post.pivot} />
        </h1>
        <div className="article-meta">
          <span className="article-chip mono">{post.date}</span>
          <span className="article-chip mono">{post.read}</span>
          <span className="article-chip mono">{post.cats}</span>
        </div>
        {post.stamp && (
          <div className="article-stamp" aria-hidden="true">{post.stamp}</div>
        )}
      </header>

      {post.stamp && (
        <aside className="article-addendum" aria-label="Author's note">
          <span className="article-addendum-label mono">// {post.stamp}</span>
          <p>
            <strong>Written on paternity leave.</strong> The second baby arrived, the house
            rearranged itself around a newborn, and newborn time comes in odd margins — a lot of
            small, quiet hours where you're pinned under a sleeping infant with nothing to do but
            think. This is one of a cluster of field notes that came out of those hours. If a pile
            of them landed at once, that's the stamp in the corner explaining itself: I had,
            unusually, the time. Normal service — and normal time-scarcity — resumes shortly.
          </p>
        </aside>
      )}

      <div className="article-content" aria-busy={body === null || undefined}>
        {body === null ? (
          <p className="dim">Loading…</p>
        ) : body ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripLeadingH1(body)}</ReactMarkdown>
        ) : (
          <p className="dim">Article body not found.</p>
        )}
      </div>

      <footer className="article-foot">
        <a
          href="/#writing"
          className="article-foot-back mono"
          onClick={(e) => handleNav(e, '/#writing')}
        >
          <span aria-hidden="true">←</span> all field notes
        </a>
        <div className="article-adjacent">
          {adjacent.prev && (
            <a
              href={articlePath(adjacent.prev.slug)}
              className="article-adj"
              onClick={(e) => handleNav(e, articlePath(adjacent.prev.slug))}
            >
              <span className="article-adj-label mono">Older</span>
              <span className="article-adj-title">{adjacent.prev.title}</span>
            </a>
          )}
          {adjacent.next && (
            <a
              href={articlePath(adjacent.next.slug)}
              className="article-adj article-adj-next"
              onClick={(e) => handleNav(e, articlePath(adjacent.next.slug))}
            >
              <span className="article-adj-label mono">Newer</span>
              <span className="article-adj-title">{adjacent.next.title}</span>
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}
