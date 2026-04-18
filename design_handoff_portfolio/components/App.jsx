/* Nav + Tweaks + App shell */
const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "violet",
  "theme": "dark",
  "heroVariant": "sql",
  "vibe": "cyberpunk"
}/*EDITMODE-END*/;

const ACCENTS = [
  { id: 'rust',   hex: 'oklch(0.64 0.15 35)' },
  { id: 'amber',  hex: 'oklch(0.75 0.14 70)' },
  { id: 'olive',  hex: 'oklch(0.70 0.13 115)' },
  { id: 'cyan',   hex: 'oklch(0.72 0.13 195)' },
  { id: 'violet', hex: 'oklch(0.70 0.14 300)' },
];

const NAV = [
  { id: 'home',      label: 'Home' },
  { id: 'about',     label: 'About' },
  { id: 'skills',    label: 'Skills' },
  { id: 'portfolio', label: 'Work' },
  { id: 'resume',    label: 'Resume' },
  { id: 'writing',   label: 'Writing' },
];

function Nav({ active }) {
  const [scrolled, setScrolled] = useStateA(false);
  useEffectA(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <a href="#home" className="brand">
        <span className="dot"/>
        <span>chris<span className="accent">@</span>wizards</span>
      </a>
      <div className="nav-links">
        {NAV.map((n, i) => (
          <a key={n.id} href={`#${n.id}`} className={active === n.id ? 'active' : ''}>
            <span className="idx">{String(i).padStart(2,'0')}</span>
            <span>{n.label}</span>
          </a>
        ))}
        <a href="#contact" className="cta">Contact</a>
      </div>
    </nav>
  );
}

function Tweaks({ tweaks, setTweaks, editMode }) {
  if (!editMode) return null;
  const set = (k, v) => {
    setTweaks(t => ({ ...t, [k]: v }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v }}, '*');
  };
  return (
    <div className="tweaks">
      <h5><span className="accent-dot"/> Tweaks</h5>
      <div className="row">
        <span className="lbl">Accent</span>
        <div className="swatches">
          {ACCENTS.map(a => (
            <button
              key={a.id}
              className={`swatch${tweaks.accent === a.id ? ' active' : ''}`}
              style={{ background: a.hex }}
              onClick={() => set('accent', a.id)}
              title={a.id}
            />
          ))}
        </div>
      </div>
      <div className="row">
        <span className="lbl">Theme</span>
        <div className="seg">
          <button className={tweaks.theme==='dark'?'active':''}  onClick={()=>set('theme','dark')}>dark</button>
          <button className={tweaks.theme==='light'?'active':''} onClick={()=>set('theme','light')}>light</button>
        </div>
      </div>
      <div className="row">
        <span className="lbl">Vibe</span>
        <div className="seg">
          <button className={tweaks.vibe==='editorial'?'active':''} onClick={()=>set('vibe','editorial')}>editorial</button>
          <button className={tweaks.vibe==='cyberpunk'?'active':''} onClick={()=>set('vibe','cyberpunk')}>cyberpunk</button>
        </div>
      </div>
      <div className="row">
        <span className="lbl">Hero terminal</span>
        <div className="seg">
          <button className={tweaks.heroVariant==='sql'  ?'active':''} onClick={()=>set('heroVariant','sql')}>sql</button>
          <button className={tweaks.heroVariant==='psql' ?'active':''} onClick={()=>set('heroVariant','psql')}>psql</button>
          <button className={tweaks.heroVariant==='shell'?'active':''} onClick={()=>set('heroVariant','shell')}>dag</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [tweaks, setTweaks] = useStateA(TWEAK_DEFAULTS);
  const [editMode, setEditMode] = useStateA(false);
  const [active, setActive] = useStateA('home');

  // apply tweaks
  useEffectA(() => {
    document.documentElement.setAttribute('data-accent', tweaks.accent);
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    if (tweaks.vibe === 'cyberpunk') {
      document.documentElement.setAttribute('data-vibe', 'cyberpunk');
    } else {
      document.documentElement.removeAttribute('data-vibe');
    }
  }, [tweaks.accent, tweaks.theme, tweaks.vibe]);

  // edit-mode wiring
  useEffectA(() => {
    const handle = (e) => {
      if (e.data?.type === '__activate_edit_mode') setEditMode(true);
      if (e.data?.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', handle);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handle);
  }, []);

  // scrollspy
  useEffectA(() => {
    const ids = ['home','about','skills','portfolio','resume','writing','contact'];
    const onScroll = () => {
      const y = window.scrollY + 140;
      let cur = 'home';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Nav active={active} />
      <Hero heroVariant={tweaks.heroVariant} />
      <About />
      <Skills />
      <Feature />
      <Projects />
      <Resume />
      <Writing />
      <Contact />
      <Tweaks tweaks={tweaks} setTweaks={setTweaks} editMode={editMode} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
