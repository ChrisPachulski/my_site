import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

const NODES = [
  { label: 'read',          angle:   0 },
  { label: 'weakest-link',  angle:  72 },
  { label: 'propose',       angle: 144 },
  { label: 'refute',        angle: 216 },
  { label: 'verify',        angle: 288 },
];

const RADIUS = 70;
const CX = 100;
const CY = 100;

function polar(angleDeg) {
  const r = (angleDeg - 90) * Math.PI / 180;
  return { x: CX + RADIUS * Math.cos(r), y: CY + RADIUS * Math.sin(r) };
}

export default function ResearchLoopCard({ a, onOpen }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [iter, setIter] = useState(1);
  const [activeNode, setActiveNode] = useState(0);
  const tickRef = useRef(null);

  useEffect(() => {
    if (reduced) return;
    const interval = hover ? 900 : 2800;
    tickRef.current = setInterval(() => {
      setActiveNode((n) => {
        const next = (n + 1) % NODES.length;
        if (next === 0) setIter((i) => (i >= 9 ? 1 : i + 1));
        return next;
      });
    }, interval);
    return () => clearInterval(tickRef.current);
  }, [hover, reduced]);

  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  const dot = polar(NODES[activeNode].angle);
  const pathD = `M ${polar(0).x} ${polar(0).y} ` +
    NODES.slice(1).map(n => {
      const p = polar(n.angle); return `L ${p.x} ${p.y}`;
    }).join(' ') + ' Z';

  return (
    <article
      className={`featured-tile featured research-loop-card${hover ? ' is-hover' : ''}`}
      onClick={open}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      tabIndex={0}
    >
      <div className="flair-bg">
        <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="loop-svg">
          <path d={pathD} className="loop-path" />
          {NODES.map((n, i) => {
            const p = polar(n.angle);
            return (
              <g key={n.label} className={`loop-node${i === activeNode ? ' active' : ''}`}>
                <circle cx={p.x} cy={p.y} r="4" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" className="loop-label">{n.label}</text>
              </g>
            );
          })}
          <circle cx={dot.x} cy={dot.y} r="5" className="loop-dot" />
          <line className="loop-adv-pulse" x1="0" y1="0" x2="200" y2="200" />
          <circle cx="100" cy="100" r="95" className="loop-replication" />
        </svg>
      </div>

      <div className="iter-counter" aria-hidden="true">
        <span className="iter-label">iter</span>
        <span className="iter-num">{String(iter).padStart(2, '0')}</span>
      </div>

      <div className="badge">{a.read?.toUpperCase()} · DEEP READ</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </article>
  );
}
