import { useState, useEffect } from 'react';
import Hero from './components/Hero.jsx';
import { About, Skills, Feature } from './components/AboutSkills.jsx';
import { Projects, Resume, Writing, Contact } from './components/Sections.jsx';

const ACCENT = 'violet';
const THEME = 'dark';
const VIBE = 'cyberpunk';
const HERO_VARIANT = 'sql';

const NAV = [
  { id: 'home',      label: 'Home' },
  { id: 'about',     label: 'About' },
  { id: 'skills',    label: 'Skills' },
  { id: 'portfolio', label: 'Work' },
  { id: 'resume',    label: 'Resume' },
  { id: 'writing',   label: 'Writing' },
];

function Nav({ active }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
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

export default function App() {
  const [active, setActive] = useState('home');

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', ACCENT);
    document.documentElement.setAttribute('data-theme', THEME);
    document.documentElement.setAttribute('data-vibe', VIBE);
  }, []);

  useEffect(() => {
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
      {/* Geometry-safe painterly filter: soft-blur + posterize-lite + mild edge sharpen.
          No displacement, no luminance-driven lighting — features stay intact. */}
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true"
           style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <defs>
          <filter id="painterly" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="soft" />
            <feComponentTransfer in="soft" result="posterized">
              <feFuncR type="discrete" tableValues="0.05 0.16 0.27 0.39 0.52 0.66 0.80 0.94" />
              <feFuncG type="discrete" tableValues="0.05 0.16 0.27 0.39 0.52 0.66 0.80 0.94" />
              <feFuncB type="discrete" tableValues="0.05 0.16 0.27 0.39 0.52 0.66 0.80 0.94" />
            </feComponentTransfer>
            <feComposite in="posterized" in2="soft" operator="arithmetic"
                         k1="0" k2="0.55" k3="0.45" k4="0" result="painted" />
            <feConvolveMatrix in="painted" order="3" preserveAlpha="true"
                              kernelMatrix="0 -0.35 0  -0.35 2.4 -0.35  0 -0.35 0" />
          </filter>
        </defs>
      </svg>
      <Nav active={active} />
      <Hero heroVariant={HERO_VARIANT} />
      <About />
      <Skills />
      <Feature />
      <Projects />
      <Resume />
      <Writing />
      <Contact />
    </>
  );
}
