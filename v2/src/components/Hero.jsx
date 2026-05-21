import { useEffect, useRef } from 'react';

/* ───────── MTG Card with cursor-tracking tilt + glow follow ───────── */
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

  return (
    <div ref={ref} className="mtg-card" role="img" aria-label="Chris Pachulski: a custom Magic-style card">
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
            onError={(e) => e.currentTarget.parentElement.classList.add('mtg-art-fallback')} />
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

function HeroTerminal({ variant }) {
  // Only the MTG card — terminals removed; v2 default is 'sql' which fell through to card anyway.
  return <MagicCard />;
}

function Hero({ heroVariant }) {
  useRevealOnScroll();
  return (
    <section className="hero" id="home">
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
              I'm <strong>Chris Pachulski</strong>: I turned a hobby into a career. Co-founded MTGBAN, a Magic: The Gathering arbitrage engine that grew to 500+ subscribers, while spending 7+ years shipping analytics pipelines across 5 industries for Ad.Net, Mozilla, SPINS, and Providencia. Now I'm a <strong>Senior Economic Analyst at Wizards of the Coast</strong>, working on the game I built a business around.
            </p>
            <div className="hero-cta reveal" data-delay="2">
              <div className="hero-actions">
                <a href="#contact" className="btn btn-primary mono">Let's talk <span className="arrow">→</span></a>
                <a href="#portfolio" className="btn mono">View case studies</a>
                <a href="/cv/Chris_Pachulski_Resume.pdf" className="btn mono" download>Download CV <span aria-hidden="true">↓</span></a>
              </div>
            </div>
          </div>
          <div className="reveal" data-delay="1"><HeroTerminal variant={heroVariant} /></div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
