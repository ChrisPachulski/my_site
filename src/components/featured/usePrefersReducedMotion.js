import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (onChange) => {
  if (!window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const getSnapshot = () => Boolean(window.matchMedia && window.matchMedia(QUERY).matches);
// Hydration renders with the server value (false) so the markup matches the
// prerendered HTML, then React re-renders with the real preference and patches
// the styles and classes that depend on it.
const getServerSnapshot = () => false;

export default function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
