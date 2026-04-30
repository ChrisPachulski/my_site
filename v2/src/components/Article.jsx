import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAdjacent } from '../lib/blog.js';
import { articlePath } from '../lib/router.js';

function stripLeadingH1(body) {
  return body.replace(/^[\s\n]*#\s+[^\n]+\n+/, '');
}

function ItalicTitle({ title }) {
  const trimmed = title.trim();
  const colonSplit = trimmed.split(/:\s+/);
  if (colonSplit.length >= 2) {
    const [head, ...rest] = colonSplit;
    return (
      <>
        {head}: <em>{rest.join(': ')}</em>
      </>
    );
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= 3) {
    const last = words.pop();
    return (
      <>
        {words.join(' ')}{words.length ? ' ' : ''}<em>{last}</em>
      </>
    );
  }
  const tail = words.slice(-2).join(' ');
  return (
    <>
      {words.slice(0, -2).join(' ')} <em>{tail}</em>
    </>
  );
}

export default function Article({ post, mode = 'page', onNavigate }) {
  const articleRef = useRef(null);
  const adjacent = getAdjacent(post.slug);

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
          <ItalicTitle title={post.title} />
        </h1>
        <div className="article-meta">
          <span className="article-chip mono">{post.date}</span>
          <span className="article-chip mono">{post.read}</span>
          <span className="article-chip mono">{post.cats}</span>
        </div>
      </header>

      <div className="article-content">
        {post.body ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripLeadingH1(post.body)}</ReactMarkdown>
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
