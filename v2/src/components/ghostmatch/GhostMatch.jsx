import { useEffect, useReducer, useRef, useState, useMemo, useCallback } from 'react';
import Card from './Card.jsx';
import { CARDS } from './cards.js';
import {
  INITIAL_STATE,
  MULLIGAN_OPENING,
  COUNTER_CARD_INST,
  SETUP_EVENTS,
  COUNTER_EVENTS,
  EXPIRE_EVENTS,
} from './match-script.js';
import './ghostmatch.css';

const COUNTER_TIMER_MS = 40000;

/* ── Reducer ────────────────────────────────────────────────────── */
function reducer(state, ev) {
  switch (ev.type) {
    case 'DEAL_OPENING':
      return {
        ...state,
        you: { ...state.you, hand: ev.opening.you.map(c => ({ ...c })) },
        opp: { ...state.opp, hand: ev.opening.opp.map(c => ({ ...c })) },
      };

    case 'LOG':
      return { ...state, log: [...state.log, { text: ev.text, kind: ev.kind || 'line' }] };

    case 'PHASE':
      return { ...state, turn: ev.turn, activePlayer: ev.player, phase: ev.label };

    case 'PROMPT':
      return { ...state, prompt: ev.prompt };

    case 'CLEAR_PROMPT':
      return { ...state, prompt: null };

    case 'LAND_DIRECT': {
      const p = ev.player;
      const side = state[p];
      return {
        ...state,
        [p]: {
          ...side,
          battlefield: {
            ...side.battlefield,
            lands: [...side.battlefield.lands, { instId: ev.instId, cardId: ev.cardId, tapped: !!ev.tapped }],
          },
        },
      };
    }

    case 'CAST_DIRECT':
      return {
        ...state,
        stack: [...state.stack, { instId: ev.instId, cardId: ev.cardId, owner: ev.player, countered: false, targetInstId: null }],
        focus: ev.instId,
      };

    case 'PLAY_LAND': {
      const p = ev.player;
      const side = state[p];
      const card = side.hand.find(c => c.instId === ev.instId);
      if (!card) return state;
      return {
        ...state,
        [p]: {
          ...side,
          hand: side.hand.filter(c => c.instId !== ev.instId),
          battlefield: {
            ...side.battlefield,
            lands: [...side.battlefield.lands, { instId: card.instId, cardId: card.cardId, tapped: false }],
          },
        },
      };
    }

    case 'TAP': {
      const p = ev.player;
      const side = state[p];
      const mark = list => list.map(c => c.instId === ev.instId ? { ...c, tapped: true } : c);
      return {
        ...state,
        [p]: {
          ...side,
          battlefield: {
            lands: mark(side.battlefield.lands),
            creatures: mark(side.battlefield.creatures),
            other: mark(side.battlefield.other),
          },
        },
      };
    }

    case 'CAST': {
      const p = ev.player;
      const side = state[p];
      const card = side.hand.find(c => c.instId === ev.instId);
      if (!card) return state;
      return {
        ...state,
        [p]: { ...side, hand: side.hand.filter(c => c.instId !== ev.instId) },
        stack: [...state.stack, { instId: card.instId, cardId: card.cardId, owner: p, countered: false, targetInstId: null }],
        focus: card.instId,
      };
    }

    case 'STACK_TARGET':
      return {
        ...state,
        stack: state.stack.map(s => s.instId === ev.sourceInstId ? { ...s, targetInstId: ev.targetInstId } : s),
      };

    case 'COUNTER_STAMP':
      return {
        ...state,
        stack: state.stack.map(s => s.instId === ev.instId ? { ...s, countered: true } : s),
      };

    case 'RESOLVE': {
      const item = state.stack.find(s => s.instId === ev.instId);
      if (!item) return state;
      const newStack = state.stack.filter(s => s.instId !== ev.instId);
      const def = CARDS[item.cardId];
      const ownerKey = item.owner;
      const ownerSide = state[ownerKey];

      if (item.countered) {
        return {
          ...state,
          stack: newStack,
          [ownerKey]: {
            ...ownerSide,
            graveyard: [...ownerSide.graveyard, { instId: item.instId, cardId: item.cardId, countered: true }],
          },
          focus: null,
        };
      }
      const isCreature = /Creature/.test(def.type);
      if (isCreature) {
        return {
          ...state,
          stack: newStack,
          [ownerKey]: {
            ...ownerSide,
            battlefield: {
              ...ownerSide.battlefield,
              creatures: [...ownerSide.battlefield.creatures, {
                instId: item.instId, cardId: item.cardId, tapped: false, damageTaken: 0,
                buffed: null, hasHaste: (def.abilities || []).includes('Haste'),
                hasTrample: false,
              }],
            },
          },
          focus: item.instId,
        };
      }
      return {
        ...state,
        stack: newStack,
        [ownerKey]: {
          ...ownerSide,
          graveyard: [...ownerSide.graveyard, { instId: item.instId, cardId: item.cardId }],
        },
        focus: null,
      };
    }

    case 'ETB_DAMAGE':
      return { ...state, [ev.target]: { ...state[ev.target], life: Math.max(0, state[ev.target].life - ev.amount) } };

    case 'VICTORY':
      return { ...state, ended: true, winner: ev.winner, focus: null, prompt: null };

    default:
      return state;
  }
}

