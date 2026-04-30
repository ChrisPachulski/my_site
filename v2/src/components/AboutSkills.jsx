import { Fragment, useState, useEffect, useRef } from 'react';
import usePrefersReducedMotion from './featured/usePrefersReducedMotion.js';

/* Hook: adds .in-view to a ref'd element once it enters the viewport.
   Short-circuits to in-view immediately when the user prefers reduced motion,
   so we don't spin up an IntersectionObserver only to flip a class that the
   stylesheet then has to neutralize. */
function useInView(threshold = 0.2) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const [intersected, setIntersected] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIntersected(true); io.disconnect(); }
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, reduced]);
  return [ref, reduced || intersected];
}

export function About() {
  const [cardRef, inView] = useInView(0.15);
  return (
    <section className="about" id="about" data-screen-label="01 About">
      <div className="wrap">
        <div className="section-label reveal"><span className="num">01</span> / about</div>
        <div ref={cardRef} className={`izzet-card izzet-blue${inView ? ' in-view' : ''}`}>
          <svg className="izzet-seal" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="99" height="99" pathLength="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="izzet-corner tl" aria-hidden="true" />
          <span className="izzet-corner tr" aria-hidden="true" />
          <span className="izzet-corner bl" aria-hidden="true" />
          <span className="izzet-corner br" aria-hidden="true" />
          <div className="about-grid">
            <div>
              <h2 className="reveal izzet-split">
                <span className="izzet-text-left">Data </span>
                <em>done right</em>
                <span className="izzet-text-right"> feels like the lights<br/>finally coming on.</span>
              </h2>
              <p className="reveal" data-delay="1">
                I make the data layer load-bearing. Pipelines that don't drop, warehouses that still compose six months later, models that survive a production deploy. Seven years shipping that work; SQL and Python daily, R when the problem actually needs a statistician.
              </p>
              <p className="reveal" data-delay="2">
                Same shape, different domain every time. Government contracting, adtech, browser telemetry, CPG retail panel, equity research, and now collectibles economics at Wizards. The stack changes; the discipline doesn't.
              </p>
              <p className="reveal" data-delay="3">
                Outside of it: my daughter, my son, three dachshunds, the perennial heartbreak of the Toronto Maple Leafs, and tinkering with Magic: the Gathering collections.
              </p>
            </div>
            <div className="reveal" data-delay="2">
              <div className="fact-list">
                <div className="fact"><span>role</span><span>Sr Data Scientist · Analytics Engineer</span></div>
                <div className="fact"><span>current</span><span>Wizards of the Coast — Magic: The Gathering</span></div>
                <div className="fact"><span>experience</span><span>7+ yrs shipping data systems · 5 industries</span></div>
                <div className="fact"><span>previously</span><span>The Providencia Group · Ad.Net · Mozilla · Spins LLC · Consumer Edge Research</span></div>
                <div className="fact"><span>education</span><span>MBA, Hofstra · BA Classics + Biology, Creighton</span></div>
                <div className="fact"><span>location</span><span>Seattle, WA · Remote</span></div>
                <div className="fact"><span>available</span><span className="accent">Selective consulting + mentoring</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Skills() {
  const rows = [
    { name: 'SQL',       use: 'analytics, warehousing, reporting',    yrs: '8y', depth: 95, daily: true },
    { name: 'Python',    use: 'pipelines, reporting libraries, APIs', yrs: '7y', depth: 92, daily: true },
    { name: 'R',         use: 'forecasting, statistical analysis',    yrs: '7y', depth: 85 },
    { name: 'BigQuery',  use: 'warehouse design, cost controls',      yrs: '5y', depth: 90 },
    { name: 'Looker',    use: 'LookML modeling, exec dashboards',     yrs: '5y', depth: 82 },
    { name: 'Docker',    use: 'reproducible reporting, CI',           yrs: '5y', depth: 75 },
  ];
  const [tableRef, inView] = useInView(0.2);
  const [cardRef, cardInView] = useInView(0.15);
  return (
    <section id="skills" data-screen-label="02 Skills">
      <div className="wrap">
        <div className="section-label reveal">
          <span className="num">02</span> / skills &nbsp; <span className="mute">// SELECT * FROM tools ORDER BY depth DESC;</span>
        </div>
        <div ref={cardRef} className={`izzet-card izzet-red${cardInView ? ' in-view' : ''}`}>
          <svg className="izzet-seal" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="99" height="99" pathLength="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="izzet-corner tl" aria-hidden="true" />
          <span className="izzet-corner tr" aria-hidden="true" />
          <span className="izzet-corner bl" aria-hidden="true" />
          <span className="izzet-corner br" aria-hidden="true" />
          <div className="skills-grid">
            <div className="skills-intro">
              <h2 className="reveal izzet-split section-headline">
                <span className="izzet-text-left">Here's </span>
                <em>where</em>
                <span className="izzet-text-right"> I can help.</span>
              </h2>
              <p className="dim reveal" data-delay="1" style={{ maxWidth:440, fontSize:15, lineHeight:1.55 }}>
                I work in and mentor SQL and Python daily, and hold a strong nostalgia for R — the language I reach for when the problem needs a real statistician. Looker and BigQuery are where I spend most of my warehousing hours.
              </p>
            </div>
            <div className="skills-table reveal" data-delay="2" id="skills-table" ref={tableRef}>
              <div className="skills-head">
                <div>#</div><div>Tool</div><div className="use-col">Where I use it</div><div>Years</div><div className="bar-col">Depth</div>
              </div>
              {rows.map((r, i) => (
                <div className={`skill-row${inView ? ' in-view' : ''}`} key={r.name}>
                  <div className="idx">{String(i+1).padStart(2,'0')}</div>
                  <div className="name">{r.name} {r.daily && <span className="accent" title="Daily driver">●</span>}</div>
                  <div className="use">{r.use}</div>
                  <div className="yrs">{r.yrs}</div>
                  <div className="skill-bar">
                    <div className="skill-bar-fill" style={{ '--depth': inView ? r.depth / 100 : 0, transitionDelay: `${i * 90}ms` }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Feature() {
  const [active, setActive] = useState(0);
  const nodes = [
    { glyph: '◉', nm: 'scrape.tcgplayer',     ss: 'r · tidyverse · rvest' },
    { glyph: '◎', nm: 'scrape.cardkingdom',   ss: 'r · async http' },
    { glyph: '◈', nm: 'bigquery.stage',       ss: 'sql · partition by dt' },
    { glyph: '◆', nm: 'forecast.prophet',     ss: 'r · time series ml' },
    { glyph: '✦', nm: 'notify.subscribers',   ss: '500+ paying users' },
  ];
  return (
    <section id="feature" data-screen-label="02b Feature">
      <div className="wrap">
        <div className="feature reveal">
          <div className="feature-grid">
            <div>
              <span className="tag">featured</span>
              <h3>MTGBAN — I co-founded a <em>$1.2M</em> arbitrage engine for Magic: the Gathering.</h3>
              <p className="dim">
                500+ paying customers use our aggregated pricing to buy, sell, and hedge across a fragmented collectibles market. I designed the BigQuery warehouse from scratch, and the entire pipeline runs on Digital Ocean droplets + the R tidyverse.
              </p>
              <p className="dim">Time-series ML forecasts price movements. A Go dashboard surfaces it all.</p>
              <div className="kpis">
                <div className="kpi"><div className="v">$1.2<span className="u">M</span></div><div className="k">Annual revenue</div></div>
                <div className="kpi"><div className="v">500<span className="u">+</span></div><div className="k">Paying subs</div></div>
                <div className="kpi"><div className="v">24/7</div><div className="k">Uptime</div></div>
              </div>
            </div>
            <div>
              <div
                className="pipe"
                role="list"
                aria-label="MTGBAN daily pipeline — hover or focus a step to advance"
              >
                <div style={{ color:'var(--ink-mute)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
                  dag: mtgban_daily_pricing · 03:00 UTC
                </div>
                {nodes.map((n, i) => (
                  <Fragment key={i}>
                    <div
                      className={`pipe-node${active === i ? ' active' : ''}`}
                      role="listitem"
                      tabIndex={0}
                      aria-current={active === i ? 'step' : undefined}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                    >
                      <span className="glyph">{n.glyph}</span>
                      <div>
                        <div className="nm">{n.nm}</div>
                        <div className="ss">{n.ss}</div>
                      </div>
                      <span style={{ color: active === i ? 'var(--accent)' : 'var(--ink-mute)', fontSize: 11 }}>
                        {active > i ? '✓ ok' : active === i ? '● run' : '○ queued'}
                      </span>
                    </div>
                    {i < nodes.length - 1 && <div className="pipe-arrow">│</div>}
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
