import { useEffect, useRef, useState } from 'react';

/* ───────── MTG Card with cursor-tracking tilt + glow follow ───────── */
function MagicCard() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * 10;
      const ry = (x - 0.5) * 12;
      el.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      el.style.setProperty('--mx', `${x * 100}%`);
      el.style.setProperty('--my', `${y * 100}%`);
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  return (
    <div ref={ref} className="mtg-card" role="img" aria-label="Chris Pachulski — a custom Magic-style card">
      <div className="mtg-frame">
        <div className="mtg-titlebar mtg-stage" style={{ '--d': '0.10s' }}>
          <div className="mtg-name">Chris Pachulski</div>
          <div className="mtg-mana">
            <span className="mtg-pip pip-gen mtg-stage" style={{ '--d': '0.55s' }}>2</span>
            <span className="mtg-pip pip-u mtg-stage" style={{ '--d': '0.65s' }} aria-label="Blue mana">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 C 10 2.5, 4.5 8.5, 4.5 12.5 C 4.5 16, 7 18, 10 18 C 13 18, 15.5 16, 15.5 12.5 C 15.5 8.5, 10 2.5, 10 2.5 Z" fill="currentColor"/></svg>
            </span>
            <span className="mtg-pip pip-r mtg-stage" style={{ '--d': '0.75s' }} aria-label="Red mana">
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 C 11 5, 13.5 6, 13.5 9 C 13.5 10.5, 12.8 11.5, 12 12 C 13.5 11, 15 10, 15.5 8 C 16.5 11, 16 14.5, 13.5 16.5 C 11.5 18, 8.5 18, 6.5 16.5 C 4 14.5, 3.5 11, 4.5 8 C 5 10, 6.5 11, 8 12 C 7.2 11.5, 6.5 10.5, 6.5 9 C 6.5 6, 9 5, 10 2.5 Z" fill="currentColor"/></svg>
            </span>
          </div>
        </div>

        <div className="mtg-art mtg-stage" style={{ '--d': '0.25s' }}>
          <img src="hero-portrait.jpg" alt="Chris Pachulski" draggable="false"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.style.background = 'linear-gradient(135deg, oklch(0.35 0.08 55), oklch(0.18 0.04 30))'; }} />
        </div>

        <div className="mtg-typebar mtg-stage" style={{ '--d': '0.95s' }}>
          <span className="mtg-type">Legendary Creature — Human Wizard</span>
          <span className="mtg-setsymbol" aria-hidden="true">◆</span>
        </div>

        <div className="mtg-textbox">
          <p className="mtg-rule mtg-stage" style={{ '--d': '1.15s' }}>Python, SQL, R</p>
          <p className="mtg-rule mtg-stage" style={{ '--d': '1.30s' }}>Protection from Data</p>
          <p className="mtg-rule mtg-stage" style={{ '--d': '1.45s' }}>
            This creature's power is equal to the number of ETL pipelines you control, and its toughness is equal to that number plus 1.
          </p>
          <p className="mtg-flavor mtg-stage" style={{ '--d': '1.75s' }}>
            "Short of leg. Long of opinion. The toddlers and dachshunds are brothers in arms and rule my life."
          </p>
        </div>

        <div className="mtg-bottom">
          <span className="mtg-pt mtg-stage" style={{ '--d': '2.05s' }}>*/*+1</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── Stat with counter-on-view animation ─────────
   Parses the number prefix out of `num` so e.g. "7" counts 0→7, "WotC" stays as-is. */
function Stat({ num, unit, label, delay = 0 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(() => {
    const m = String(num).match(/^(\d+)/);
    return m ? '0' : num;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = String(num);
    const m = target.match(/^(\d+)/);
    if (!m) { setDisplay(target); return; }
    const n = parseInt(m[1], 10);
    const suffix = target.slice(m[1].length);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDisplay(target); return; }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const duration = 1200;
      const start = performance.now() + delay;
      const tick = (now) => {
        if (now < start) { requestAnimationFrame(tick); return; }
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(n * eased) + suffix);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [num, delay]);

  return (
    <div className="stat" ref={ref}>
      <div className="num">{display}{unit ? <span className="unit">{unit}</span> : null}</div>
      <div className="label">{label}</div>
    </div>
  );
}

/* Hook up scroll reveals for any element with `.reveal` in the tree. */
function useRevealOnScroll() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(n => n.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach(n => io.observe(n));
    return () => io.disconnect();
  }, []);
}

