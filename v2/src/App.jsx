import { useState, useEffect, useRef } from 'react';
import Hero from './components/Hero.jsx';
import { About, Skills, Feature } from './components/AboutSkills.jsx';
import { Projects, Resume, Writing, Contact } from './components/Sections.jsx';
import IzzetCursor from './components/izzet-cursor/IzzetCursor.jsx';
import Article from './components/Article.jsx';
import NotFound from './components/NotFound.jsx';
import { useRoute, articlePath } from './lib/router.js';
import { getPost } from './lib/blog.js';
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

function Nav({ active, onHome }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const handleNav = (e, hash) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
    e.preventDefault();
    onHome(hash);
  };
  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
      <a href="/" className="brand" onClick={(e) => handleNav(e, '#home')}>
        <span className="dot"/>
        <span>chris<span className="accent">@</span>wizards</span>
      </a>
      <div className="nav-links">
        {NAV.map((n, i) => (
          <a
            key={n.id}
            href={`/#${n.id}`}
            className={active === n.id ? 'active' : ''}
            onClick={(e) => handleNav(e, `#${n.id}`)}
          >
            <span className="idx">{String(i).padStart(2,'0')}</span>
            <span>{n.label}</span>
          </a>
        ))}
        <a href="/#contact" className="cta" onClick={(e) => handleNav(e, '#contact')}>Contact</a>
      </div>
    </nav>
  );
}

function HomeContent({ active, onHome, onArticleOpen }) {
  return (
    <>
      <Nav active={active} onHome={onHome} />
      <Hero heroVariant={HERO_VARIANT} />
      <About />
      <Skills />
      <Feature />
      <Projects />
      <Resume />
      <Writing onArticleOpen={onArticleOpen} />
      <Contact />
    </>
  );
}

function ArticlePage({ post, navigate }) {
  return (
    <>
      <Nav
        active="writing"
        onHome={(hash) => navigate(`/${hash}`)}
      />
      <main className="article-shell" data-screen-label="Field Notes">
        <Article post={post} mode="page" onNavigate={navigate} />
      </main>
      <Contact />
    </>
  );
}

function NotFoundPage({ navigate }) {
  return (
    <>
      <Nav active="writing" onHome={(hash) => navigate(`/${hash}`)} />
      <main className="article-shell" data-screen-label="Not Found">
        <NotFound onNavigate={navigate} />
      </main>
      <Contact />
    </>
  );
}

function ArticleModal({ post, onClose, navigate }) {
  const dialogRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    lastFocus.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    if (dialogRef.current) dialogRef.current.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (lastFocus.current && typeof lastFocus.current.focus === 'function') {
        lastFocus.current.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  return (
    <div
      className="article-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="article-modal-panel"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="article-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close article"
        >
          <span aria-hidden="true">×</span>
        </button>
        <Article post={post} mode="modal" onNavigate={navigate} />
      </div>
    </div>
  );
}

export default function App() {
  const { route, flowMode, navigate, back } = useRoute();
  const [active, setActive] = useState('home');

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', ACCENT);
    document.documentElement.setAttribute('data-theme', THEME);
    document.documentElement.setAttribute('data-vibe', VIBE);
  }, []);

  const onHomePage = route.name === 'home' || (route.name === 'article' && flowMode === 'modal');

  useEffect(() => {
    if (!onHomePage) return;
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
  }, [onHomePage]);

  useEffect(() => {
    if (route.name !== 'home') return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [route.name]);

  useEffect(() => {
    if (route.name !== 'article') return;
    const post = getPost(route.slug);
    if (post) document.title = `${post.title} — Chris Pachulski`;
    else document.title = 'Not Found — Chris Pachulski';
    return () => { document.title = 'Chris Pachulski — Analytics Engineer'; };
  }, [route.name, route.slug]);

  const handleArticleOpen = (slug) => {
    navigate(articlePath(slug), { flowMode: 'modal' });
  };

  const handleHomeNav = (target) => {
    if (target.startsWith('#')) {
      if (route.name !== 'home') {
        navigate('/');
        requestAnimationFrame(() => {
          const el = document.querySelector(target);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (target.startsWith('/#')) {
      handleHomeNav(target.slice(1));
    } else {
      navigate(target);
    }
  };

  if (route.name === 'article') {
    const post = getPost(route.slug);
    if (!post) {
      return (
        <>
          <IzzetCursor />
          <NotFoundPage navigate={handleHomeNav} />
        </>
      );
    }
    if (flowMode === 'modal') {
      return (
        <>
          <IzzetCursor />
          <HomeContent active={active} onHome={handleHomeNav} onArticleOpen={handleArticleOpen} />
          <ArticleModal
            post={post}
            onClose={back}
            navigate={handleHomeNav}
          />
        </>
      );
    }
    return (
      <>
        <IzzetCursor />
        <ArticlePage post={post} navigate={handleHomeNav} />
      </>
    );
  }

  return (
    <>
      <IzzetCursor />
      <HomeContent active={active} onHome={handleHomeNav} onArticleOpen={handleArticleOpen} />
    </>
  );
}
