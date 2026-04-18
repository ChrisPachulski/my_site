import { Fragment, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPost } from '../lib/blog.js';

const PROJECTS = [
  {
    title: 'Wizards of the Coast — MTG Economics & Analytics Platform',
    tag: 'Sr Economic Analyst · Nov 2025 – present',
    stack: ['Python', 'Snowflake', 'pyfixest', 'statsmodels', 'DuckDB', 'Smartsheet', 'MCP', 'Claude Code'],
    desc: 'Econometrics and internal tooling for Magic: The Gathering — pricing, cannibalization, POS weighting, and revenue reconciliation across channels and set cycles.',
    href: null,
    category: 'ic',
    challenge: 'MTG spans channels, regions, and set cycles at billion-dollar scale. Decisions about pricing, inventory, mass-market expansion, and product mix need econometric rigor — not dashboards that say "line go up" — and the next analyst needs to reproduce the work.',
    solution: "Built out an internal Python platform of 10 installable packages — Snowflake with role-based warehouse routing, a Sales Rate Index pipeline (IPF-raked POS weights + velocity/sell-through indices + synthetic control), an MTGJSON wrapper with a DuckDB cache, Smartsheet sync, Microsoft 365 auth, and more — that power the long-running analyses. Shipped a mass-market vs. core-hobby cannibalization study running 28+ identification strategies (TWFE, first-differenced, Bartik IV, distance IV, Oster bounds, synthetic control, causal forest, Bayesian) on a 38-MSA panel and a 200–600 MSA event-tracking panel. Built a price-elasticity model on an international market with clustered standard errors feeding 2026 planning scenarios. Stood up three MCP servers so AI agents can safely query Snowflake, MTGJSON, and project memory. Partners: product strategy, sales, finance, and economists.",
    metrics: [
      { v: '10',   k: 'Internal Python packages' },
      { v: '28+',  k: 'Econometric strategies' },
      { v: '600',  k: 'MSAs in EventLink panel' },
      { v: '3',    k: 'MCP servers shipped' },
    ],
  },
  {
    title: 'The Providencia Group — ORR National Call Center Platform',
    tag: 'Sr Data Analyst · Sep 2024 – Nov 2025',
    stack: ['Python', 'R', 'Genesys Cloud', 'Salesforce', 'SharePoint', 'Microsoft 365', 'Unanet', 'SuccessKPI', 'PowerShell'],
    desc: "Data + reporting platform for a federal children's-safety hotline — trafficking, abuse, runaway, and safety case reporting for the Office of Refugee Resettlement.",
    href: null,
    category: 'ic',
    challenge: 'The ORR National Call Center ran on undocumented scripts and brittle spreadsheets. Trafficking, abuse, and runaway reports — and the staffing decisions behind them — were being made on stale numbers, with no reproducibility and no clean handoff path for the next analyst.',
    solution: 'Designed and shipped two internal Python packages (tpg_functions + tpg_reporting) plus a parallel R mirror, covering Genesys, Salesforce, SharePoint, Outlook/Teams, and Unanet. Wrote 19 production ETL scripts on 20 scheduled jobs spanning daily, weekly, and monthly cadences. Built agent performance bucketing (occupancy + idle/interacting/not-responding components), cross-system ID validation, and missing-data monitoring. A single PowerShell installer bootstraps the full stack — Python, VS Code, 270+ deps, isolated venv — end-to-end for the next analyst.',
    metrics: [
      { v: '168',  k: 'Utility functions authored' },
      { v: '19',   k: 'Production ETL scripts' },
      { v: '20',   k: 'Scheduled jobs (24/7)' },
      { v: '6',    k: 'External systems integrated' },
    ],
  },
  {
    title: 'MTGBAN — Collectibles Pricing & Forecasting Platform',
    tag: 'Co-founder · 2017 – 2025',
    stack: ['R', 'tidyverse', 'BigQuery', 'H2O AutoML', 'Prophet', 'RSelenium', 'Docker', 'Digital Ocean', 'Go'],
    desc: 'Eight years of continuous shipping. 38+ production R scripts (~26K LOC) running a multi-TCG pricing, forecasting, and distribution platform for 500+ paying subscribers.',
    href: 'https://www.mtgban.com/',
    category: 'founded',
    challenge: 'Collectibles markets fragment across 20+ marketplaces, six different trading-card games, and multiple grading authorities (PSA, Beckett). Pricing data is dirty, latent, and sold piecemeal. Serious traders, stores, and speculators lose spread to information asymmetry.',
    solution: "Built the full stack from scratch. A BigQuery warehouse (gaeas-cradle) anchors the data layer. RSelenium + httr/rvest scrapers pull every major vendor — TCGplayer, Card Kingdom, Cardsphere, CK Buylist, MTGJSON, Scryfall — across MTG, Pokemon, Yu-Gi-Oh, One Piece, Lorcana, and Flesh and Blood, plus PSA and Beckett for graded cards. Forecasting is an H2O AutoML ensemble (GBM + Deep Learning) alongside Prophet for time-series. Community sentiment on Discord is mined with tidytext + NRC. A Twitter bot auto-distributes signals, MTGBAN's own API feeds paying subscribers, and a Go dashboard surfaces it all. Dockerized and running 24/7 on Digital Ocean since 2017.",
    metrics: [
      { v: '$1.2M', k: 'Annual revenue' },
      { v: '500+',  k: 'Paying subscribers' },
      { v: '8 yrs', k: 'In continuous production' },
      { v: '6',     k: 'TCGs covered' },
    ],
  },
  {
    title: 'Mozilla Firefox — Ad Performance Analytics',
    tag: 'Consultant · 2024',
    stack: ['Looker', 'SQL', 'Funnel analysis'],
    desc: 'Real-time ad performance dashboards + funnel analysis for a top-5 browser.',
    href: null,
    category: 'consulting',
    challenge: 'Ad spend decisions were lagging the market by weeks. Conversion funnels were opaque to stakeholders.',
    solution: 'Developed Looker dashboards with real-time insight into digital ad performance. Ran funnel analysis to optimize conversion rates and automated the reporting workflow.',
    metrics: [
      { v: '4 mo', k: 'Engagement' },
      { v: '12',   k: 'Dashboards shipped' },
      { v: '-40%', k: 'Manual effort' },
      { v: 'real', k: 'Time ad insights' },
    ],
  },
  {
    title: 'Ad.Net — Centralized Python Reporting Library',
    tag: 'Sr BI Analyst · 2021–2024',
    stack: ['Python', 'Looker', 'ClickHouse', 'Docker', 'Jira API'],
    desc: 'One Python library replaced dozens of one-off scripts across the BI team.',
    href: null,
    category: 'ic',
    challenge: 'Every analyst was writing their own half-working report. Maintenance cost was eating the team.',
    solution: 'Designed a centralized, versioned Python library for querying, reporting, and exploration. Integrated Salesforce + SimilarWeb signals, built Looker dashboards for campaign performance, and automated Jira report generation.',
    metrics: [
      { v: '40+',   k: 'Looker dashboards' },
      { v: '60%',   k: 'Reporting time ↓' },
      { v: '1',     k: 'Source of truth' },
      { v: '3 yrs', k: 'In production' },
    ],
  },
  {
    title: 'Jira → Airflow DAG Generator',
    tag: 'Open source · 2022',
    stack: ['Airflow', 'Jira API', 'ClickHouse SQL', 'Python'],
    desc: 'Auto-extract Jira issues, orchestrate tracking + reporting, surface timely insight for stakeholders.',
    href: 'https://github.com/ChrisPachulski/jira_airflow_generator',
    category: 'open',
    challenge: 'Jira issue tracking across teams was a manual mess.',
    solution: 'Automates extraction, tracking, and reporting of Jira issues using Apache Airflow. Real-time DAGs push clean data into ClickHouse for dashboarding.',
    metrics: [
      { v: 'auto', k: 'DAG gen' },
      { v: 'real', k: 'Time tracking' },
      { v: '∞',    k: 'Teams served' },
      { v: 'MIT',  k: 'License' },
    ],
  },
  {
    title: 'Python Utility Toolkit',
    tag: 'Open source · 2021',
    stack: ['Python', 'GCP', 'Salesforce', 'Genesys', 'SharePoint'],
    desc: 'A batteries-included library for my day-job: GCP, Salesforce, SharePoint, Genesys API, all in one import.',
    href: 'https://github.com/ChrisPachulski/py_toolkit',
    category: 'open',
    challenge: 'Connecting disparate data sources for fundamental access and aggregation.',
    solution: 'Centralized utility library that maps every internal API endpoint into a clean Python interface, so reports can ship in minutes instead of hours.',
    metrics: [
      { v: '4',  k: 'Integrations' },
      { v: '∞',  k: 'Reuse' },
      { v: 'MIT',k: 'License' },
      { v: '1',  k: 'import statement' },
    ],
  },
  {
    title: 'Consumer Edge — Brand / NAICS Auto-Tagging Pipeline',
    tag: 'Data Analyst · Sep 2019 – Mar 2021',
    stack: ['R', 'tidyverse', 'RSelenium', 'BigQuery', 'Google Sheets API', 'Digital Ocean', 'rvest', 'Looker'],
    desc: 'Automated my own job. 23 R scripts, ~33K LOC, replacing manual brand classification with a scraping + rule-based NLP pipeline feeding a credit-card transaction panel used by banks.',
    href: null,
    category: 'ic',
    challenge: "Consumer Edge sold credit-card transaction analytics to financial institutions. The bottleneck was humans — every new brand had to be looked up, NAICS-classified, and channel-assigned by hand before it could enter a client dashboard. Onboarding lagged, accuracy varied by analyst, and I was the constraint.",
    solution: "Built a full R/tidyverse pipeline: RSelenium on a remote Docker chromedriver farm (Digital Ocean) scrapes Google results and company \"About Us\" pages; a large rule-based NLP classifier runs against the scraped text to assign NAICS codes and channels; Selenium form-fills auto-submit the resulting brand entries back into CEI's internal platform. BigQuery and Google Sheets as the data layer, a Friday publishment bot for weekly deliverables, and an ARIMA model for forward-looking brand demand signals. 48 industry verticals covered. Repo is literally named \"Automating_My_Position.\"",
    metrics: [
      { v: '20×',  k: 'Brand entries / week' },
      { v: '+20%', k: 'Tagging accuracy' },
      { v: '33K',  k: 'LOC of R authored' },
      { v: '48',   k: 'Industry verticals' },
    ],
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
  return (
    <section id="portfolio" data-screen-label="03 Portfolio">
      <div className="wrap">
        <div className="section-label"><span className="num">03</span> / case studies &nbsp; <span className="mute">// where I've delivered value</span></div>
        <div className="skills-grid">
          <div className="skills-intro">
            <h2 style={{ fontFamily:'var(--serif)', fontSize:'clamp(26px,3.2vw,42px)', margin:'0 0 20px', fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.08 }}>
              A curated list of the work I'd show you <em style={{color:'var(--accent)', fontStyle:'italic'}}>over coffee.</em>
            </h2>
            <p className="dim" style={{ fontSize: 15, maxWidth: 440, lineHeight: 1.55 }}>
              Projects where I've built something that outlasted me, or moved a number that mattered. Click any row for the challenge, the shape of the solution, and the numbers.
            </p>
          </div>
          <div>
            <div className="projects-tabs">
              {CATEGORIES.map(c => {
                const count = PROJECTS.filter(c.filter).length;
                return (
                  <button key={c.id} className={cat === c.id ? 'active' : ''} onClick={() => { setCat(c.id); setExpanded(null); }}>
                    {c.label} <span className="count">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="project-list">
              {filtered.map((p, i) => (
                <Fragment key={p.title}>
                  <div
                    className={`project-row${expanded === i ? ' expanded' : ''}`}
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <div className="pidx">{String(i+1).padStart(2, '0')}.</div>
                    <div>
                      <div className="ptitle">{p.title}</div>
                      <div className="pdesc">{p.desc}</div>
                    </div>
                    <div className="pmeta">
                      <span className="tag">{p.tag}</span>
                      <span className="pchevron">›</span>
                    </div>
                  </div>
                  {expanded === i && (
                    <div className="project-detail">
                      <div className="block">
                        <h4>Challenge</h4>
                        <p>{p.challenge}</p>
                        <h4>Approach</h4>
                        <p>{p.solution}</p>
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
                            <div key={m.k}>
                              <div className="v">{m.v}</div>
                              <div className="k">{m.k}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const EXPERIENCE = [
  { hash:'c0ffee1', role:'Senior Economic Analyst', company:'Wizards of the Coast', time:'Nov 2025 — present', current: true, bullets:[
    {t:'Partner with product strategy, sales, finance, and economics to support Magic: The Gathering growth'},
    {t:'Build scalable reporting to manage revenue across channels, projects, and set cycles'},
    {t:'Deep-dive profitability analyses around pricing, inventory, and revenue recognition'},
    {t:'Reconcile revenue numbers alongside economists and financial analysts; explain findings with clear visuals'},
  ]},
  { hash:'b92d81a', role:'Senior Data Analyst', company:'The Providencia Group', time:'Sep 2024 — Nov 2025', bullets:[
    {t:'End-to-end reporting pipelines for the National Call Center across Genesys, Salesforce, SharePoint, SuccessKPI'},
    {t:'Rebuilt NCC reporting into a modular, version-controlled Python pipeline'},
    {t:'Dynamic staffing models using occupancy, shrinkage, and contact pacing'},
  ]},
  { hash:'7ec4a09', role:'Senior Business Intelligence Analyst', company:'Ad.Net', time:'Dec 2021 — Sep 2024', bullets:[
    {t:'Looker dashboards for campaign + ad group performance'},
    {t:'Centralized Python library for reporting, querying, and exploration'},
    {t:'Jira API templates and scripts for automated report generation'},
    {t:'Salesforce + SimilarWeb integrated to uncover opportunities'},
    {t:'Docker, Anaconda, ClickHouse, PostgreSQL, R/H2O for forecasting'},
  ]},
  { hash:'3a1b7d2', role:'Senior BI Reporting Specialist (Consultant)', company:'Mozilla Firefox', time:'Apr 2024 — Aug 2024', bullets:[
    {t:'Looker dashboards for real-time digital ad performance'},
    {t:'Funnel analysis optimizing conversion rates'},
    {t:'Automated reporting, reducing manual effort significantly'},
    {t:'Ad-hoc analyses on audience behavior and ad spend'},
  ]},
  { hash:'f0c2ec1', role:'Data Engineer', company:'Spins LLC', time:'Mar 2021 — Dec 2021', bullets:[
    {t:'Automated testing scripts ensuring data accuracy across platforms'},
    {t:'Optimized data operations, sourcing, and software performance'},
    {t:'Enhanced QA processes through automated test frameworks'},
  ]},
  { hash:'84e917b', role:'Data Analyst', company:'Consumer Edge Research', time:'Sep 2019 — Mar 2021', bullets:[
    {t:'Credit card transaction data — automated brand entry from 15→300 / week', k:'20×'},
    {t:'Daily calls with financial institutions for onboarding and reviews'},
    {t:'Custom Looker dashboards for external client presentations'},
    {t:'Improved NLP brand tagging — model accuracy up 20%', k:'+20%'},
  ]},
  { hash:'a1f3e4c', role:'Co-Founder', company:'MTGBAN', time:'2017 — 2025', bullets:[
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
  { hash:'edu17a', role:'BA, Classical Languages & Biology', company:'Creighton University', time:'2017', bullets:[{t:'Yes, really — Latin, Greek, and biochem.'}] },
];

export function Resume() {
  const [mode, setMode] = useState('experience');
  const list = mode === 'experience' ? EXPERIENCE : EDUCATION;
  return (
    <section id="resume" className="flow" data-screen-label="04 Resume">
      <div className="wrap">
        <div className="section-label"><span className="num">04</span> / resume &nbsp; <span className="mute">// git log --oneline --graph career</span></div>
        <div className="about-grid" style={{ marginBottom: 40 }}>
          <div>
            <h2 style={{ fontFamily:'var(--serif)', fontSize:'clamp(26px,3.2vw,42px)', margin:'0 0 16px', fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.08 }}>
              Seven years of <em style={{color:'var(--accent)', fontStyle:'italic'}}>shipping</em>.
            </h2>
            <p className="dim" style={{ maxWidth: 520, fontSize: 15, lineHeight: 1.55 }}>
              A git log of the work. Most recent at top, origin/HEAD marked. Financial services, digital marketing, CPG, tech — plus my own startup since 2017.
            </p>
          </div>
          <div>
            <div className="resume-toggle">
              <button className={mode==='experience'?'active':''} onClick={()=>setMode('experience')}>Experience</button>
              <button className={mode==='education'?'active':''} onClick={()=>setMode('education')}>Education</button>
            </div>
            <a href="/cv/Chris_Pachulski_Resume.pdf" className="btn mono" download>Download CV (PDF) ↓</a>
          </div>
        </div>
        <div className="gitlog serpentine">
          {list.map((c, i) => {
            const side = i % 2 === 0 ? 'left' : 'right';
            return (
              <Fragment key={c.hash}>
                <div className={`commit side-${side}${c.current ? ' current' : ''}`}>
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
                {i < list.length - 1 && (
                  <svg className="git-connector" viewBox="0 0 100 180" preserveAspectRatio="none" aria-hidden="true">
                    <path d={side === 'left'
                      ? "M 40 0 C 40 90, 98 130, 98 80 L 98 25 C 98 -25, 82 -50, 70 -70"
                      : "M 60 0 C 60 90, 2 130, 2 80 L 2 25 C 2 -25, 18 -50, 30 -70"
                    } />
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

const ARTICLES = [
  { slug: '208-Survived-Opinionated-Obsidian-Wiki',                                            cats: 'Obsidian · Claude Code · YouTube', title: '208 Survived: An Opinionated Obsidian Wiki and the YouTube Pipeline That Feeds It', date: 'Apr 2026', read: '13 min' },
  { slug: 'Adding-a-Brain-to-a-Fork-career-ops-card-ops',                                      cats: 'Claude Code · Personal Tools', title: 'Adding a Brain to a Fork: career-ops, card-ops, and the Compiled-Context Pattern', date: 'Apr 2026', read: '13 min' },
  { slug: 'Four-Terminals-Four-Sounds-session-sounds',                                         cats: 'Claude Code · Codex · Windows', title: 'Four Terminals, Four Sounds: A Tab-Naming and Notification System for Parallel AI Sessions', date: 'Mar 2026', read: '10 min' },
  { slug: 'Building-an-Autonomous-Research-Loop',                                              cats: 'Claude Code · Econometrics · AI Tooling', title: 'Building an Autonomous Research Loop: The Stack, The Rationale, and What I Borrowed From Karpathy and Feynman', date: 'Feb 2026', read: '28 min' },
  { slug: 'Memory-Hygiene-for-Long-Running-AI-Work',                                           cats: 'Claude Code · AI Tooling', title: 'Memory Hygiene for Long-Running AI Work: Anti-Stickiness, Dreams, and Plan Clarity', date: 'Jan 2026', read: '17 min' },
  { slug: 'Automating-Microsoft-365-in-Python-Without-an-Azure-App-Registration',              cats: 'Python · Microsoft 365', title: 'Automating Microsoft 365 in Python Without an Azure App Registration',      date: 'Dec 2025', read: '15 min' },
  { slug: 'Streamlining-Smartsheet-with-smartsheet_utils',                                     cats: 'Python · Smartsheet', title: 'Streamlining Smartsheet with smartsheet_utils: A pandas-First Python Wrapper', date: 'Dec 2025', read: '17 min' },
  { slug: 'Production-Python-on-Windows-Task-Scheduler',                                       cats: 'Python · Windows',    title: 'Production Python on Windows Task Scheduler: The Dual-Logging Pattern',        date: 'Nov 2025', read: '10 min' },
  { slug: 'The-IDs-Dont-Match-Cross-System-Reconciliation-Genesys-Salesforce',                 cats: 'Python · Salesforce · Genesys', title: "The IDs Don't Match: Cross-System Reconciliation Between Genesys and Salesforce", date: 'Oct 2025', read: '10 min' },
  { slug: 'Classifying-Call-Center-Agents-with-Genesys-API',                                   cats: 'Python · Genesys',    title: 'Classifying Call-Center Agents with the Genesys API',                          date: 'Oct 2025', read: '13 min' },
  { slug: 'At-Home-Media',                                                                     cats: 'Plex · Usenet',       title: 'At Home Media Server',                                                          date: 'Sep 2025', read: '14 min' },
  { slug: 'Pet-Shop-Monitoring-With-R',                                                        cats: 'R · Web Scraping',    title: 'Pet Shop Monitoring with R',                                                    date: 'Apr 2025', read: '9 min' },
  { slug: 'Efficient-Database-Structure-and-Cost-Management-in-BigQuery',                      cats: 'BigQuery · R',        title: 'Efficient DB Structure and Cost Management in BigQuery',                        date: 'Mar 2025', read: '9 min' },
  { slug: 'Python--Sharepoint---File-Explorer-Downloader-Uploader',                            cats: 'Python · SharePoint', title: 'Streamlining SharePoint with sharepoint_utility',                               date: 'Mar 2025', read: '8 min' },
  { slug: 'Advanced-SQL-Techniques-and-Analytics',                                             cats: 'SQL · BigQuery',      title: 'Advanced SQL Techniques and Analytics',                                         date: 'Mar 2025', read: '7 min' },
  { slug: 'Salesforce-Data-Management-with-Python-and-SOQL',                                   cats: 'Python · Salesforce', title: 'Salesforce Data Management with Python and SOQL',                               date: 'Feb 2025', read: '9 min' },
  { slug: 'Card-Kingdoms-API-Analysis',                                                        cats: 'R · API',             title: 'Card Kingdom\u2019s API Analysis',                                              date: 'Jan 2025', read: '8 min' },
  { slug: 'R--Python---Comprehensive-Set-Up',                                                  cats: 'R · Python',          title: 'R & Python — Comprehensive Set Up',                                             date: 'Jan 2025', read: '7 min' },
  { slug: 'Automation-for-Social-Advertising-Data-Management-with-Python-and-SQL',             cats: 'Python · SQL',        title: 'Automation for Social Advertising Data Management with Python and SQL',         date: 'Sep 2024', read: '7 min' },
  { slug: 'Win-Rate-Analysis-and-Optimization-for-Blind-RTB-Bidding-with-Python-and-SQL',      cats: 'Python · RTB',        title: 'Win Rate Analysis and Optimization for Blind RTB Bidding with Python and SQL',  date: 'Aug 2024', read: '10 min' },
  { slug: 'R-vs-Python---Google-Sheets-',                                                      cats: 'R · Python',          title: 'R vs Python — Google Sheets',                                                   date: 'Jun 2024', read: '6 min' },
  { slug: 'Bash-Fun-Full-On-Sync--Setup-For-Mac-',                                             cats: 'Bash · macOS',        title: 'Bash Fun: Full On Sync & Setup For Mac',                                        date: 'Feb 2024', read: '7 min' },
  { slug: 'Leveraging-R-for-Advanced-Client-Revenue-Analytics',                                cats: 'R · Analytics',       title: 'Leveraging R for Advanced Client Revenue Analytics',                            date: 'Nov 2023', read: '8 min' },
  { slug: 'Inventory-Acquisition-with-Google-Sheets-Apps-Script-SQL-and-R',                    cats: 'Google Sheets · R',   title: 'Inventory Acquisition with Google Sheets, Apps Script, SQL, and R',             date: 'Oct 2023', read: '7 min' },
  { slug: 'Bash-Fun-Download-Folder-File-Organizer',                                           cats: 'Bash',                title: 'Bash Fun: Download Folder File Organizer',                                      date: 'Oct 2023', read: '5 min' },
  { slug: 'In-Depth-Product-Level-Analysis-Using-R-for-Advanced-Market-Insights',              cats: 'R · Market',          title: 'In-Depth Product-Level Analysis Using R for Advanced Market Insights',          date: 'Sep 2023', read: '8 min' },
  { slug: 'Advanced-Analytics-and-Revenue-Optimization-with-R',                                cats: 'R · Analytics',       title: 'Advanced Analytics and Revenue Optimization with R',                            date: 'Jul 2023', read: '6 min' },
  { slug: 'Advanced-Advertising-Analytics-with-R-Unlocking-Data-Driven-Insights',              cats: 'R · Advertising',     title: 'Advanced Advertising Analytics with R: Unlocking Data-Driven Insights',         date: 'May 2023', read: '8 min' },
  { slug: 'Buying-Support-for-Journeys-End-Game-Store-Through-R-SQL-and-Effective-Communication', cats: 'R · SQL',           title: 'Buying Support for Journey\u2019s End Game Store Through R, SQL, and Communication', date: 'May 2023', read: '7 min' },
  { slug: 'Understanding-Lazy-vs-Non-Lazy-Evaluation-My-Experiences-with-R-and-Python',        cats: 'R · Python',          title: 'R vs Python — Lazy vs Non-Lazy Evaluation',                                     date: 'Apr 2023', read: '8 min' },
  { slug: 'Advanced-Traffic-Flow-Analysis-and-Data-Management-with-Python-and-SQL',            cats: 'Python · SQL',        title: 'Advanced Traffic Flow Analysis and Data Management with Python and SQL',        date: 'Dec 2022', read: '9 min' },
  { slug: 'Package-Management---R-vs-Python',                                                  cats: 'R · Python',          title: 'R vs Python — Package Management',                                              date: 'Dec 2022', read: '6 min' },
  { slug: 'MTGBAN---Newspaper-Updater-R-Google-Cloud-Platform-BigQuery',                       cats: 'R · GCP',             title: 'MTGBAN — Newspaper Updater: R, Google Cloud Platform, BigQuery',                date: 'Oct 2022', read: '5 min' },
  { slug: 'Google-Analytics-and-Gmail-Automation-with-Python',                                 cats: 'Python · Gmail',      title: 'Google Analytics and Gmail Automation with Python',                             date: 'Jul 2022', read: '9 min' },
  { slug: 'ClickHouse-An-In-Depth-Overview-and-Integration-with-Python-and-R',                 cats: 'ClickHouse · Py · R', title: 'ClickHouse: An In-Depth Overview and Integration with Python and R',            date: 'Mar 2022', read: '10 min' },
  { slug: 'R--Twitter---Automation',                                                           cats: 'R · Twitter',         title: 'R & Twitter — Automation',                                                      date: 'Feb 2022', read: '7 min' },
  { slug: 'How-I-Automated-Booking-a-Baby-Hospital-Tour-Using-R-and-Docker',                   cats: 'R · Docker',          title: 'How I Automated Booking a Baby Hospital Tour Using R and Docker',               date: 'Oct 2021', read: '6 min' },
  { slug: 'Arbitrage-in-Magic-The-Gathering-Primer',                                           cats: 'R · MTG',             title: 'Arbitrage in Magic: The Gathering — a Primer',                                  date: 'Jun 2021', read: '7 min' },
  { slug: 'Racing-Ahead-Data-Driven-Insights-into-ZED-RUN',                                    cats: 'R · Blockchain',      title: 'Racing Ahead: Data-Driven Insights into ZED RUN',                               date: 'Jun 2021', read: '5 min' },
  { slug: 'R---Trading-Card-Market-Analytics-and-Automated-Reporting-A-Comprehensive-Breakdown', cats: 'R · MTG',            title: 'R — Trading Card Market Analytics and Automated Reporting',                     date: 'Jan 2017', read: '8 min' },
];

function BlogModal({ slug, title, onClose }) {
  const post = getPost(slug);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="blog-overlay" onClick={onClose}>
      <div className="blog-modal" onClick={e => e.stopPropagation()}>
        <button className="blog-close" onClick={onClose} aria-label="Close">×</button>
        <article className="blog-content">
          <h1>{title}</h1>
          {post ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
          ) : (
            <p className="dim">Article not found.</p>
          )}
        </article>
      </div>
    </div>
  );
}

export function Writing() {
  const [openSlug, setOpenSlug] = useState(null);
  const openArticle = ARTICLES.find(a => a.slug === openSlug);
  return (
    <section id="writing" className="flow" data-screen-label="05 Writing">
      <div className="wrap">
        <div className="section-label"><span className="num">05</span> / writing &nbsp; <span className="mute">// 30+ posts on my blog</span></div>
        <div style={{ maxWidth: 720, marginBottom: 40 }}>
          <h2 style={{ fontFamily:'var(--serif)', fontSize:'clamp(26px,3.2vw,42px)', margin:'0 0 16px', fontWeight:400, letterSpacing:'-0.02em', lineHeight:1.08 }}>
            Field notes from the <em style={{color:'var(--accent)', fontStyle:'italic'}}>warehouse.</em>
          </h2>
          <p className="dim" style={{ fontSize: 15, maxWidth: 560, lineHeight: 1.55 }}>
            Practical write-ups — R, Python, SQL, and the occasional Docker-assisted life hack. I write them as I solve them.
          </p>
        </div>
        <div className="writing-grid">
          {ARTICLES.map(a => (
            <article className="article" key={a.slug} onClick={() => setOpenSlug(a.slug)}>
              <div className="cats">{a.cats}</div>
              <h4>{a.title}</h4>
              <div className="meta">
                <span>{a.date}</span>
                <span>·</span>
                <span>{a.read} read</span>
                <span style={{ marginLeft:'auto', color:'var(--accent)' }}>Read ›</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      {openArticle && (
        <BlogModal slug={openArticle.slug} title={openArticle.title} onClose={() => setOpenSlug(null)} />
      )}
    </section>
  );
}

export function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name:'', email:'', msg:'' });
  const submit = (e) => { e.preventDefault(); if (form.name && form.email && form.msg) setSent(true); };
  return (
    <section className="contact" id="contact" data-screen-label="06 Contact">
      <div className="wrap">
        <div className="contact-grid">
          <div>
            <div className="section-label" style={{marginBottom:24}}><span className="num">06</span> / contact</div>
            <h2>Let's <em>go.</em></h2>
            <p className="dim" style={{ fontSize: 17, maxWidth: 440, marginBottom: 32 }}>
              Hiring for analytics, BI, or data-engineering work? Need help designing a warehouse from scratch, or rescuing one that's on fire? I answer every genuine email.
            </p>
            <div className="fact-list" style={{ marginTop: 0 }}>
              <div className="fact"><span>email</span><a href="mailto:pachun95@gmail.com">pachun95@gmail.com</a></div>
              <div className="fact"><span>linkedin</span><a href="https://www.linkedin.com/in/chris-pachulski/" target="_blank" rel="noopener noreferrer">in/chris-pachulski</a></div>
              <div className="fact"><span>github</span><a href="https://github.com/ChrisPachulski" target="_blank" rel="noopener noreferrer">github.com/ChrisPachulski</a></div>
            </div>
          </div>
          <form className="contact-form" onSubmit={submit}>
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
                <button className="btn btn-primary mono" type="submit">Send message <span className="arrow">→</span></button>
              </>
            ) : (
              <div style={{ padding:'32px 8px', textAlign:'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }} className="accent">✓</div>
                <div style={{ fontFamily:'var(--serif)', fontSize: 28, marginBottom: 8 }}>Message received.</div>
                <div className="dim">I'll reply within 48 hours — usually faster.</div>
              </div>
            )}
          </form>
        </div>
        <footer className="footer">
          <div>© Chris Pachulski 2026 · Built by hand, no frameworks harmed.</div>
          <div>/* hire me, mentor me, or just chat MTG — same mailbox. */</div>
        </footer>
      </div>
    </section>
  );
}
