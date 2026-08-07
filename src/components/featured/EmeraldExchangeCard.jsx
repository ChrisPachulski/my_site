import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

const VB_W = 240;
const VB_H = 200;

// Tentacles drawn as SVG paths with pathLength=1, so the
// stroke-dasharray/offset reveal can express timing in unit fractions
// without measuring per-path length at runtime.
const BACK_TENTACLES = [
  { d: 'M 95 95 C 60 80, 38 58, 20 38',         delay: 0.00 },
  { d: 'M 145 95 C 180 80, 202 58, 220 38',     delay: 0.10 },
  { d: 'M 110 125 C 105 150, 92 168, 86 192',   delay: 0.20 },
  { d: 'M 130 125 C 135 150, 148 168, 154 192', delay: 0.30 },
];

const FRONT_TENTACLES = [
  { d: 'M 100 100 C 78 102, 56 124, 32 158',  delay: 0.45 },
  { d: 'M 140 100 C 162 102, 184 124, 208 158', delay: 0.55 },
  { d: 'M 105 80 C 92 56, 100 30, 82 12',      delay: 0.65 },
  { d: 'M 135 80 C 148 56, 140 30, 158 12',    delay: 0.75 },
];

// Hexagonal cut, faceted like the favicon gem.
const GEM_OUTLINE = 'M 120 68 L 148 88 L 140 128 L 100 128 L 92 88 Z';
const GEM_FACETS = [
  'M 92 88 L 148 88',
  'M 120 68 L 120 128',
  'M 92 88 L 120 128',
  'M 148 88 L 120 128',
];

export default function EmeraldExchangeCard({ a, onOpen }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [inView, setInView] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;
    if (reduced) { setInView(true); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.35 });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, [reduced]);

  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  return (
    <article
      ref={cardRef}
      className={
        'featured-tile featured emerald-exchange-card'
        + (inView ? ' in-view' : '')
        + (hover ? ' is-hover' : '')
      }
      role="button"
      aria-haspopup="dialog"
      aria-label={`Read: ${a.title}`}
      onClick={open}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      tabIndex={0}
    >
      <div className="flair-bg">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          className="kraken-svg"
        >
          {BACK_TENTACLES.map((t, i) => (
            <path
              key={`back-${i}`}
              d={t.d}
              className="kraken-tentacle kraken-tentacle--back"
              pathLength="1"
              style={{ '--delay': `${t.delay}s` }}
            />
          ))}

          <ellipse cx="120" cy="108" rx="36" ry="22" className="kraken-body" />

          <path d={GEM_OUTLINE} className="kraken-gem-fill" />
          <path d={GEM_OUTLINE} className="kraken-gem-stroke" pathLength="1" />
          {GEM_FACETS.map((d, i) => (
            <path
              key={`facet-${i}`}
              d={d}
              className="kraken-gem-facet"
              pathLength="1"
              style={{ '--delay': `${0.40 + i * 0.05}s` }}
            />
          ))}

          {FRONT_TENTACLES.map((t, i) => (
            <path
              key={`front-${i}`}
              d={t.d}
              className="kraken-tentacle kraken-tentacle--front"
              pathLength="1"
              style={{ '--delay': `${t.delay}s` }}
            />
          ))}
        </svg>
      </div>

      <div className="exchange-marker" aria-hidden="true">
        <span className="exchange-marker__bracket">[ 01 ]</span>
        <span className="exchange-marker__label">ONE BOOKMARK · FIVE OPERATOR UIs REPLACED</span>
      </div>

      <div className="badge">LATEST · MAY 2026</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>Tune in ›</span>
      </div>
    </article>
  );
}
