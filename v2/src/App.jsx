import { useState, useEffect } from 'react';
import Hero from './components/Hero.jsx';
import { About, Skills, Feature } from './components/AboutSkills.jsx';
import { Projects, Resume, Writing, Contact } from './components/Sections.jsx';
import IzzetCursor from './components/izzet-cursor/IzzetCursor.jsx';
import './components/izzet-cursor/izzet-cursor.css';

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
      <IzzetCursor />
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
