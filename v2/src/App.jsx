import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import Hero from './components/Hero.jsx';
import { About, Skills, Feature } from './components/AboutSkills.jsx';
import { Projects, Resume, Writing, Contact } from './components/Sections.jsx';
import Article from './components/Article.jsx';
import NotFound from './components/NotFound.jsx';
import ThemeSwitch from './components/ThemeSwitch.jsx';
import { useRoute, articlePath } from './lib/router.js';
import { getPost } from './lib/blog.js';

const GhostMatch = lazy(() => import('./components/ghostmatch/GhostMatch.jsx'));

const ACCENT = 'violet';
const HERO_VARIANT = 'sql';
const MODE_STORAGE_KEY = 'display-mode';
const TRANSITION_MS = 520;

function readStoredMode() {
  if (typeof window === 'undefined') return 'after-hours';
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY) === 'office-hours'
      ? 'office-hours'
      : 'after-hours';
  } catch (e) {
    return 'after-hours';
  }
}

function ensureOrbitronLoaded() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('font-orbitron')) return;
  const link = document.createElement('link');
  link.id = 'font-orbitron';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap';
  document.head.appendChild(link);
}

function applyMode(mode) {
  const html = document.documentElement;
  if (mode === 'office-hours') {
    html.removeAttribute('data-vibe');
    html.setAttribute('data-theme', 'light');
  } else {
    html.setAttribute('data-vibe', 'cyberpunk');
    html.setAttribute('data-theme', 'dark');
    ensureOrbitronLoaded();
  }
}

const NAV = [
  { id: 'home',      label: 'Home' },
  { id: 'about',     label: 'About' },
  { id: 'skills',    label: 'Skills' },
  { id: 'portfolio', label: 'Work' },
  { id: 'resume',    label: 'Resume' },
  { id: 'writing',   label: 'Writing' },
];

function Nav({ active, onHome, mode, onModeChange }) {
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
      <a className="skip-link" href="#main-content">Skip to content</a>
      <a href="/" className="brand" onClick={(e) => handleNav(e, '#home')}>
        <span className="dot"/>
        <span>chris<span className="accent">@</span>home</span>
      </a>
      <div className="nav-links">
        {NAV.map((n, i) => (
          <a
            key={n.id}
            href={`/#${n.id}`}
            className={active === n.id ? 'active' : ''}
            onClick={(e) => handleNav(e, `#${n.id}`)}
          >
            <span className="idx">{String(i + 1).padStart(2,'0')}</span>
            <span>{n.label}</span>
          </a>
        ))}
        <ThemeSwitch mode={mode} onChange={onModeChange} />
        <a href="/#contact" className="cta" onClick={(e) => handleNav(e, '#contact')}>Contact</a>
      </div>
    </nav>
  );
}

function HomeContent({ active, onHome, onArticleOpen, gmDone, onGmComplete, mode, onModeChange }) {
  return (
    <>
      <Nav active={active} onHome={onHome} mode={mode} onModeChange={onModeChange} />
      <main id="main-content" tabIndex={-1}>
        <Hero heroVariant={HERO_VARIANT} />
        {!gmDone && mode === 'after-hours' && (
          <Suspense fallback={null}>
            <GhostMatch onComplete={onGmComplete} />
          </Suspense>
        )}
        <About />
        <Skills />
        <Feature />
        <Projects />
        <Resume />
        <Writing onArticleOpen={onArticleOpen} />
        <Contact />
      </main>
    </>
  );
}

function ArticlePage({ post, navigate, mode, onModeChange }) {
  return (
    <>
      <Nav
        active="writing"
        onHome={(hash) => navigate(`/${hash}`)}
        mode={mode}
        onModeChange={onModeChange}
      />
      <main id="main-content" tabIndex={-1} className="article-shell">
        <Article post={post} mode="page" onNavigate={navigate} />
      </main>
      <Contact />
    </>
  );
}

function NotFoundPage({ navigate, mode, onModeChange }) {
  return (
    <>
      <Nav active="writing" onHome={(hash) => navigate(`/${hash}`)} mode={mode} onModeChange={onModeChange} />
      <main id="main-content" tabIndex={-1} className="article-shell">
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
  const [gmDone, setGmDone] = useState(false);
  const [mode, setMode] = useState(readStoredMode);
  const transitionTimerRef = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', ACCENT);
  }, []);

  // Cross-tab sync: a switch in another tab updates this one without
  // re-running the local choreography (the other tab already animated).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== MODE_STORAGE_KEY) return;
      const next = e.newValue === 'office-hours' ? 'office-hours' : 'after-hours';
      applyMode(next);
      setMode(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleModeChange = useCallback((next) => {
    if (next !== 'after-hours' && next !== 'office-hours') return;
    setMode((current) => {
      if (current === next) return current;
      const html = document.documentElement;
      html.classList.add('mode-transitioning');
      applyMode(next);
      try { window.localStorage.setItem(MODE_STORAGE_KEY, next); } catch (e) { /* ignore */ }
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = window.setTimeout(() => {
        html.classList.remove('mode-transitioning');
        transitionTimerRef.current = 0;
      }, TRANSITION_MS + 40);
      return next;
    });
  }, []);

  const onHomePage = route.name === 'home' || (route.name === 'article' && flowMode === 'modal');

  useEffect(() => {
    if (!onHomePage) return;
    const ids = ['home','about','skills','portfolio','resume','writing','contact'];
    const targets = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!targets.length) return;
    // The trip-line sits 140px below the viewport top, just under the fixed nav.
    // A section is "active" when that line is inside it.
    let lastActive = 'home';
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) lastActive = entry.target.id;
        }
        setActive(lastActive);
      },
      { rootMargin: '-140px 0px -100% 0px', threshold: 0 }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
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
    return () => { document.title = 'Chris Pachulski — Senior Data Scientist'; };
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
      return <NotFoundPage navigate={handleHomeNav} mode={mode} onModeChange={handleModeChange} />;
    }
    if (flowMode === 'modal') {
      return (
        <>
          <HomeContent
            active={active}
            onHome={handleHomeNav}
            onArticleOpen={handleArticleOpen}
            gmDone={gmDone}
            onGmComplete={() => setGmDone(true)}
            mode={mode}
            onModeChange={handleModeChange}
          />
          <ArticleModal
            post={post}
            onClose={back}
            navigate={handleHomeNav}
          />
        </>
      );
    }
    return <ArticlePage post={post} navigate={handleHomeNav} mode={mode} onModeChange={handleModeChange} />;
  }

  return (
    <HomeContent
      active={active}
      onHome={handleHomeNav}
      onArticleOpen={handleArticleOpen}
      gmDone={gmDone}
      onGmComplete={() => setGmDone(true)}
      mode={mode}
      onModeChange={handleModeChange}
    />
  );
}
