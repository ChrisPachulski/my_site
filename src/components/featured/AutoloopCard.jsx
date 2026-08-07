import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

// A git-graph headline: autonomous `auto/*` feature branches sprout from the
// integration lane, get verified, and merge back — while `main` stays a human
// gate below. A pulse travels the integration lane (one window of the loop);
// the spend guard keeps the whole thing at $0 metered. Paths use pathLength=1
// so the draw-in reveal expresses timing in unit fractions.
const BRANCHES = [
  { d: 'M 46 74 C 54 48, 82 48, 90 74',   node: [68, 46], delay: 0.05 },
  { d: 'M 104 74 C 112 44, 142 44, 150 74', node: [127, 43], delay: 0.22 },
  { d: 'M 156 74 C 164 52, 186 52, 194 74', node: [175, 50], delay: 0.39 },
];
const MERGE_DOTS = [[46, 74], [90, 74], [104, 74], [150, 74], [156, 74], [194, 74]];

export default function AutoloopCard({ a, onOpen }) {
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
        'featured-tile featured autoloop-card'
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
        <svg viewBox="0 0 240 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="autoloop-svg">
          {/* main — the human gate, quiet and straight */}
          <line x1="20" y1="150" x2="220" y2="150" className="al-main" />
          {/* integration lane — where verified auto work compounds */}
          <line x1="20" y1="74" x2="220" y2="74" className="al-integration" />

          {/* feature branches: sprout, get verified, merge back */}
          {BRANCHES.map((b, i) => (
            <g key={`br-${i}`} className="al-branch" style={{ '--delay': `${b.delay}s` }}>
              <path d={b.d} className="al-branch-path" pathLength="1" />
              <circle cx={b.node[0]} cy={b.node[1]} r="3.4" className="al-branch-node" />
            </g>
          ))}

          {/* merge/commit dots on integration */}
          {MERGE_DOTS.map((p, i) => (
            <circle key={`m-${i}`} cx={p[0]} cy={p[1]} r="2.4" className="al-merge-dot" />
          ))}

          {/* promote — dashed, human-gated: integration → main */}
          <path d="M 200 80 L 200 142" className="al-promote" pathLength="1" markerEnd="url(#al-arrow)" />
          <defs>
            <marker id="al-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" className="al-arrowhead" />
            </marker>
          </defs>
          {/* lock on main = the human gate */}
          <g className="al-lock">
            <rect x="196" y="152" width="9" height="7" rx="1.2" />
            <path d="M 197.6 152 v -2 a 2.9 2.9 0 0 1 5.8 0 v 2" className="al-lock-shackle" />
          </g>

          {/* verify gate — a pulsing ring on the integration lane */}
          <circle cx="127" cy="74" r="7" className="al-gate" />

          {/* the loop's pulse travelling one window across integration */}
          <circle cx="20" cy="74" r="3.6" className="al-pulse" />
        </svg>
      </div>

      <div className="autoloop-guard" aria-hidden="true">GUARD · $0 OVERAGE</div>

      <div className="badge">{a.read?.toUpperCase()} · DEEP READ</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>Open the loop ›</span>
      </div>
    </article>
  );
}
