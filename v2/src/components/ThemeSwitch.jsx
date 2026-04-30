import { useRef } from 'react';

const SEGMENTS = [
  {
    value: 'after-hours',
    label: 'After hours',
    short: 'After',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d="M11.6 9.5a4.6 4.6 0 0 1-5.7-5.7 5.2 5.2 0 1 0 5.7 5.7Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    value: 'office-hours',
    label: 'Office hours',
    short: 'Office',
    icon: (
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="2.6" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <line x1="8" y1="1.6" x2="8" y2="3.2" />
          <line x1="8" y1="12.8" x2="8" y2="14.4" />
          <line x1="1.6" y1="8" x2="3.2" y2="8" />
          <line x1="12.8" y1="8" x2="14.4" y2="8" />
          <line x1="3.5" y1="3.5" x2="4.6" y2="4.6" />
          <line x1="11.4" y1="11.4" x2="12.5" y2="12.5" />
          <line x1="3.5" y1="12.5" x2="4.6" y2="11.4" />
          <line x1="11.4" y1="4.6" x2="12.5" y2="3.5" />
        </g>
      </svg>
    ),
  },
];

export default function ThemeSwitch({ mode, onChange }) {
  const buttonsRef = useRef([]);

  const handleKey = (e, idx) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    const nextIdx = (idx + dir + SEGMENTS.length) % SEGMENTS.length;
    const nextValue = SEGMENTS[nextIdx].value;
    buttonsRef.current[nextIdx]?.focus();
    if (nextValue !== mode) onChange(nextValue);
  };

  return (
    <div className="theme-switch" role="radiogroup" aria-label="Display mode">
      {SEGMENTS.map((seg, i) => {
        const active = mode === seg.value;
        return (
          <button
            key={seg.value}
            ref={(el) => (buttonsRef.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={`theme-switch-seg${active ? ' active' : ''}`}
            onClick={() => { if (!active) onChange(seg.value); }}
            onKeyDown={(e) => handleKey(e, i)}
          >
            <span className="theme-switch-icon">{seg.icon}</span>
            <span className="theme-switch-label">{seg.label}</span>
            <span className="theme-switch-short">{seg.short}</span>
          </button>
        );
      })}
      <span className="theme-switch-sr" aria-live="polite">
        Display mode: {mode === 'office-hours' ? 'office hours' : 'after hours'}
      </span>
    </div>
  );
}
