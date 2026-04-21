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
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true"
           style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <defs>
          {/* Oil-paint filter: softens photo edges, displaces via turbulence for brushstrokes, warm color grade. */}
          <filter id="oilpaint" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.9" result="blur" />
            <feTurbulence type="fractalNoise" baseFrequency="0.038 0.05" numOctaves="2" seed="7" result="turb" />
            <feDisplacementMap in="blur" in2="turb" scale="5" xChannelSelector="R" yChannelSelector="G" result="disp" />
            <feColorMatrix in="disp" type="matrix" values="
              1.22 0.10 0.00 0 -0.04
              0.04 1.10 0.00 0 -0.03
              -0.04 0.00 0.88 0 -0.05
              0    0    0    1 0" />
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
