import { useEffect, useState } from 'react';

// True while the ref'd element is in the viewport and the tab is visible, so a
// tile's ticking intervals only run while someone can see them. Starts false,
// which also keeps the server and first client render identical.
export default function useOnScreen(ref) {
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    const sync = () => setTabVisible(document.visibilityState === 'visible');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return inView && tabVisible;
}
