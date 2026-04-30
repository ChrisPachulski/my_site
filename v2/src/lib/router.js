import { useEffect, useState, useCallback } from 'react';

const WRITING_PREFIX = '/writing/';

function parsePath(pathname) {
  if (pathname === '/' || pathname === '') return { name: 'home', slug: null };
  if (pathname.startsWith(WRITING_PREFIX)) {
    const slug = pathname.slice(WRITING_PREFIX.length).replace(/\/+$/, '');
    return slug ? { name: 'article', slug } : { name: 'home', slug: null };
  }
  return { name: 'home', slug: null };
}

function readState() {
  if (typeof window === 'undefined') return { route: { name: 'home', slug: null }, flowMode: 'full' };
  return {
    route: parsePath(window.location.pathname),
    flowMode: window.history.state?.flowMode || 'full',
  };
}

export function useRoute() {
  const [state, setState] = useState(readState);

  useEffect(() => {
    const onPop = () => setState(readState());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((path, { flowMode = 'full', replace = false } = {}) => {
    const fn = replace ? 'replaceState' : 'pushState';
    window.history[fn]({ flowMode }, '', path);
    setState({ route: parsePath(path), flowMode });
  }, []);

  const back = useCallback(() => {
    window.history.back();
  }, []);

  return { ...state, navigate, back };
}

export function articlePath(slug) {
  return `${WRITING_PREFIX}${slug}`;
}
