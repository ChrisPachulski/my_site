import { useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from './usePrefersReducedMotion.js';
import './featured.css';

const TARGET = 208;
const N_NODES = 11;
const WIDTH = 200;
const HEIGHT = 200;

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function initNodes(seed) {
  const rand = seededRandom(seed);
  return Array.from({ length: N_NODES }, (_, i) => ({
    id: i,
    x: 40 + rand() * (WIDTH - 80),
    y: 40 + rand() * (HEIGHT - 80),
    vx: 0,
    vy: 0,
  }));
}

function initEdges(nodes, seed) {
  const rand = seededRandom(seed);
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    const connections = 1 + Math.floor(rand() * 2);
    for (let c = 0; c < connections; c++) {
      const j = Math.floor(rand() * nodes.length);
      if (j !== i && !edges.find(e => (e.a === i && e.b === j) || (e.a === j && e.b === i))) {
        edges.push({ a: i, b: j, pulse: rand() });
      }
    }
  }
  return edges;
}

export default function ObsidianWikiCard({ a, onOpen }) {
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const [count, setCount] = useState(0);
  const [seed, setSeed] = useState(7);
  const [nodes, setNodes] = useState(() => initNodes(7));
  const edgesRef = useRef(initEdges(nodes, 7));
  const rafRef = useRef(null);
  const cardRef = useRef(null);
  const startedRef = useRef(false);

  // Counter: tick up to TARGET on scroll-into-view
  useEffect(() => {
    if (!cardRef.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          if (reduced) { setCount(TARGET); return; }
          const start = performance.now();
          const duration = 1600;
          const step = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setCount(Math.floor(eased * TARGET));
            if (t < 1) requestAnimationFrame(step);
            else setCount(TARGET);
          };
          requestAnimationFrame(step);
        }
      });
    }, { threshold: 0.35 });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, [reduced]);

  // Force-directed simulation
  useEffect(() => {
    if (reduced) return;
    let running = true;
    const tick = () => {
      if (!running) return;
      setNodes((prev) => {
        const next = prev.map(n => ({ ...n }));
        const k = 0.015;  // spring
        const rep = 600;  // repulsion strength
        for (const e of edgesRef.current) {
          const a = next[e.a]; const b = next[e.b];
          const dx = b.x - a.x; const dy = b.y - a.y;
          const dist = Math.max(Math.hypot(dx, dy), 0.001);
          const target = 55;
          const force = (dist - target) * k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const a = next[i]; const b = next[j];
            const dx = b.x - a.x; const dy = b.y - a.y;
            const dist = Math.max(Math.hypot(dx, dy), 0.001);
            const force = rep / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx; a.vy -= fy;
            b.vx += fx; b.vy += fy;
          }
        }
        for (const n of next) {
          n.vx *= 0.82;
          n.vy *= 0.82;
          n.x += n.vx * 0.5;
          n.y += n.vy * 0.5;
          n.x = Math.max(20, Math.min(WIDTH - 20, n.x));
          n.y = Math.max(20, Math.min(HEIGHT - 20, n.y));
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [reduced]);

  // Hover = re-seed the graph and restart counter
  useEffect(() => {
    if (!hover) return;
    const newSeed = Math.floor(Math.random() * 1000) + 1;
    setSeed(newSeed);
    const fresh = initNodes(newSeed);
    edgesRef.current = initEdges(fresh, newSeed);
    setNodes(fresh);
    if (!reduced) {
      setCount(0);
      startedRef.current = false;
      // re-trigger the counter on next IO check; if still in view, restart manually:
      const start = performance.now();
      const duration = 1100;
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setCount(Math.floor(eased * TARGET));
        if (t < 1) requestAnimationFrame(step);
        else setCount(TARGET);
      };
      requestAnimationFrame(step);
    }
  }, [hover, reduced]);

  const open = () => onOpen(a.slug);
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  return (
    <article
      ref={cardRef}
      className={`featured-tile featured obsidian-wiki-card${hover ? ' is-hover' : ''}`}
      onClick={open}
      onKeyDown={onKey}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
    >
      <div className="flair-bg">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="graph-svg">
          {edgesRef.current.map((e, i) => {
            const a = nodes[e.a]; const b = nodes[e.b];
            if (!a || !b) return null;
            const pulsed = ((performance.now() / 900) + e.pulse) % 1;
            const opacity = 0.2 + 0.55 * Math.abs(Math.sin(pulsed * Math.PI));
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="graph-edge" style={{ opacity }} />;
          })}
          {nodes.map((n) => (
            <circle key={n.id} cx={n.x} cy={n.y} r="3.5" className="graph-node" />
          ))}
        </svg>
      </div>

      <div className="graph-counter" aria-hidden="true">
        <div className="count-num">{count}</div>
        <div className="count-sub">ARTICLES SURVIVED · FIVE TYPES · ONE STOP HOOK</div>
      </div>

      <div className="badge">LATEST · APR 2026</div>
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Traverse ›</span>
      </div>
    </article>
  );
}
