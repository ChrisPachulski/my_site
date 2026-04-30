import { Fragment, useState, useEffect, useRef } from 'react';
import { POSTS } from '../lib/blog.js';
import { articlePath } from '../lib/router.js';
import usePrefersReducedMotion from './featured/usePrefersReducedMotion.js';
import ResearchLoopCard from './featured/ResearchLoopCard.jsx';
import AtHomeMediaCard from './featured/AtHomeMediaCard.jsx';
import ObsidianWikiCard from './featured/ObsidianWikiCard.jsx';

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

const PROJECTS = [
  {
    title: 'Wizards of the Coast: MTG Economics & Analytics Platform',
    tag: 'Sr Data Scientist · Nov 2025 – present',
    stack: ['Python', 'Snowflake', 'pyfixest', 'statsmodels', 'DuckDB', 'Smartsheet', 'MCP', 'Claude Code'],
    desc: 'Econometrics and internal tooling for Magic: The Gathering, covering pricing, cannibalization, POS weighting, and revenue reconciliation across channels and set cycles.',
    href: null, category: 'ic',
    challenge: 'MTG spans channels, regions, and set cycles at billion-dollar scale. Decisions about pricing, inventory, mass-market expansion, and product mix need econometric rigor, not dashboards that say "line go up". The next analyst also needs to reproduce the work.',
    solution: "Built out an internal Python platform of 10 installable packages that power the long-running analyses: Snowflake with role-based warehouse routing, a Sales Rate Index pipeline (IPF-raked POS weights + velocity/sell-through indices + synthetic control), an MTGJSON wrapper with a DuckDB cache, Smartsheet sync, Microsoft 365 auth, and more. Shipped a mass-market vs. core-hobby cannibalization study running 28+ identification strategies (TWFE, first-differenced, Bartik IV, distance IV, Oster bounds, synthetic control, causal forest, Bayesian) on a 38-MSA panel and a 200–600 MSA event-tracking panel. Built a price-elasticity model on an international market with clustered standard errors feeding 2026 planning scenarios. Stood up three MCP servers so AI agents can safely query Snowflake, MTGJSON, and project memory. Partners: product strategy, sales, finance, and economists.",
    metrics: [
      { v: '10', k: 'Internal Python packages' }, { v: '28+', k: 'Econometric strategies' },
      { v: '600', k: 'MSAs in EventLink panel' }, { v: '3', k: 'MCP servers shipped' },
    ],
  },
  {
    title: 'The Providencia Group: ORR National Call Center Platform',
    tag: 'Sr Data Analyst · Sep 2024 – Nov 2025',
    stack: ['Python', 'R', 'Genesys Cloud', 'Salesforce', 'SharePoint', 'Microsoft 365', 'Unanet', 'SuccessKPI', 'PowerShell'],
    desc: "Data + reporting platform for a federal children's-safety hotline: trafficking, abuse, runaway, and safety case reporting for the Office of Refugee Resettlement.",
    href: null, category: 'ic',
    challenge: 'The ORR National Call Center ran on undocumented scripts and brittle spreadsheets. Trafficking, abuse, and runaway reports, plus the staffing decisions behind them, were being made on stale numbers, with no reproducibility and no clean handoff path for the next analyst.',
    solution: 'Designed and shipped two internal Python packages (tpg_functions + tpg_reporting) plus a parallel R mirror, covering Genesys, Salesforce, SharePoint, Outlook/Teams, and Unanet. Wrote 19 production ETL scripts on 20 scheduled jobs spanning daily, weekly, and monthly cadences. Built agent performance bucketing (occupancy + idle/interacting/not-responding components), cross-system ID validation, and missing-data monitoring. A single PowerShell installer bootstraps the full stack end-to-end for the next analyst: Python, VS Code, 270+ deps, isolated venv.',
    metrics: [
      { v: '168', k: 'Utility functions authored' }, { v: '19', k: 'Production ETL scripts' },
      { v: '20', k: 'Scheduled jobs (24/7)' }, { v: '6', k: 'External systems integrated' },
    ],
  },
  {
    title: 'MTGBAN: Collectibles Pricing & Forecasting Platform',
    tag: 'Co-founder · 2017 – 2025',
    stack: ['R', 'tidyverse', 'BigQuery', 'H2O AutoML', 'Prophet', 'RSelenium', 'Docker', 'Digital Ocean', 'Go'],
    desc: 'Eight years of continuous shipping. 38+ production R scripts (~26K LOC) running a multi-TCG pricing, forecasting, and distribution platform for 500+ paying subscribers.',
    href: 'https://www.mtgban.com/', category: 'founded',
    challenge: 'Collectibles markets fragment across 20+ marketplaces, six different trading-card games, and multiple grading authorities (PSA, Beckett). Pricing data is dirty, latent, and sold piecemeal. Serious traders, stores, and speculators lose spread to information asymmetry.',
    solution: "Built the full stack from scratch. A BigQuery warehouse (gaeas-cradle) anchors the data layer. RSelenium + httr/rvest scrapers pull every major vendor: TCGplayer, Card Kingdom, Cardsphere, CK Buylist, MTGJSON, Scryfall. They cover MTG, Pokemon, Yu-Gi-Oh, One Piece, Lorcana, and Flesh and Blood, plus PSA and Beckett for graded cards. Forecasting is an H2O AutoML ensemble (GBM + Deep Learning) alongside Prophet for time-series. Community sentiment on Discord is mined with tidytext + NRC. A Twitter bot auto-distributes signals, MTGBAN's own API feeds paying subscribers, and a Go dashboard surfaces it all. Dockerized and running 24/7 on Digital Ocean since 2017.",
    metrics: [
      { v: '$1.2M', k: 'Annual revenue' }, { v: '500+', k: 'Paying subscribers' },
      { v: '8 yrs', k: 'In continuous production' }, { v: '6', k: 'TCGs covered' },
    ],
  },
  {
    title: 'Mozilla Firefox: Ad Performance Analytics',
    tag: 'Consultant · 2024', stack: ['Looker', 'SQL', 'Funnel analysis'],
    desc: 'Real-time ad performance dashboards + funnel analysis for a top-5 browser.',
    href: null, category: 'consulting',
    challenge: 'Ad spend decisions were lagging the market by weeks. Conversion funnels were opaque to stakeholders.',
    solution: 'Developed Looker dashboards with real-time insight into digital ad performance. Ran funnel analysis to optimize conversion rates and automated the reporting workflow.',
    metrics: [{ v: '4 mo', k: 'Engagement' }, { v: '12', k: 'Dashboards shipped' }, { v: '-40%', k: 'Manual effort' }, { v: 'real', k: 'Time ad insights' }],
  },
  {
    title: 'Ad.Net: Centralized Python Reporting Library',
    tag: 'Sr BI Analyst · 2021–2024',
    stack: ['Python', 'Looker', 'ClickHouse', 'Docker', 'Jira API'],
    desc: 'One Python library replaced dozens of one-off scripts across the BI team.',
    href: null, category: 'ic',
    challenge: 'Every analyst was writing their own half-working report. Maintenance cost was eating the team.',
    solution: 'Designed a centralized, versioned Python library for querying, reporting, and exploration. Integrated Salesforce + SimilarWeb signals, built Looker dashboards for campaign performance, and automated Jira report generation.',
    metrics: [{ v: '40+', k: 'Looker dashboards' }, { v: '60%', k: 'Reporting time ↓' }, { v: '1', k: 'Source of truth' }, { v: '3 yrs', k: 'In production' }],
  },
  {
    title: 'card-ops: Credit Card Portfolio AI Agent',
    tag: 'Open source · 2026',
    stack: ['Claude Code', 'Python', 'Node', 'YAML', 'PDF parsing'],
    desc: 'Claude Code skill that evaluates card offers, compares cards, scans statements, and optimizes a personal credit-card portfolio, all with personal financial data kept local-only.',
    href: 'https://github.com/ChrisPachulski/card-ops', category: 'open',
    challenge: 'Credit-card strategy is expert-level and fragmented across blogs (Doctor of Credit, The Points Guy, Frequent Miler). Every card offer takes 20–30 min to research against shifting issuer rules, and the personal financial data required to evaluate properly should never leave your machine.',
    solution: 'Five structured modes routed automatically by a `/card-ops` skill: evaluate, compare, scan, optimize, tracker. Reference docs codify 25+ issuer rules (Chase 5/24, Amex pop-up jail, Citi 48-month, Barclays 6/24, etc.), points valuations, and application timing. Strict .gitignore data contract separates user data (profile, statements, reports, cards.md) from the committed system layer (modes, docs, scripts, templates).',
    metrics: [
      { v: '5', k: 'Routed modes' }, { v: '25+', k: 'Issuer rules codified' },
      { v: '0', k: 'Cloud calls for PII' }, { v: 'MIT', k: 'License' },
    ],
  },
  {
    title: 'session-sounds: Identity for Parallel AI Sessions',
    tag: 'Open source · 2026',
    stack: ['Python (stdlib)', 'WAV', 'PowerShell', 'zsh/bash', 'VS Code'],
    desc: 'Every Claude Code / Codex session gets a named terminal tab + a unique notification sound, deduplicated across concurrent sessions, so you can run five in parallel and always know which one finished.',
    href: 'https://github.com/ChrisPachulski/session-sounds', category: 'open',
    challenge: 'Terminal tab naming is the #1 UX pain point for Claude Code power users running parallel sessions (tracked in anthropics/claude-code#7229). Generic notification tools focus on gamification rather than the actual problem: telling your sessions apart.',
    solution: 'Hook-driven session identity: names the terminal tab, plays per-response sounds, deduplicates assignments across concurrent sessions, and ships event-type variants for completion, error, and approval prompts. Zero runtime dependencies (Python stdlib only), one-command installer for Windows, macOS, and Linux, and supports both Claude Code and Codex (including Codex on Windows, which almost no tools do).',
    metrics: [
      { v: '0', k: 'Runtime deps' }, { v: '3', k: 'OSes supported' },
      { v: '2', k: 'Agents (CC + Codex)' }, { v: 'MIT', k: 'License' },
    ],
  },
  {
    title: 'clarity: Plan Maintenance for AI Agents',
    tag: 'Open source · 2026',
    stack: ['Claude Code', 'MCP', 'Markdown', 'Mermaid', 'DuckDB'],
    desc: "Scans an agent's plans/ directory, classifies each plan by staleness, extracts the decisions worth keeping into DECISIONS.md + memory, archives or prunes the rest.",
    href: 'https://github.com/ChrisPachulski/clarity', category: 'open',
    challenge: 'AI coding agents generate plan files every session. They pile up into a graveyard and nobody deletes them because the design decisions buried inside might still matter later.',
    solution: 'Five-step process: inventory → classify (active / completed / stale / dormant) → extract decisions into DECISIONS.md + MCP memory → archive-or-prune into dated folders → report. Active plans (modified today or in the current session) are never touched. Agent-agnostic: Claude Code integration ships, adapting to Codex/Gemini/Copilot means pointing the slash command at that agent\'s plans directory.',
    metrics: [
      { v: '5', k: 'Classification steps' }, { v: '4', k: 'Staleness tiers' },
      { v: '2', k: 'Archival destinations' }, { v: 'MIT', k: 'License' },
    ],
  },
  {
    title: 'dream: Memory Consolidation for AI Agents',
    tag: 'Open source · 2026',
    stack: ['Python', 'MCP', 'DuckDB', 'YAML frontmatter', 'Claude Code'],
    desc: 'Audits dual-store memory (MCP semantic store + file-based memory/*.md), merges duplicates, decays stale entries, flags sticky memories nobody reinforces, and repairs the MEMORY.md index.',
    href: 'https://github.com/ChrisPachulski/dream', category: 'open',
    challenge: 'Long-running AI agents accumulate memories in two places: MCP vector stores and file-based markdown. Over months duplicates pile up, orphans drift, and importance rotates. No existing tool audits both stores together.',
    solution: 'Two-phase audit with 15 discrete steps. Phase 1 scans the MCP store: inventory, dry-run health report, merge near-duplicates, review stale / low-importance / sticky / snoozed entries, execute decay/boost/prune. Phase 2 scans the file store: orphan detection, intra-file + cross-store duplicate detection, path and code-reference validation, MEMORY.md index maintenance. User-type memories are protected throughout.',
    metrics: [
      { v: '15', k: 'Audit steps' }, { v: '2', k: 'Memory stores' },
      { v: '6', k: 'Review categories' }, { v: 'MIT', k: 'License' },
    ],
  },
  {
    title: 'ghscope: GitHub Repo Intelligence CLI',
    tag: 'Open source · 2026',
    stack: ['Python 3.12+', 'gh CLI', 'Rich', 'Click'],
    desc: 'Point it at any GitHub repo, get a signal-dense scorecard: review coverage, reviewer concentration, bus factor, commit velocity, release cadence, first-timer retention, and the odds your PR will merge.',
    href: 'https://github.com/ChrisPachulski/ghscope', category: 'open',
    challenge: 'Judging a new GitHub repo by eyeballing PRs and contributors is slow. "Is this repo healthy? Who gatekeeps reviews? What are my odds a PR gets merged?" takes 20+ clicks per repo.',
    solution: 'Single-command scorecard plus five focused sub-commands (triage, review, contribs, health, assess) built on top of the `gh` CLI you already have authenticated. Every signal comes with a value, a read-out, and a human-readable interpretation ("single point of failure", "sole gatekeeper", "very slow triage"). Useful for deciding whether to contribute, whether to depend on, or what maintainer burden you\'re taking on.',
    metrics: [
      { v: '6', k: 'Commands' }, { v: '20+', k: 'Scored signals' },
      { v: 'pip', k: 'Install' }, { v: 'MIT', k: 'License' },
    ],
  },
  {
    title: 'Jira → Airflow DAG Generator',
    tag: 'Open source · 2022',
    stack: ['Airflow', 'Jira API', 'ClickHouse SQL', 'Python'],
    desc: 'Auto-extract Jira issues, orchestrate tracking + reporting, surface timely insight for stakeholders.',
    href: 'https://github.com/ChrisPachulski/jira_airflow_generator', category: 'open',
    challenge: 'Jira issue tracking across teams was a manual mess.',
    solution: 'Automates extraction, tracking, and reporting of Jira issues using Apache Airflow. Real-time DAGs push clean data into ClickHouse for dashboarding.',
    metrics: [{ v: 'auto', k: 'DAG gen' }, { v: 'real', k: 'Time tracking' }, { v: '∞', k: 'Teams served' }, { v: 'MIT', k: 'License' }],
  },
  {
    title: 'Python Utility Toolkit',
    tag: 'Open source · 2021',
    stack: ['Python', 'GCP', 'Salesforce', 'Genesys', 'SharePoint'],
    desc: 'A batteries-included library for my day-job: GCP, Salesforce, SharePoint, Genesys API, all in one import.',
    href: 'https://github.com/ChrisPachulski/py_toolkit', category: 'open',
    challenge: 'Connecting disparate data sources for fundamental access and aggregation.',
    solution: 'Centralized utility library that maps every internal API endpoint into a clean Python interface, so reports can ship in minutes instead of hours.',
    metrics: [{ v: '4', k: 'Integrations' }, { v: '∞', k: 'Reuse' }, { v: 'MIT', k: 'License' }, { v: '1', k: 'import statement' }],
  },
  {
    title: 'Consumer Edge: Brand / NAICS Auto-Tagging Pipeline',
    tag: 'Data Analyst · Sep 2019 – Mar 2021',
    stack: ['R', 'tidyverse', 'RSelenium', 'BigQuery', 'Google Sheets API', 'Digital Ocean', 'rvest', 'Looker'],
    desc: 'Automated my own job. 23 R scripts, ~33K LOC, replacing manual brand classification with a scraping + rule-based NLP pipeline feeding a credit-card transaction panel used by banks.',
    href: null, category: 'ic',
    challenge: "Consumer Edge sold credit-card transaction analytics to financial institutions. The bottleneck was humans. Every new brand had to be looked up, NAICS-classified, and channel-assigned by hand before it could enter a client dashboard. Onboarding lagged, accuracy varied by analyst, and I was the constraint.",
    solution: "Built a full R/tidyverse pipeline: RSelenium on a remote Docker chromedriver farm (Digital Ocean) scrapes Google results and company \"About Us\" pages; a large rule-based NLP classifier runs against the scraped text to assign NAICS codes and channels; Selenium form-fills auto-submit the resulting brand entries back into CEI's internal platform. BigQuery and Google Sheets as the data layer, a Friday publishment bot for weekly deliverables, and an ARIMA model for forward-looking brand demand signals. 48 industry verticals covered. Repo is literally named \"Automating_My_Position.\"",
    metrics: [{ v: '20×', k: 'Brand entries / week' }, { v: '+20%', k: 'Tagging accuracy' }, { v: '33K', k: 'LOC of R authored' }, { v: '48', k: 'Industry verticals' }],
  },
];

