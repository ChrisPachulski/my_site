import { useEffect, useState } from 'react';

// True while the ref'd element is in the viewport, so a tile's ticking
// intervals only run while someone can see them. Starts false, which also
// keeps the server and first client render identical.
export default function useOnScreen(ref) {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return onScreen;
}
