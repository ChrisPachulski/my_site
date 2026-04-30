import { useEffect, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

const NOW_PLAYING_ITEMS = [
  'S04E08 · Better Call Saul',
  'The Thing (1982)',
  'Cowboy Bebop · Session #22',
  'Blade Runner 2049',
  'Chef\'s Table · Vol. IX',
];

const CHIPS = ['4K', 'HDR', 'DOLBY', 'USENET'];

export default function AtHomeMediaCard({ a, onOpen }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [marqueeIdx, setMarqueeIdx] = useState(0);
  const [progress, setProgress] = useState(0.32);

  useEffect(() => {
    if (reduced || hover) return;
    const id = setInterval(() => {
      setMarqueeIdx((i) => (i + 1) % NOW_PLAYING_ITEMS.length);
    }, 3400);
    return () => clearInterval(id);
  }, [hover, reduced]);

  useEffect(() => {
    if (reduced || hover) return;
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + 0.015;
        return next >= 0.95 ? 0.1 : next;
      });
    }, 600);
    return () => clearInterval(id);
  }, [hover, reduced]);

  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  return (
    <article
      className={`featured-tile featured at-home-media-card${hover ? ' is-hover' : ''}`}
      role="button"
      aria-haspopup="dialog"
      aria-label={`Read: ${a.title}`}
      onClick={open}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      tabIndex={0}
      data-accent-override="amber"
    >
      <div className="flair-bg">
        <div className="vignette" />
      </div>

      <div className="play-overlay" aria-hidden="true">▶</div>

      <div className="badge">HOME THEATER · S01E11</div>
      <div className="cats">{a.cats}</div>
      <h4 className="amh-title" data-text={a.title}>{a.title}</h4>

      <div className="now-playing" aria-hidden="true">
        <span className="np-label">NOW PLAYING</span>
        <span className="np-current">{NOW_PLAYING_ITEMS[marqueeIdx]}</span>
      </div>

      <div className="progress-row" aria-hidden="true">
        <div className="progress-bar"><div className="progress-fill" style={{ transform: `scaleX(${progress})` }} /></div>
        <span className="timecode">
          {Math.floor(progress * 90)}:{String(Math.floor((progress * 90 * 60) % 60)).padStart(2, '0')}
        </span>
      </div>

      <div className="chips">
        {CHIPS.map(c => <span key={c} className="chip">{c}</span>)}
      </div>

      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Play ►</span>
      </div>
    </article>
  );
}
