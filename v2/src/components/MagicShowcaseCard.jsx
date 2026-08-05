import { useEffect, useRef, useCallback } from 'react';
import MagicCardFace from './MagicCardFace.jsx';
import './magic-showcase.css';

/* MagicShowcaseCard
 *
 * Reusable showcase of the workshop card from /lab/mtg-card.html.
 * Plays the sequence once when first scrolled into view (the invitation),
 * then only replays on user input — hover, click, or keyboard focus:
 *   foil sweep → corner gleam → 3D flip → back gem pulse → flip back → rest
 *
 * Props:
 *   compact (bool)    — render at 240×336 instead of 340×474
 *   autoplayDelay     — ms after viewport entry before the first play (default 500)
 *
 * The .is-playing class is toggled imperatively via ref so the CSS
 * animation restarts cleanly each play. React doesn't manage that
 * class (the className prop stays "mscard-root"), so re-renders won't
 * fight the animation.
 */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function MagicShowcaseCard({ compact = false, autoplayDelay = 500 }) {
  const rootRef = useRef(null);
  const arenaRef = useRef(null);

  const restart = useCallback(() => {
    if (prefersReducedMotion()) return;
    const el = rootRef.current;
    if (!el) return;
    el.classList.remove('is-playing');
    // Force reflow so the animation actually restarts from frame 0
    void el.offsetWidth;
    el.classList.add('is-playing');
  }, []);

  // Play once when first scrolled into view. No loop — every replay after
  // this is user-triggered (hover/click/focus below).
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = arenaRef.current;
    if (!el) return;
    let startTimer = 0;
    const fire = () => {
      startTimer = window.setTimeout(restart, autoplayDelay);
    };
    if (!('IntersectionObserver' in window)) {
      fire();
      return () => { if (startTimer) window.clearTimeout(startTimer); };
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          fire();
          io.disconnect();
          return;
        }
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => {
      io.disconnect();
      if (startTimer) window.clearTimeout(startTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mscard-stage">
      <div
        ref={arenaRef}
        className={`mscard-arena${compact ? ' is-compact' : ''}`}
      >
        <div className="mscard-aura" />
        <div className="mscard-aura-ring" />
        <div
          ref={rootRef}
          className="mscard-root"
          onClick={restart}
          onFocus={restart}
          role="button"
          tabIndex={0}
          aria-label="Magic card showcase — click or focus to replay"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); restart(); } }}
        >
          {/* ────── FRONT ────── */}
          {/* Front face is the literal hero MagicCard so top + bottom
              of the page show the same Chris Pachulski card. Foil + gleam
              overlay it as siblings inside the same backface-clipped face. */}
          <div className="mscard-face mscard-front">
            <MagicCardFace />
            <div className="mscard-foil" />
            <div className="mscard-gleam" />
          </div>

          {/* ────── BACK ────── */}
          <div className="mscard-face mscard-back" aria-hidden="true">
            <div className="mscard-back-frame">
              <span className="mscard-back-strip mscard-back-strip-top" />
              <div className="mscard-back-center">
                <div className="mscard-back-glow" />
                <div className="mscard-back-ring">
                  <svg viewBox="-50 -50 100 100">
                    <g stroke="rgba(255,255,255,0.16)" strokeWidth="0.5">
                      <line x1="0" y1="-46" x2="0" y2="-32"/>
                      <line x1="23" y1="-39.8" x2="16" y2="-27.7"/>
                      <line x1="39.8" y1="-23" x2="27.7" y2="-16"/>
                      <line x1="46" y1="0" x2="32" y2="0"/>
                      <line x1="39.8" y1="23" x2="27.7" y2="16"/>
                      <line x1="23" y1="39.8" x2="16" y2="27.7"/>
                      <line x1="0" y1="46" x2="0" y2="32"/>
                      <line x1="-23" y1="39.8" x2="-16" y2="27.7"/>
                      <line x1="-39.8" y1="23" x2="-27.7" y2="16"/>
                      <line x1="-46" y1="0" x2="-32" y2="0"/>
                      <line x1="-39.8" y1="-23" x2="-27.7" y2="-16"/>
                      <line x1="-23" y1="-39.8" x2="-16" y2="-27.7"/>
                    </g>
                    <circle cx="0" cy="0" r="46" fill="none"
                            stroke="rgba(255,255,255,0.22)" strokeWidth="0.6"/>
                    <circle cx="0" cy="0" r="32" fill="none"
                            stroke="rgba(255,255,255,0.32)" strokeWidth="0.6"/>
                  </svg>
                </div>
                <svg className="mscard-back-gem" viewBox="-50 -50 100 100" aria-hidden="true">
                  <defs>
                    <radialGradient id="mscard-gemFill" cx="40%" cy="30%" r="80%">
                      <stop offset="0%"   stopColor="#e6d4ff" />
                      <stop offset="35%"  stopColor="#a075f0" />
                      <stop offset="70%"  stopColor="#5a2da8" />
                      <stop offset="100%" stopColor="#1c0e3a" />
                    </radialGradient>
                    <linearGradient id="mscard-gemRim" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%"   stopColor="rgba(255,255,255,0.7)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19"
                    fill="url(#mscard-gemFill)"
                    stroke="url(#mscard-gemRim)"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <g stroke="rgba(255,255,255,0.32)" strokeWidth="0.5" fill="none">
                    <line x1="0" y1="0" x2="0"   y2="-38"/>
                    <line x1="0" y1="0" x2="33"  y2="-19"/>
                    <line x1="0" y1="0" x2="33"  y2="19"/>
                    <line x1="0" y1="0" x2="0"   y2="38"/>
                    <line x1="0" y1="0" x2="-33" y2="19"/>
                    <line x1="0" y1="0" x2="-33" y2="-19"/>
                  </g>
                  <polygon
                    points="0,-14 12,-7 12,7 0,14 -12,7 -12,-7"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="0.6"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="0,-38 33,-19 0,0 -33,-19"
                    fill="rgba(255,255,255,0.10)"
                  />
                </svg>
              </div>
              <span className="mscard-back-strip mscard-back-strip-bottom" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
