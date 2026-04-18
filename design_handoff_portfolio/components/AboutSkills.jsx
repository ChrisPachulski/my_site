/* About + Skills + Feature (MTGBan pipeline) */
const { useState: useStateAS, useEffect: useEffectAS } = React;

function About() {
  return (
    <section className="about" id="about" data-screen-label="01 About">
      <div className="wrap">
        <div className="section-label"><span className="num">01</span> / about</div>
        <div className="about-grid">
          <div>
            <h2>Data <em>done right</em> feels like the lights<br/>finally coming on.</h2>
            <p>
              I'm a data-driven professional with extensive experience in <strong>analytics, data engineering, and business intelligence</strong>. I specialize in turning complex datasets into decisions teams actually use.
            </p>
            <p>
              I thrive at the intersection of analytics, automation, and storytelling — close to stakeholders, close to the metal. My work spans <strong>financial services, digital marketing, CPG, and tech</strong>, built with SQL, Python, R, Looker and Docker.
            </p>
            <p>
              Outside of it: my daughter, my son, three dachshunds, the perennial heartbreak of the Toronto Maple Leafs, and tinkering with Magic: the Gathering collections.
            </p>
          </div>
          <div>
            <div className="fact-list">
              <div className="fact"><span>role</span><span>Sr Economic Analyst · Analytics Engineer</span></div>
              <div className="fact"><span>current</span><span>Wizards of the Coast — Magic: The Gathering</span></div>
              <div className="fact"><span>previously</span><span>The Providencia Group · Ad.Net · Mozilla · Spins LLC · Consumer Edge Research</span></div>
              <div className="fact"><span>education</span><span>MBA, Hofstra · BA Classics + Biology, Creighton</span></div>
              <div className="fact"><span>location</span><span>Seattle, WA · Remote</span></div>
              <div className="fact"><span>available</span><span className="accent">Selective consulting + mentoring</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Skills() {
  const rows = [
    { name: 'SQL',       use: 'analytics, warehousing, reporting',   yrs: '8y', depth: 95, daily: true },
    { name: 'Python',    use: 'pipelines, reporting libraries, APIs', yrs: '7y', depth: 92, daily: true },
    { name: 'R',         use: 'forecasting, statistical analysis',   yrs: '7y', depth: 85 },
    { name: 'BigQuery',  use: 'warehouse design, cost controls',     yrs: '5y', depth: 90 },
    { name: 'Looker',    use: 'LookML modeling, exec dashboards',    yrs: '5y', depth: 82 },
    { name: 'Docker',    use: 'reproducible reporting, CI',          yrs: '5y', depth: 75 },
  ];
  const [inView, setInView] = useStateAS(false);
  useEffectAS(() => {
    const el = document.querySelector('#skills-table');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section id="skills" data-screen-label="02 Skills">
      <div className="wrap">
        <div className="section-label"><span className="num">02</span> / skills &nbsp; <span className="mute">// SELECT * FROM tools ORDER BY depth DESC;</span></div>
        <div className="skills-grid">
          <div className="skills-intro">
            <h2 style={{ fontFamily:'var(--serif)', fontSize:'clamp(26px,3.2vw,42px)', margin:'0 0 20px', fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.08 }}>
              Here's where I can help.
            </h2>
            <p className="dim" style={{ maxWidth:440, fontSize:15, lineHeight:1.55 }}>
              I work in and mentor SQL and Python daily, and hold a strong nostalgia for R — the language I reach for when the problem needs a real statistician. Looker and BigQuery are where I spend most of my warehousing hours.
            </p>
          </div>
          <div className="skills-table" id="skills-table">
            <div className="skills-head">
              <div>#</div><div>Tool</div><div className="use-col">Where I use it</div><div>Years</div><div className="bar-col">Depth</div>
            </div>
            {rows.map((r, i) => (
              <div className="skill-row" key={r.name}>
                <div className="idx">{String(i+1).padStart(2,'0')}</div>
                <div className="name">{r.name} {r.daily && <span className="accent" title="Daily driver">●</span>}</div>
                <div className="use">{r.use}</div>
                <div className="yrs">{r.yrs}</div>
                <div className="skill-bar">
                  <div className="skill-bar-fill" style={{ width: inView ? `${r.depth}%` : '0%', transitionDelay: `${i * 80}ms` }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature() {
  const [active, setActive] = useStateAS(0);
  useEffectAS(() => {
    const id = setInterval(() => setActive(a => (a + 1) % 5), 1400);
    return () => clearInterval(id);
  }, []);
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
      <div className="feature">
        <div className="feature-grid">
          <div>
            <span className="tag">● live · featured</span>
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
            <div className="pipe">
              <div style={{ color:'var(--ink-mute)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
                dag: mtgban_daily_pricing · 03:00 UTC
              </div>
              {nodes.map((n, i) => (
                <React.Fragment key={i}>
                  <div className={`pipe-node${active === i ? ' active' : ''}`}>
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
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

Object.assign(window, { About, Skills, Feature });