/* Global parallax layer: sets --px/--py on <html> from mouse, --scrolly from scroll. */
function useAmbientParallax() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const root = document.documentElement;
    let rafId = 0;
    let mx = 0, my = 0;
    const onMove = (e) => {
      mx = (e.clientX / window.innerWidth) - 0.5;
      my = (e.clientY / window.innerHeight) - 0.5;
      if (!rafId) rafId = requestAnimationFrame(flush);
    };
    const onScroll = () => {
      root.style.setProperty('--scrolly', `${window.scrollY}px`);
    };
    const flush = () => {
      root.style.setProperty('--px', mx.toFixed(3));
      root.style.setProperty('--py', my.toFixed(3));
      rafId = 0;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);
}

/* Floating particle field, only when vibe=cyberpunk. Cheap: 20 DOM nodes, pure CSS anim. */
function Particles() {
  const [on, setOn] = useState(() => typeof document !== 'undefined' && document.documentElement.getAttribute('data-vibe') === 'cyberpunk');
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setOn(document.documentElement.getAttribute('data-vibe') === 'cyberpunk');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-vibe'] });
    return () => obs.disconnect();
  }, []);
  if (!on) return null;
  const dots = Array.from({ length: 22 }, (_, i) => {
    const left = (i * 37) % 100;
    const dx = ((i * 53) % 80) - 40;
    const dur = 14 + ((i * 7) % 16);
    const delay = -(i * 1.1) % 20;
    const size = 1 + ((i * 3) % 3);
    return (
      <span key={i} className="p" style={{
        left: `${left}%`, width: `${size}px`, height: `${size}px`,
        animationDuration: `${dur}s`, animationDelay: `${delay}s`,
        '--dx': `${dx}vw`,
      }} />
    );
  });
  return <div className="particles" aria-hidden="true">{dots}</div>;
}

function HeroTerminal({ variant }) {
  // Only the MTG card — terminals removed; v2 default is 'sql' which fell through to card anyway.
  return <MagicCard />;
}

function Hero({ heroVariant }) {
  useRevealOnScroll();
  useAmbientParallax();
  return (
    <>
      <Particles />
      <section className="hero" id="home" data-screen-label="00 Hero">
        <div className="wrap">
          <div className="hero-grid">
            <div>
              <h1 className="hero-headline reveal">
                <span className="sub">Sr Economic Analyst · Analytics Engineer</span>
                Turning messy <span className="italic">data</span><br/>
                into decisions<br/>
                worth <span className="italic">shipping</span>.
              </h1>
              <p className="hero-lede reveal" data-delay="1">
                I'm <strong>Chris Pachulski</strong> — I turned a hobby into a career. Co-founded <strong>MTGBAN</strong>, a Magic: The Gathering arbitrage engine, and spent 7+ years building analytics pipelines for Ad.Net, Mozilla, SPINS, and Providencia along the way. Now I'm a <strong>Senior Economic Analyst at Wizards of the Coast</strong>, working on the game I built a business around.
              </p>
              <div className="hero-actions reveal" data-delay="2">
                <a href="#contact" className="btn btn-primary mono">Let's talk <span className="arrow">→</span></a>
                <a href="#portfolio" className="btn mono">View case studies</a>
                <a href="https://github.com/ChrisPachulski" target="_blank" rel="noopener noreferrer" className="btn mono">GitHub ↗</a>
              </div>
            </div>
            <div className="reveal" data-delay="1"><HeroTerminal variant={heroVariant} /></div>
          </div>

          <div className="stats reveal" data-delay="3">
            <Stat num="7"    unit="+ yrs" label="Shipping data systems" delay={0} />
            <Stat num="WotC" unit="."     label="Sr Economic Analyst, MTG" delay={120} />
            <Stat num="500"  unit="+"     label="Customers served @ MTGBAN" delay={240} />
            <Stat num="5"    unit="x"     label="Industries shipped into" delay={360} />
          </div>
        </div>
      </section>
    </>
  );
}

export default Hero;