/* ── Tease tile (default render — lives in document flow) ──────── */
function TeaseTile({ onPlay }) {
  return (
    <section className="gm-tile-wrap" aria-label="Optional ghost match">
      <button type="button" className="gm-tile" onClick={onPlay}>
        <div className="gm-tile-card" aria-hidden="true">
          <Card card="mtgban" size="hand" faceDown deckSide="you" />
        </div>
        <div className="gm-tile-meta">
          <div className="gm-tile-eyebrow">Optional · ~30 seconds</div>
          <div className="gm-tile-title">Play the opening hand</div>
          <div className="gm-tile-sub">
            Mulligan, hold the line against <em>The Deadlines</em>, win on turn 3.
          </div>
        </div>
        <span className="gm-tile-arrow" aria-hidden="true">→</span>
      </button>
    </section>
  );
}

/* ── Mulligan stage ────────────────────────────────────────────── */
function MulliganStage({ cards, onKeep, onSkip }) {
  const [flipped, setFlipped] = useState(() => new Set());
  const allFlipped = flipped.size === cards.length;
  const flip = (instId) => setFlipped(prev => {
    if (prev.has(instId)) return prev;
    const next = new Set(prev);
    next.add(instId);
    return next;
  });

  return (
    <div className="gm-mulligan" role="dialog" aria-label="Mulligan">
      <div className="gm-mulligan-header">
        <div className="gm-mulligan-eyebrow">Mulligan · 4 cards</div>
        <h2 className="gm-mulligan-title">
          Tap each card to <em>reveal</em> your hand.
        </h2>
        <p className="gm-mulligan-sub">
          You'll cast MTGBAN. The Deadlines will try to Red Tape it. Counter their counter.
        </p>
      </div>
      <div className="gm-mulligan-grid">
        {cards.map((c, i) => {
          const isFlipped = flipped.has(c.instId);
          return (
            <button
              type="button"
              key={c.instId}
              className={`gm-mulligan-slot${isFlipped ? ' is-flipped' : ''}`}
              style={{ '--n': i }}
              onClick={() => flip(c.instId)}
              aria-pressed={isFlipped}
              aria-label={isFlipped ? CARDS[c.cardId].name : `Card ${i + 1}, face down`}
            >
              <div className="gm-mulligan-flipper">
                <div className="gm-mulligan-back">
                  <Card card={c.cardId} size="hand" faceDown deckSide="you" />
                </div>
                <div className="gm-mulligan-face">
                  <Card card={c.cardId} size="hand" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="gm-mulligan-actions">
        <button type="button" className="gm-mulligan-skip" onClick={onSkip}>
          Skip <span aria-hidden="true">→</span> portfolio
        </button>
        <button
          type="button"
          className="gm-mulligan-keep"
          disabled={!allFlipped}
          onClick={onKeep}
        >
          {allFlipped
            ? <>Keep this hand <span aria-hidden="true">→</span></>
            : `Reveal ${cards.length - flipped.size} more`}
        </button>
      </div>
    </div>
  );
}

/* ── Counter prompt (player must click Counterflux; calm breath timer) ── */
function CounterPrompt({ remainingMs, paused, onCounter }) {
  const pct = Math.max(0, Math.min(1, remainingMs / COUNTER_TIMER_MS));
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const fireRef = useRef(null);
  useEffect(() => {
    fireRef.current?.focus({ preventScroll: true });
  }, []);
  const ariaLabel = paused
    ? `Cast Counterflux. Paused at ${seconds} seconds. Engage to resume.`
    : `Cast Counterflux. ${seconds} seconds remaining.`;
  return (
    <div className="gm-counter-prompt" role="alert" data-paused={paused ? 'true' : 'false'}>
      <div className="gm-counter-text">
        <div className="gm-counter-headline">Your move.</div>
        <div className="gm-counter-sub">
          Cast Counterflux. Click or press Enter.
        </div>
      </div>
      <button
        ref={fireRef}
        type="button"
        className="gm-counter-fire"
        onClick={onCounter}
        aria-label={ariaLabel}
      >
        <span className="gm-counter-fire-breath" aria-hidden="true" />
        <span className="gm-counter-fire-num">{seconds}</span>
      </button>
      <div className="gm-counter-meter" aria-hidden="true">
        <div className="gm-counter-meter-fill" style={{ transform: `scaleX(${pct})` }} />
      </div>
      <div className="gm-counter-paused" aria-live="polite">
        <span className="gm-counter-paused-dot" aria-hidden="true" />
        Paused. Focus the match to resume.
      </div>
    </div>
  );
}

/* ── Life total with smooth counter ─────────────────────────────── */
function LifeTotal({ label, value, side }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setDisplay(value); prev.current = value; return; }
    const from = prev.current;
    const to = value;
    const start = performance.now();
    const duration = 600;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = to;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return (
    <div className={`gm-life gm-life-${side}`}>
      <div className="gm-life-label">{label}</div>
      <div className={`gm-life-value${value < prev.current ? ' gm-life-down' : ''}`}>{display}</div>
    </div>
  );
}

/* ── Hand row (interactive when prompt='counter') ──────────────── */
function HandRow({ hand, side, focus, interactiveInst, onInteract }) {
  return (
    <div className={`gm-hand gm-hand-${side}`}>
      {hand.map((c, i) => {
        const isInteractive = side === 'you' && interactiveInst === c.instId;
        const className = [
          'gm-hand-slot',
          focus === c.instId && 'gm-hand-focus',
          c._reveal && 'gm-hand-reveal',
          isInteractive && 'gm-hand-interactive',
        ].filter(Boolean).join(' ');
        const inner = (
          <Card
            card={c.cardId}
            size="hand"
            faceDown={side === 'opp'}
            deckSide={side}
            focused={focus === c.instId}
          />
        );
        if (isInteractive) {
          return (
            <button
              type="button"
              key={c.instId}
              className={className}
              style={{ '--n': i, '--total': hand.length }}
              onClick={onInteract}
              aria-label={`Cast ${CARDS[c.cardId].name}`}
            >
              {inner}
            </button>
          );
        }
        return (
          <div
            key={c.instId}
            className={className}
            style={{ '--n': i, '--total': hand.length }}
          >
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/* ── Battlefield row (lands or creatures) ──────────────────────── */
function BattleRow({ items, side, row, focus }) {
  return (
    <div className={`gm-row gm-row-${row} gm-row-${side}`}>
      {items.map(c => (
        <div
          key={c.instId}
          className={[
            'gm-slot',
            c.tapped && 'gm-slot-tapped',
            c.attacking && 'gm-slot-attacking',
            c.blocking && 'gm-slot-blocking',
            focus === c.instId && 'gm-slot-focus',
          ].filter(Boolean).join(' ')}
        >
          <Card
            card={c.cardId}
            size="battlefield"
            tapped={c.tapped}
            buffed={c.buffed}
            focused={focus === c.instId}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Stack (center, floating) ──────────────────────────────────── */
function StackZone({ stack }) {
  if (!stack.length) return null;
  return (
    <div className="gm-stack" aria-label="The stack">
      <div className="gm-stack-label">THE STACK</div>
      {stack.map((s, i) => (
        <div key={s.instId} className={`gm-stack-item${s.countered ? ' gm-stack-countered' : ''}`} style={{ '--i': i }}>
          <Card card={s.cardId} size="stack" countered={s.countered} />
        </div>
      ))}
    </div>
  );
}

/* ── Log panel ─────────────────────────────────────────────────── */
function LogPanel({ log, phase, ended, expired }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);
  const summary = ended
    ? (expired
        ? 'Match complete. Counter resolved on instinct, six damage stuck.'
        : 'Match complete. Counter resolved, six damage stuck. Izzet wins.')
    : '';
  return (
    <div className="gm-log">
      <div className="gm-log-head">
        <span className="gm-log-dot" /> {phase || 'Match start'}
      </div>
      <div className="gm-log-scroll" ref={ref}>
        {log.slice(-7).map((l, i) => (
          <div key={log.length - 7 + i} className={`gm-log-line gm-log-${l.kind}`}>{l.text}</div>
        ))}
      </div>
      <div className="gm-log-sr" aria-live="polite" aria-atomic="true">
        {summary}
      </div>
    </div>
  );
}

/* ── Victory screen ────────────────────────────────────────────── */
function VictoryScreen({ onContinue, expired }) {
  return (
    <div className="gm-victory" role="dialog" aria-label="Match complete">
      <div className="gm-victory-inner">
        <div className="gm-victory-label">{expired ? 'CLOSE CALL' : 'MATCH COMPLETE'}</div>
        <h2 className="gm-victory-title">Izzet · Data-Driven <span>wins.</span></h2>
        <p className="gm-victory-sub">
          {expired
            ? 'The reflex held. Counter resolved on instinct, six damage stuck. Scroll for the rest of the spellbook.'
            : 'Counter resolved, six damage stuck. The site below was built by the wizard who cast MTGBAN.'}
        </p>
        <div className="gm-victory-tags">
          <span>WotC Senior Economic Analyst</span>
          <span>MTGBAN co-founder · $1.2M ARR</span>
          <span>8 yrs shipping data systems</span>
        </div>
        <button type="button" className="gm-victory-cta" onClick={onContinue}>
          Explore the portfolio <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export default function GhostMatch({ onComplete }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [stage, setStage] = useState('tile'); // tile | mulligan | setup | counter | resolving
  const [expired, setExpired] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const counterFiredRef = useRef(false);

  /* Engagement state for the counter prompt's pause behavior.
     The panic only fires for engaged players: timer pauses when the tab
     is hidden, or when both cursor and focus have left gm-root. */
  const [cursorInside, setCursorInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const counterPaused = stage === 'counter' && (tabHidden || (!cursorInside && !focusInside));
  const counterPausedRef = useRef(counterPaused);
  useEffect(() => { counterPausedRef.current = counterPaused; }, [counterPaused]);

  /* Speed control for the setup-events runner.
     1× / 2× re-pace at the next event boundary; 'instant' flushes remaining
     events synchronously and advances the stage. The runner reads speedRef
     each tick so toggles take effect mid-stream without restarting. */
  const speedRef = useRef(1);
  const [setupSpeed, setSetupSpeed] = useState(1);
  const setupIndexRef = useRef(0);
  const setupTimerRef = useRef(null);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  /* Open the playable overlay. */
  const openMatch = useCallback(() => {
    setStage('mulligan');
  }, []);

  /* Skip / close at any stage. */
  const handleClose = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  /* Victory continue: scroll to #about so the page picks up where the tile left off. */
  const handleVictoryContinue = useCallback(() => {
    const target = document.getElementById('about');
    onComplete?.();
    if (target) {
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [onComplete]);

  /* Mulligan → setup. */
  const keepHand = useCallback(() => {
    dispatch({ type: 'DEAL_OPENING', opening: MULLIGAN_OPENING });
    setStage('setup');
  }, []);

  /* Counter trigger (player click or timer expiry). */
  const fireCounter = useCallback((expiredFlag = false) => {
    if (counterFiredRef.current) return;
    counterFiredRef.current = true;
    setExpired(expiredFlag);
    setStage('resolving');
  }, []);

  /* Lock body scroll while overlay is open. */
  useEffect(() => {
    if (stage === 'tile') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [stage]);

  /* ESC closes the overlay from any stage. */
  useEffect(() => {
    if (stage === 'tile') return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, handleClose]);

  /* Setup events runner: on entering 'setup', play through SETUP_EVENTS, then transition to 'counter'.
     Reads speedRef each tick so 1× ↔ 2× toggles re-pace at the next event boundary.
     Index and timer live in refs so claimSpeed('instant') can cancel the pending tick
     and flush remaining events synchronously. */
  useEffect(() => {
    if (stage !== 'setup') return;
    setupIndexRef.current = 0;
    speedRef.current = 1;
    setSetupSpeed(1);
    let cancelled = false;
    const baseFactor = reduceMotion ? 0.15 : 1;
    const runNext = () => {
      if (cancelled) return;
      if (speedRef.current === 'instant') {
        while (setupIndexRef.current < SETUP_EVENTS.length) {
          dispatch(SETUP_EVENTS[setupIndexRef.current++]);
        }
        setStage('counter');
        return;
      }
      if (setupIndexRef.current >= SETUP_EVENTS.length) {
        setStage('counter');
        return;
      }
      const ev = SETUP_EVENTS[setupIndexRef.current++];
      const userSpeed = typeof speedRef.current === 'number' ? speedRef.current : 1;
      const delay = Math.max(20, ((ev.d || 0) * baseFactor) / userSpeed);
      setupTimerRef.current = setTimeout(() => {
        dispatch(ev);
        runNext();
      }, delay);
    };
    runNext();
    return () => {
      cancelled = true;
      if (setupTimerRef.current) {
        clearTimeout(setupTimerRef.current);
        setupTimerRef.current = null;
      }
    };
  }, [stage, reduceMotion]);

  /* User claims the pace. Mirrors AboutSkills' "user took over" pattern:
     ref drives the in-flight runner; state drives the UI. 'instant' clears
     the pending timer and flushes remaining events in one render. */
  const claimSpeed = useCallback((s) => {
    speedRef.current = s;
    setSetupSpeed(s);
    if (s === 'instant') {
      if (setupTimerRef.current) {
        clearTimeout(setupTimerRef.current);
        setupTimerRef.current = null;
      }
      while (setupIndexRef.current < SETUP_EVENTS.length) {
        dispatch(SETUP_EVENTS[setupIndexRef.current++]);
      }
      setStage('counter');
    }
  }, []);

  /* Counter timer: elapsed-based clock so pause/resume freezes time cleanly.
     Tick every 100ms, accumulate dt only while not paused, auto-fire on expiry.
     Reads counterPausedRef each tick so engagement-state changes take effect
     without restarting the interval. */
  useEffect(() => {
    if (stage !== 'counter') return;
    elapsedRef.current = 0;
    setElapsed(0);
    let cancelled = false;
    let lastT = performance.now();
    const interval = setInterval(() => {
      if (cancelled) return;
      const t = performance.now();
      const dt = t - lastT;
      lastT = t;
      if (counterPausedRef.current) return;
      elapsedRef.current = Math.min(COUNTER_TIMER_MS, elapsedRef.current + dt);
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= COUNTER_TIMER_MS) {
        fireCounter(true);
      }
    }, 100);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stage, fireCounter]);

  /* Tab visibility — pause the counter when the tab is hidden.
     Counter stage is only reached after live interaction, so initial
     hidden=false is safe; we just listen for changes from here on. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  /* Resolution events runner: plays counter or expire path. */
  useEffect(() => {
    if (stage !== 'resolving') return;
    const events = expired ? EXPIRE_EVENTS : COUNTER_EVENTS;
    let cancelled = false;
    let timer = null;
    let i = 0;
    const speed = reduceMotion ? 0.15 : 1;
    const runNext = () => {
      if (cancelled || i >= events.length) return;
      const ev = events[i++];
      const delay = Math.max(20, (ev.d || 0) * speed);
      timer = setTimeout(() => {
        dispatch(ev);
        runNext();
      }, delay);
    };
    runNext();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [stage, expired, reduceMotion]);

  if (stage === 'tile') {
    return <TeaseTile onPlay={openMatch} />;
  }

  const remainingMs = stage === 'counter'
    ? Math.max(0, COUNTER_TIMER_MS - elapsed)
    : COUNTER_TIMER_MS;
  const showCounterPrompt = stage === 'counter' && state.prompt === 'counter' && !state.ended;
  const interactiveInst = showCounterPrompt ? COUNTER_CARD_INST : null;

  return (
    <section
      className="gm-root"
      aria-label="Ghost match"
      data-stage={stage}
      data-ended={state.ended ? 'true' : 'false'}
      onMouseEnter={() => setCursorInside(true)}
      onMouseLeave={() => setCursorInside(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setFocusInside(false);
      }}
    >
      <div className="gm-bg" aria-hidden="true" />

      <button
        type="button"
        className="gm-close"
        onClick={handleClose}
        aria-label="Close match"
      >
        <span aria-hidden="true">×</span>
      </button>

      {stage === 'mulligan' ? (
        <MulliganStage cards={MULLIGAN_OPENING.you} onKeep={keepHand} onSkip={handleClose} />
      ) : (
        <>
          {/* Opponent zone */}
          <div className="gm-zone gm-zone-opp">
            <div className="gm-ribbon">
              <LifeTotal label={state.opp.name} value={state.opp.life} side="opp" />
              <div className="gm-ribbon-center">
                <div className="gm-deck-name">{state.opp.deckName}</div>
              </div>
              <div className="gm-pile">
                <div className="gm-pile-label">Library</div>
                <div className="gm-pile-count">{60 - state.opp.graveyard.length - state.opp.battlefield.lands.length - state.opp.battlefield.creatures.length - state.opp.battlefield.other.length - state.opp.hand.length}</div>
              </div>
            </div>
            <HandRow hand={state.opp.hand} side="opp" focus={state.focus} />
            <BattleRow items={state.opp.battlefield.creatures} side="opp" row="creatures" focus={state.focus} />
            <BattleRow items={state.opp.battlefield.lands} side="opp" row="lands" focus={state.focus} />
          </div>

          {/* Center: phase banner + stack */}
          <div className="gm-center">
            {state.phase && <div className="gm-phase-banner">{state.phase}</div>}
            <StackZone stack={state.stack} />
          </div>

          {/* Your zone */}
          <div className="gm-zone gm-zone-you">
            <BattleRow items={state.you.battlefield.lands} side="you" row="lands" focus={state.focus} />
            <BattleRow items={state.you.battlefield.creatures.concat(state.you.battlefield.other)} side="you" row="creatures" focus={state.focus} />
            <HandRow
              hand={state.you.hand}
              side="you"
              focus={state.focus}
              interactiveInst={interactiveInst}
              onInteract={() => fireCounter(false)}
            />
            <div className="gm-ribbon">
              <LifeTotal label={state.you.name} value={state.you.life} side="you" />
              <div className="gm-ribbon-center">
                <div className="gm-deck-name">{state.you.deckName}</div>
              </div>
              <div className="gm-pile">
                <div className="gm-pile-label">Library</div>
                <div className="gm-pile-count">{60 - state.you.graveyard.length - state.you.battlefield.lands.length - state.you.battlefield.creatures.length - state.you.battlefield.other.length - state.you.hand.length}</div>
              </div>
            </div>
          </div>

          {/* HUD: log + skip */}
          <div className="gm-hud">
            <LogPanel log={state.log} phase={state.phase} ended={state.ended} expired={expired} />
            <div className="gm-controls">
              {stage === 'setup' && !reduceMotion && (
                <div className="gm-speeds" role="group" aria-label="Setup playback speed">
                  <button
                    type="button"
                    className={`gm-speed${setupSpeed === 1 ? ' gm-speed-on' : ''}`}
                    onClick={() => claimSpeed(1)}
                    aria-pressed={setupSpeed === 1}
                  >
                    1×
                  </button>
                  <button
                    type="button"
                    className={`gm-speed${setupSpeed === 2 ? ' gm-speed-on' : ''}`}
                    onClick={() => claimSpeed(2)}
                    aria-pressed={setupSpeed === 2}
                  >
                    2×
                  </button>
                  <button
                    type="button"
                    className="gm-speed gm-speed-instant"
                    onClick={() => claimSpeed('instant')}
                  >
                    Instant <span aria-hidden="true">↦</span>
                  </button>
                </div>
              )}
              <button type="button" className="gm-skip" onClick={handleClose}>
                Skip <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {showCounterPrompt && (
            <CounterPrompt
              remainingMs={remainingMs}
              paused={counterPaused}
              onCounter={() => fireCounter(false)}
            />
          )}

          {state.ended && <VictoryScreen onContinue={handleVictoryContinue} expired={expired} />}
        </>
      )}
    </section>
  );
}