const CATEGORIES = [
  { id: 'all',        label: 'All projects',  filter: () => true },
  { id: 'founded',    label: 'Founded',       filter: p => p.category === 'founded' },
  { id: 'ic',         label: 'IC work',       filter: p => p.category === 'ic' },
  { id: 'consulting', label: 'Consulting',    filter: p => p.category === 'consulting' },
  { id: 'open',       label: 'Open source',   filter: p => p.category === 'open' },
];

export function Projects() {
  const [cat, setCat] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const filtered = PROJECTS.filter(CATEGORIES.find(c => c.id === cat).filter);
  const tabsRef = useRef(null);
  const wrapRef = useRef(null);

  const selectTab = (id, { focus = false } = {}) => {
    setCat(id);
    setExpanded(null);
    if (focus && tabsRef.current) {
      const btn = tabsRef.current.querySelector(`#tab-${id}`);
      if (btn) btn.focus();
    }
  };

  const onTabKeyDown = (e) => {
    const idx = CATEGORIES.findIndex(c => c.id === cat);
    let next = null;
    if (e.key === 'ArrowRight') next = (idx + 1) % CATEGORIES.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + CATEGORIES.length) % CATEGORIES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = CATEGORIES.length - 1;
    else return;
    e.preventDefault();
    selectTab(CATEGORIES[next].id, { focus: true });
  };
  useEffect(() => {
    const el = tabsRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const update = () => {
      const overflows = el.scrollWidth - el.clientWidth > 1;
      const atStart = el.scrollLeft <= 1;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      const flags = [];
      if (overflows && !atStart) flags.push('start');
      if (overflows && !atEnd) flags.push('end');
      wrap.setAttribute('data-overflow', flags.join(' '));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = 'ResizeObserver' in window ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, []);
  return (
    <section id="portfolio">
      <div className="wrap">
        <div className="section-label reveal"><span className="num">03</span> / case studies &nbsp; <span className="mute">// where I've delivered value</span></div>
        <div className="about-grid" style={{ marginBottom: 40 }}>
          <div>
            <h2 className="reveal section-headline">
              A curated list of the work I'd show you <em>over coffee.</em>
            </h2>
            <p className="dim reveal section-lede" data-delay="1">
              Projects where I've built something that outlasted me, or moved a number that mattered. Click any row for the challenge, the shape of the solution, and the numbers.
            </p>
          </div>
          <div className="reveal" data-delay="2">
            <div className="projects-tabs-wrap" ref={wrapRef}>
              <div
                className="projects-tabs"
                role="tablist"
                aria-label="Filter projects by category"
                aria-orientation="horizontal"
                ref={tabsRef}
              >
                {CATEGORIES.map(c => {
                  const count = PROJECTS.filter(c.filter).length;
                  const selected = cat === c.id;
                  return (
                    <button
                      key={c.id}
                      id={`tab-${c.id}`}
                      role="tab"
                      type="button"
                      aria-selected={selected}
                      aria-controls="projects-panel"
                      tabIndex={selected ? 0 : -1}
                      className={selected ? 'active' : ''}
                      onClick={() => selectTab(c.id)}
                      onKeyDown={onTabKeyDown}
                    >
                      {c.label} <span className="count">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div
          id="projects-panel"
          role="tabpanel"
          aria-labelledby={`tab-${cat}`}
          className="project-list reveal"
          data-delay="2"
        >
          {filtered.map((p, i) => {
            const isOpen = expanded === i;
            const detailId = `project-${i}-detail`;
            const toggle = () => setExpanded(isOpen ? null : i);
            const onKeyDown = (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
            };
            return (
              <Fragment key={p.title}>
                <div
                  className={`project-row${isOpen ? ' expanded' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  aria-controls={detailId}
                  onClick={toggle}
                  onKeyDown={onKeyDown}
                >
                  <div className="pidx">{String(i+1).padStart(2, '0')}.</div>
                  <div>
                    <div className="ptitle">{p.title}</div>
                    <div className="pdesc">{p.desc}</div>
                  </div>
                  <div className="pmeta">
                    <span className="tag">{p.tag}</span>
                    <span className="pchevron" aria-hidden="true">›</span>
                  </div>
                </div>
                {isOpen && (
                  <div
                    id={detailId}
                    className="project-detail"
                    role="region"
                    aria-label={`${p.title}: details`}
                  >
                    <div className="block">
                      <h4>Challenge</h4><p>{p.challenge}</p>
                      <h4>Approach</h4><p>{p.solution}</p>
                      <h4>Stack</h4>
                      <div className="stack">{p.stack.map(s => <span key={s}>{s}</span>)}</div>
                      {p.href && (
                        <div style={{ marginTop: 20 }}>
                          <a href={p.href} target="_blank" rel="noopener noreferrer" className="btn mono">Visit ↗</a>
                        </div>
                      )}
                    </div>
                    <div className="block">
                      <h4>By the numbers</h4>
                      <div className="metrics">
                        {p.metrics.map(m => (
                          <div key={m.k}><div className="v">{m.v}</div><div className="k">{m.k}</div></div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const EXPERIENCE = [
  { hash:'c0ffee1', role:'Senior Data Scientist', company:'Wizards of the Coast', time:'Nov 2025 to present', current: true, bullets:[
    {t:'Partner with product strategy, sales, finance, and economics to support Magic: The Gathering growth'},
    {t:'Build scalable reporting to manage revenue across channels, projects, and set cycles'},
    {t:'Deep-dive profitability analyses around pricing, inventory, and revenue recognition'},
    {t:'Reconcile revenue numbers alongside economists and financial analysts; explain findings with clear visuals'},
  ]},
  { hash:'b92d81a', role:'Senior Data Analyst', company:'The Providencia Group', time:'Sep 2024 to Nov 2025', bullets:[
    {t:'End-to-end reporting pipelines for the National Call Center across Genesys, Salesforce, SharePoint, SuccessKPI'},
    {t:'Rebuilt NCC reporting into a modular, version-controlled Python pipeline'},
    {t:'Dynamic staffing models using occupancy, shrinkage, and contact pacing'},
  ]},
  { hash:'7ec4a09', role:'Senior Business Intelligence Analyst', company:'Ad.Net', time:'Dec 2021 to Sep 2024', bullets:[
    {t:'Looker dashboards for campaign + ad group performance'},
    {t:'Centralized Python library for reporting, querying, and exploration'},
    {t:'Jira API templates and scripts for automated report generation'},
    {t:'Salesforce + SimilarWeb integrated to uncover opportunities'},
    {t:'Docker, Anaconda, ClickHouse, PostgreSQL, R/H2O for forecasting'},
  ]},
  { hash:'3a1b7d2', role:'Senior BI Reporting Specialist (Consultant)', company:'Mozilla Firefox', time:'Apr 2024 to Aug 2024', bullets:[
    {t:'Looker dashboards for real-time digital ad performance'},
    {t:'Funnel analysis optimizing conversion rates'},
    {t:'Automated reporting, reducing manual effort significantly'},
    {t:'Ad-hoc analyses on audience behavior and ad spend'},
  ]},
  { hash:'f0c2ec1', role:'Data Engineer', company:'Spins LLC', time:'Mar 2021 to Dec 2021', bullets:[
    {t:'Automated testing scripts ensuring data accuracy across platforms'},
    {t:'Optimized data operations, sourcing, and software performance'},
    {t:'Enhanced QA processes through automated test frameworks'},
  ]},
  { hash:'84e917b', role:'Data Analyst', company:'Consumer Edge Research', time:'Sep 2019 to Mar 2021', bullets:[
    {t:'Credit card transaction data: automated brand entry from 15→300 / week', k:'20×'},
    {t:'Daily calls with financial institutions for onboarding and reviews'},
    {t:'Custom Looker dashboards for external client presentations'},
    {t:'Improved NLP brand tagging: model accuracy up 20%', k:'+20%'},
  ]},
  { hash:'a1f3e4c', role:'Co-Founder', company:'MTGBAN', time:'2017 to 2025', bullets:[
    {t:'Hobby-turned-business: built a Magic: The Gathering arbitrage engine while working day-jobs'},
    {t:'500+ paying customers using aggregated pricing', k:'500+'},
    {t:'Drove over $1.2M annual revenue for Magic: the Gathering products', k:'$1.2M'},
    {t:'Designed and implemented BigQuery warehouse from the ground up'},
  ]},
];

const EDUCATION = [
  { hash:'edu25b', role:'Google Advanced Data Analytics Certification', company:'Google', time:'2025', bullets:[{t:'Capstone: portfolio-ready ML case study'}] },
  { hash:'edu25a', role:'Google Data Analytics Certification', company:'Google', time:'2025', bullets:[{t:'Foundations of data analysis and BI tooling'}] },
  { hash:'edu22a', role:'Full R Track Certifications', company:'Business Science University', time:'2022', bullets:[{t:'Shiny apps, time-series forecasting, tidymodels'}] },
  { hash:'edu19a', role:'Master of Business Administration (MBA)', company:'Hofstra University', time:'2019', bullets:[] },
  { hash:'edu17a', role:'BA, Classical Languages & Biology', company:'Creighton University', time:'2017', bullets:[{t:'Yes, really: Latin, Greek, and biochem.'}] },
];

/* Individual commit card — watches for itself coming into view for the reveal. */
function Commit({ c, side, delayOffset }) {
  const reduced = usePrefersReducedMotion();
  const [ref, inView] = useInView(0.25);
  const revealStyle = reduced ? undefined : {
    opacity: inView ? 1 : 0,
    transform: inView ? 'none' : `translateX(${side === 'left' ? -24 : 24}px) translateY(12px)`,
    transition: `opacity 0.7s cubic-bezier(.2,.7,.2,1) ${delayOffset}s, transform 0.7s cubic-bezier(.2,.7,.2,1) ${delayOffset}s`,
  };
  return (
    <div
      ref={ref}
      className={`commit side-${side}${c.current ? ' current' : ''}`}
      style={revealStyle}
    >
      <div className="hash">commit {c.hash}{c.current && <span className="accent"> · (HEAD)</span>}</div>
      <div className="role">{c.role}</div>
      <div className="company">{c.company}</div>
      <div className="when">{c.time}</div>
      {c.bullets.length > 0 && (
        <ul>
          {c.bullets.map((b, j) => (
            <li key={j}>
              {b.t.split(/(\*\*[^*]+\*\*|\b\d+[×%+]|\$[\d.]+M)/g).map((part, k) => {
                if (/^\$[\d.]+M|\d+[×%+]/.test(part)) return <strong key={k} style={{color:'var(--accent)'}}>{part}</strong>;
                return part;
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const RESUME_MODES = [
  { id: 'experience', label: 'Experience' },
  { id: 'education',  label: 'Education' },
];

function ResumeToggle({ mode, setMode }) {
  const refs = useRef([]);
  const onKeyDown = (e) => {
    const i = RESUME_MODES.findIndex(m => m.id === mode);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = RESUME_MODES[(i + 1) % RESUME_MODES.length];
      setMode(next.id);
      refs.current[(i + 1) % RESUME_MODES.length]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = RESUME_MODES[(i - 1 + RESUME_MODES.length) % RESUME_MODES.length];
      setMode(prev.id);
      refs.current[(i - 1 + RESUME_MODES.length) % RESUME_MODES.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setMode(RESUME_MODES[0].id);
      refs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setMode(RESUME_MODES[RESUME_MODES.length - 1].id);
      refs.current[RESUME_MODES.length - 1]?.focus();
    }
  };
  return (
    <div className="resume-toggle" role="radiogroup" aria-label="Resume timeline view">
      {RESUME_MODES.map((m, i) => {
        const checked = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            ref={el => { refs.current[i] = el; }}
            className={checked ? 'active' : ''}
            onClick={() => setMode(m.id)}
            onKeyDown={onKeyDown}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export function Resume() {
  const [mode, setMode] = useState('experience');
  const list = mode === 'experience' ? EXPERIENCE : EDUCATION;
  return (
    <section id="resume" className="flow">
      <div className="wrap">
        <div className="section-label reveal"><span className="num">04</span> / resume &nbsp; <span className="mute">// git log --oneline --graph career</span></div>
        <div className="about-grid" style={{ marginBottom: 40 }}>
          <div>
            <h2 className="reveal section-headline tight">
              Seven years of <em>shipping</em>.
            </h2>
            <p className="dim reveal section-lede" data-delay="1">
              A git log of the work. Most recent at top, origin/HEAD marked. Financial services, digital marketing, CPG, tech, plus my own startup since 2017.
            </p>
          </div>
          <div className="reveal" data-delay="2">
            <ResumeToggle mode={mode} setMode={setMode} />
            <a href="/cv/Chris_Pachulski_Resume.pdf" className="btn mono" download>Download CV (PDF) ↓</a>
          </div>
        </div>
        <div className="gitlog serpentine">
          {list.map((c, i) => {
            const side = i % 2 === 0 ? 'left' : 'right';
            return (
              <Fragment key={c.hash}>
                <Commit c={c} side={side} delayOffset={0} />
                {i < list.length - 1 && (
                  <svg className="git-connector" viewBox="0 0 100 180" preserveAspectRatio="none" aria-hidden="true" style={{ '--i': i }}>
                    {(() => {
                      const d = side === 'left'
                        ? "M 40 0 C 40 90, 98 130, 98 80 L 98 25 C 98 -25, 82 -50, 70 -70"
                        : "M 60 0 C 60 90, 2 130, 2 80 L 2 25 C 2 -25, 18 -50, 30 -70";
                      return (<>
                        <path d={d} />
                        <path d={d} className="glow-path glow-outer" pathLength="1000" />
                        <path d={d} className="glow-path glow-mid"   pathLength="1000" />
                        <path d={d} className="glow-path glow-core"  pathLength="1000" />
                      </>);
                    })()}
                  </svg>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}


/* Article card with mouse-follow radial glow. Real anchor for crawlers + cmd-click. */
function ArticleCard({ a, onOpen }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  const handle = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
    e.preventDefault();
    onOpen(a.slug);
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(a.slug); }
  };
  return (
    <a
      href={articlePath(a.slug)}
      className="article"
      aria-haspopup="dialog"
      ref={ref}
      onMouseMove={onMove}
      onClick={handle}
      onKeyDown={onKey}
    >
      <div className="cats">{a.cats}</div>
      <h4>{a.title}</h4>
      <div className="meta">
        <span>{a.date}</span>
        <span>·</span>
        <span>{a.read} read</span>
        <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
      </div>
    </a>
  );
}

const FEATURED = {
  'autonomous-research-loop':  ResearchLoopCard,
  'at-home-media':             AtHomeMediaCard,
  'opinionated-obsidian-wiki': ObsidianWikiCard,
};

export function Writing({ onArticleOpen }) {
  const openInFlow = (slug) => {
    if (onArticleOpen) onArticleOpen(slug);
  };
  return (
    <section id="writing" className="flow">
      <div className="wrap">
        <div className="section-label reveal"><span className="num">05</span> / writing &nbsp; <span className="mute">// {POSTS.length} posts</span></div>
        <div style={{ maxWidth: 720, marginBottom: 40 }}>
          <h2 className="reveal section-headline tight">
            Field notes from the <em>warehouse.</em>
          </h2>
          <p className="dim reveal section-lede wide" data-delay="1">
            Practical write-ups: R, Python, SQL, and the occasional Docker-assisted life hack. I write them as I solve them.
          </p>
        </div>
        <div className="writing-grid reveal" data-delay="2">
          {POSTS.map(a => {
            const Card = FEATURED[a.slug] || ArticleCard;
            return <Card key={a.slug} a={a} onOpen={openInFlow} />;
          })}
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name:'', email:'', msg:'' });
  const submit = async (e) => {
    e.preventDefault();
    if (!(form.name && form.email && form.msg)) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('https://formspree.io/f/xldjwezk', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, message: form.msg }),
      });
      if (res.ok) setSent(true);
      else setError('Something went wrong. Email pachun95@gmail.com directly.');
    } catch {
      setError('Network error. Email pachun95@gmail.com directly.');
    } finally {
      setSending(false);
    }
  };
  return (
    <section className="contact" id="contact">
      <div className="wrap">
        <div className="contact-grid">
          <div>
            <div className="section-label reveal" style={{marginBottom:24}}><span className="num">06</span> / contact</div>
            <h2 className="reveal section-headline">Let's <em>go.</em></h2>
            <p className="dim reveal contact-lede" data-delay="1">
              Hiring for analytics, BI, or data-engineering work? Need help designing a warehouse from scratch, or rescuing one that's on fire? I answer every genuine email.
            </p>
            <div className="fact-list reveal" data-delay="2" style={{ marginTop: 0 }}>
              <div className="fact"><span>email</span><a href="mailto:pachun95@gmail.com">pachun95@gmail.com</a></div>
              <div className="fact"><span>linkedin</span><a href="https://www.linkedin.com/in/chris-pachulski/" target="_blank" rel="noopener noreferrer">in/chris-pachulski</a></div>
              <div className="fact"><span>github</span><a href="https://github.com/ChrisPachulski" target="_blank" rel="noopener noreferrer">github.com/ChrisPachulski</a></div>
            </div>
          </div>
          <form className="contact-form reveal" data-delay="2" onSubmit={submit}>
            {!sent ? (
              <>
                <div style={{ display:'grid', gap: 4 }}>
                  <label>Name</label>
                  <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} placeholder="Ada Lovelace" required />
                </div>
                <div style={{ display:'grid', gap: 4 }}>
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} placeholder="you@company.com" required />
                </div>
                <div style={{ display:'grid', gap: 4 }}>
                  <label>What's on your mind?</label>
                  <textarea value={form.msg} onChange={e=>setForm({...form, msg:e.target.value})} placeholder="A warehouse on fire, a dashboard to rescue, a coffee chat..." required />
                </div>
                <button className="btn btn-primary mono" type="submit" disabled={sending}>
                  {sending ? 'Sending…' : <>Send message <span className="arrow">→</span></>}
                </button>
                {error && (
                  <div className="contact-error">{error}</div>
                )}
              </>
            ) : (
              <div style={{ padding:'32px 8px', textAlign:'center' }}>
                <div className="accent contact-success-glyph">✓</div>
                <div className="contact-success-title">Message received.</div>
                <div className="dim">I'll reply within 48 hours, usually faster.</div>
              </div>
            )}
          </form>
        </div>
        <footer className="footer">
          <div>© Chris Pachulski 2026 · Built by hand, no frameworks harmed.</div>
          <div>/* hire me, mentor me, or just chat MTG: same mailbox. */</div>
        </footer>
      </div>
    </section>
  );
}
