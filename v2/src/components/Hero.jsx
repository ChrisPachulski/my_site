import { useState, useEffect } from 'react';

function Hero({ heroVariant }) {
  return (
    <section className="hero" id="home" data-screen-label="00 Hero">
      <div className="wrap">
        <div className="hero-grid">
          <div>
            <h1 className="hero-headline">
              <span className="sub">Sr Economic Analyst · Analytics Engineer</span>
              Turning messy <span className="italic">data</span><br/>
              into decisions<br/>
              worth <span className="italic">shipping</span>.
            </h1>
            <p className="hero-lede">
              I'm <strong>Chris Pachulski</strong> — I turned a hobby into a career. Co-founded <strong>MTGBAN</strong>, a Magic: The Gathering arbitrage engine, and spent 7+ years building analytics pipelines for Ad.Net, Mozilla, SPINS, and Providencia along the way. Now I'm a <strong>Senior Economic Analyst at Wizards of the Coast</strong>, working on the game I built a business around.
            </p>
            <div className="hero-actions">
              <a href="#contact" className="btn btn-primary mono">
                Let's talk <span className="arrow">→</span>
              </a>
              <a href="#portfolio" className="btn mono">View case studies</a>
              <a href="https://github.com/ChrisPachulski" target="_blank" rel="noopener noreferrer" className="btn mono">GitHub ↗</a>
            </div>
          </div>
          <HeroTerminal variant={heroVariant} />
        </div>

        <div className="stats">
          <div className="stat">
            <div className="num">7<span className="unit">+ yrs</span></div>
            <div className="label">Shipping data systems</div>
          </div>
          <div className="stat">
            <div className="num">WotC<span className="unit">.</span></div>
            <div className="label">Sr Economic Analyst, MTG</div>
          </div>
          <div className="stat">
            <div className="num">500<span className="unit">+</span></div>
            <div className="label">Customers served @ MTGBAN</div>
          </div>
          <div className="stat">
            <div className="num">5<span className="unit">x</span></div>
            <div className="label">Industries shipped into</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroTerminal({ variant }) {
  if (variant === 'psql') return <PsqlTerminal />;
  if (variant === 'shell') return <ShellTerminal />;
  return <SqlTerminal />;
}

function SqlTerminal() {
  const [typed, setTyped] = useState(0);
  const query = [
    { t: 'com', v: '-- from hobby to career: the path' },
    { t: 'kw',  v: 'SELECT', after: ' role, company, years' },
    { t: 'kw',  v: 'FROM',   after: ' career' },
    { t: 'kw',  v: 'WHERE',  after: ' involves_magic = ', strAfter: 'TRUE', suffix: ';' },
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setTyped(t => (t < query.length ? t + 1 : t));
    }, 380);
    return () => clearInterval(id);
  }, [query.length]);

  return (
    <div className="terminal">
      <div className="terminal-bar">
        <div className="dots"><span/><span/><span/></div>
        <div className="title">chris=# career timeline</div>
      </div>
      <div className="terminal-body">
        {query.slice(0, typed).map((line, i) => (
          <div key={i}>
            <span className="prompt">{line.t === 'com' ? '' : '# '}</span>
            {line.t === 'com' && <span className="com">{line.v}</span>}
            {line.t === 'kw' && (
              <>
                <span className="kw">{line.v}</span>
                <span>{line.after}</span>
                {line.strAfter && <span className="str">{line.strAfter}</span>}
                {line.suffix}
              </>
            )}
          </div>
        ))}
        {typed >= query.length && (
          <>
            <div style={{ height: 8 }}/>
            <div className="com">(2 rows)</div>
            <div style={{ height: 8 }}/>
            <div className="tbl">
              <div className="tbl-row"><span style={{color:'var(--ink-mute)'}}>role</span><span style={{color:'var(--ink-mute)'}}>company</span></div>
              <div className="tbl-row"><span className="result">Co-founder</span><span className="str">MTGBAN (hobby → $1.2M)</span></div>
              <div className="tbl-row"><span className="result accent">Sr Economic Analyst</span><span className="str accent">Wizards of the Coast</span></div>
            </div>
            <div style={{ height: 10 }}/>
            <div className="com">-- turned the hobby into the career.</div>
            <div><span className="prompt">#</span> <span className="cursor"/></div>
          </>
        )}
      </div>
    </div>
  );
}

function PsqlTerminal() {
  return (
    <div className="terminal">
      <div className="terminal-bar">
        <div className="dots"><span/><span/><span/></div>
        <div className="title">chris=# \d+ experience</div>
      </div>
      <div className="terminal-body">
        <div className="com">-- psql describe</div>
        <div><span className="kw">Table</span> <span className="str">"public.experience"</span></div>
        <div style={{ height: 6 }}/>
        <div className="tbl">
          <div className="tbl-row"><span>Column</span><span className="result">Type</span></div>
          <div className="tbl-row"><span>role</span><span className="str">text not null</span></div>
          <div className="tbl-row"><span>company</span><span className="str">text not null</span></div>
          <div className="tbl-row"><span>tenure</span><span className="str">tstzrange</span></div>
          <div className="tbl-row"><span>impact</span><span className="str">numeric(12,2)</span></div>
          <div className="tbl-row"><span>stack</span><span className="str">text[]</span></div>
        </div>
        <div style={{ height: 8 }}/>
        <div className="com">Indexes:</div>
        <div>  <span className="str">"experience_impact_idx"</span> btree (impact <span className="kw">DESC</span>)</div>
        <div><span className="prompt">#</span> <span className="cursor"/></div>
      </div>
    </div>
  );
}

function ShellTerminal() {
  return (
    <div className="terminal">
      <div className="terminal-bar">
        <div className="dots"><span/><span/><span/></div>
        <div className="title">~/mtgban — airflow scheduler</div>
      </div>
      <div className="terminal-body">
        <div><span className="prompt">$</span> airflow dags trigger <span className="str">mtgban_daily_pricing</span></div>
        <div className="com">[2026-04-17 03:00:01] scraper.tcgplayer........ <span style={{color:'var(--ok)'}}>ok</span></div>
        <div className="com">[2026-04-17 03:00:14] scraper.cardkingdom...... <span style={{color:'var(--ok)'}}>ok</span></div>
        <div className="com">[2026-04-17 03:01:02] arbitrage.detect_spreads. <span style={{color:'var(--ok)'}}>ok</span> <span className="accent">(1,248 found)</span></div>
        <div className="com">[2026-04-17 03:01:08] forecast.prophet_weekly.. <span style={{color:'var(--ok)'}}>ok</span></div>
        <div className="com">[2026-04-17 03:01:12] notify.subscribers....... <span style={{color:'var(--ok)'}}>ok</span> <span className="accent">(512 recipients)</span></div>
        <div style={{ height: 6 }}/>
        <div>DAG run <span className="kw">SUCCESS</span> · <span className="dim">71s</span></div>
        <div><span className="prompt">$</span> <span className="cursor"/></div>
      </div>
    </div>
  );
}

export default Hero;
