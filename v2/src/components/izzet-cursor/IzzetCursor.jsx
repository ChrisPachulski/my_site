import { useEffect, useRef, useState } from 'react';

/* ── Izzet Cursor ──────────────────────────────────────────────────
   Custom lightning-bolt cursor. Click shocks + one-time arrival strike.
   No trail, no glow-behind.

   No invasive changes to other components — opt-in via classes:
     .izzet-ignite    → text element gets cursor-following radial ignite
     .izzet-magnetic  → element pulls subtly toward cursor when near

   Disabled on touch devices and prefers-reduced-motion.
   Sets root vars --izzet-mx / --izzet-my (viewport px) for any CSS use. */

function isInteractive(el) {
  if (!el || el === document.body) return false;
  return !!el.closest('a, button, [role="button"], input, textarea, select, [tabindex]:not([tabindex="-1"])');
}

export default function IzzetCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const shocksRef = useRef(null);
  const arrivalRef = useRef(null);

  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (canHover && !reduceMotion) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.setAttribute('data-izzet-cursor', 'on');

    const dot = dotRef.current;
    const ring = ringRef.current;
    const root = document.documentElement;

    const setState = (cls, on) => {
      dot.classList.toggle(cls, on);
      ring.classList.toggle(cls, on);
    };

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let hasMoved = false;
    let pending = false;

    // Cached list of ignite + magnetic targets, refreshed when DOM changes
    let igniteEls = [];
    let magneticEls = [];
    const refreshTargets = () => {
      igniteEls = Array.from(document.querySelectorAll('.izzet-ignite'));
      magneticEls = Array.from(document.querySelectorAll('.izzet-magnetic'));
    };
    refreshTargets();
    const mo = new MutationObserver(refreshTargets);
    mo.observe(document.body, { childList: true, subtree: true });

    const apply = () => {
      pending = false;

      const tx = `translate(${mx}px, ${my}px)`;
      dot.style.transform = tx;
      ring.style.transform = tx;

      // Global vars
      root.style.setProperty('--izzet-mx', `${mx}px`);
      root.style.setProperty('--izzet-my', `${my}px`);

      // Interactive-element detection for cursor state
      const el = document.elementFromPoint(mx, my);
      const active = isInteractive(el);
      setState('izzet-cursor-active', !!active);

      // Per-element ignite
      for (const el of igniteEls) {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--izzet-cx', `${mx - r.left}px`);
        el.style.setProperty('--izzet-cy', `${my - r.top}px`);
      }

      // Magnetic pull — only if cursor within radius
      for (const el of magneticEls) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.hypot(dx, dy);
        const radius = 140;
        if (dist < radius) {
          const pull = (1 - dist / radius) * 0.25;
          el.style.setProperty('--izzet-px', `${dx * pull}px`);
          el.style.setProperty('--izzet-py', `${dy * pull}px`);
          el.classList.add('izzet-magnet-on');
        } else {
          el.style.setProperty('--izzet-px', `0px`);
          el.style.setProperty('--izzet-py', `0px`);
          el.classList.remove('izzet-magnet-on');
        }
      }
    };

    const scheduleApply = () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(apply);
      }
    };

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        setState('izzet-cursor-live', true);
        setState('izzet-cursor-hidden', false);
        fireArrivalStrike(mx, my);
      }
      scheduleApply();
    };

    const onLeave = () => setState('izzet-cursor-hidden', true);
    const onEnter = () => setState('izzet-cursor-hidden', false);
    const onDown = () => setState('izzet-cursor-down', true);
    const onUp = () => setState('izzet-cursor-down', false);

    const onClick = (e) => {
      // Ignore non-primary buttons for shock
      if (e.button !== undefined && e.button !== 0) return;
      fireShock(e.clientX, e.clientY);
    };

    const fireShock = (x, y) => {
      const layer = shocksRef.current;
      if (!layer) return;
      // Two concentric rings: blue inner, red outer, phased
      for (let i = 0; i < 2; i++) {
        const s = document.createElement('span');
        s.className = `izzet-shock izzet-shock-${i === 0 ? 'u' : 'r'}`;
        s.style.left = `${x}px`;
        s.style.top = `${y}px`;
        s.style.animationDelay = `${i * 60}ms`;
        layer.appendChild(s);
        s.addEventListener('animationend', () => s.remove(), { once: true });
      }
    };

    const fireArrivalStrike = (x, y) => {
      // A single shock ripple where the cursor first appears — a subtle
      // "cursor's alive" nod, no vertical bolt.
      fireShock(x, y);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('click', onClick);

    // Initial positioning
    apply();

    return () => {
      document.documentElement.removeAttribute('data-izzet-cursor');
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('click', onClick);
      mo.disconnect();
      // Clean up magnetic residue
      document.querySelectorAll('.izzet-magnet-on').forEach(el => {
        el.classList.remove('izzet-magnet-on');
        el.style.removeProperty('--izzet-px');
        el.style.removeProperty('--izzet-py');
      });
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="izzet-cursor-root" aria-hidden="true">
      <div ref={arrivalRef} className="izzet-arrival-layer" />
      <div ref={shocksRef} className="izzet-shock-layer" />
      <div ref={ringRef} className="izzet-cursor-ring izzet-cursor-hidden" />
      <div ref={dotRef}  className="izzet-cursor-dot  izzet-cursor-hidden" />
    </div>
  );
}
