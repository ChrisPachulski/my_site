import { useEffect, useRef } from 'react';
import MagicCardFace from './MagicCardFace.jsx';

/* ───────── MTG Card with cursor-tracking tilt + glow follow ─────────
   The card content lives in MagicCardFace (shared with the contact
   section's MagicShowcaseCard). This wrapper just attaches the
   pointer-tilt interaction. */
function MagicCard() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    const attach = () => {
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    };
    const detach = () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      el.style.transform = '';
    };
    const sync = () => { mql.matches ? detach() : attach(); };
    sync();
    mql.addEventListener('change', sync);
    return () => {
      mql.removeEventListener('change', sync);
      detach();
    };
  }, []);

  return <MagicCardFace ref={ref} />;
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
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach(n => io.observe(n));
    return () => io.disconnect();
  }, []);
}

function HeroTerminal() {
  // Only the MTG card — terminals removed; v2 default is 'sql' which fell through to card anyway.
  return <MagicCard />;
}

function Hero() {
  useRevealOnScroll();
  return (
    <section className="hero" id="home">
      <div className="hero-ignite" aria-hidden="true" />
      <div className="wrap">
        <div className="hero-grid">
          <div>
            <h1 className="hero-headline hl">
              <span className="sub">Sr Economic Analyst · Analytics Engineer</span>
              <span className="hl-line" style={{ '--d': '0.1s' }}>Turning messy <span className="italic ignite" style={{ '--di': '0.4s' }}>data</span></span>
              <span className="hl-line" style={{ '--d': '0.2s' }}>into decisions</span>
              <span className="hl-line" style={{ '--d': '0.3s' }}>worth <span className="italic ignite" style={{ '--di': '0.6s' }}>shipping</span>.</span>
            </h1>
            <p className="hero-lede hl-fade" style={{ '--d': '0.55s' }}>
              I'm <strong>Chris Pachulski</strong>: I turned a hobby into a career. Co-founded MTGBAN, a Magic: The Gathering arbitrage engine that grew to 500+ subscribers, while spending 7+ years shipping analytics pipelines across 5 industries for Ad.Net, Mozilla, SPINS, and Providencia. Now I'm a <strong>Senior Economic Analyst at Wizards of the Coast</strong>, working on the game I built a business around.
            </p>
            <div className="hero-cta hl-fade" style={{ '--d': '0.72s' }}>
              <div className="hero-actions">
                <a href="#contact" className="btn btn-primary mono">Let's talk <span className="arrow">→</span></a>
                <a href="#portfolio" className="btn mono">View case studies</a>
                <a href="/cv/Chris_Pachulski_Resume.pdf" className="btn mono" download>Download CV <span aria-hidden="true">↓</span></a>
              </div>
            </div>
          </div>
          <div className="hl-card"><HeroTerminal /></div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
