import { useEffect, useReducer, useRef, useState, useMemo } from 'react';
import Card from './Card.jsx';
import { CARDS } from './cards.js';
import { INITIAL_STATE, OPENING, EVENTS } from './match-script.js';
import './ghostmatch.css';

/* ── Reducer ────────────────────────────────────────────────────── */
function reducer(state, ev) {
  switch (ev.type) {
    case 'DEAL_OPENING':
      return {
        ...state,
        you: { ...state.you, hand: OPENING.you.map(c => ({ ...c })) },
        opp: { ...state.opp, hand: OPENING.opp.map(c => ({ ...c })) },
      };

    case 'LOG':
      return { ...state, log: [...state.log, { text: ev.text, kind: ev.kind || 'line' }] };

    case 'PHASE':
      return { ...state, turn: ev.turn, activePlayer: ev.player, phase: ev.label };

    case 'DRAW':
    case 'DRAW_REVEAL': {
      const p = ev.player;
      const side = state[p];
      const reveal = ev.type === 'DRAW_REVEAL';
      return {
        ...state,
        [p]: { ...side, hand: [...side.hand, { instId: ev.instId, cardId: ev.cardId, _justDrawn: true, _reveal: reveal }] },
        focus: reveal ? ev.instId : state.focus,
      };
    }

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

    case 'UNTAP_ALL': {
      const p = ev.player;
      const side = state[p];
      const untap = list => list.map(c => ({ ...c, tapped: false, attacking: false, blocking: null, damageTaken: 0 }));
      return {
        ...state,
        [p]: {
          ...side,
          battlefield: {
            lands: untap(side.battlefield.lands),
            creatures: untap(side.battlefield.creatures),
            other: untap(side.battlefield.other),
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
      const isEnchant = /Enchantment/.test(def.type);
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
      if (isEnchant) {
        return {
          ...state,
          stack: newStack,
          [ownerKey]: {
            ...ownerSide,
            battlefield: {
              ...ownerSide.battlefield,
              other: [...ownerSide.battlefield.other, { instId: item.instId, cardId: item.cardId }],
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

    case 'ETB_DAMAGE': {
      const t = ev.target;
      return { ...state, [t]: { ...state[t], life: Math.max(0, state[t].life - ev.amount) } };
    }

    case 'ATTACK': {
      const p = ev.player;
      const side = state[p];
      return {
        ...state,
        [p]: {
          ...side,
          battlefield: {
            ...side.battlefield,
            creatures: side.battlefield.creatures.map(c => c.instId === ev.instId ? { ...c, tapped: true, attacking: true } : c),
          },
        },
      };
    }

    case 'BLOCK': {
      const next = { ...state };
      for (const p of ['you', 'opp']) {
        const side = state[p];
        const has = side.battlefield.creatures.some(c => c.instId === ev.blockerInstId);
        if (has) {
          next[p] = {
            ...side,
            battlefield: {
              ...side.battlefield,
              creatures: side.battlefield.creatures.map(c => c.instId === ev.blockerInstId ? { ...c, blocking: ev.attackerInstId } : c),
            },
          };
        }
      }
      return next;
    }

    case 'COMBAT_DAMAGE': {
      if (ev.toPlayer) {
        const t = ev.toPlayer;
        return { ...state, [t]: { ...state[t], life: Math.max(0, state[t].life - ev.amount) } };
      }
      let next = { ...state };
      for (const p of ['you', 'opp']) {
        const side = next[p];
        const cr = side.battlefield.creatures.find(c => c.instId === ev.toInstId);
        if (!cr) continue;
        if (ev.dies) {
          next[p] = {
            ...side,
            battlefield: {
              ...side.battlefield,
              creatures: side.battlefield.creatures.filter(c => c.instId !== ev.toInstId),
            },
            graveyard: [...side.graveyard, { instId: cr.instId, cardId: cr.cardId }],
          };
        } else {
          next[p] = {
            ...side,
            battlefield: {
              ...side.battlefield,
              creatures: side.battlefield.creatures.map(c => c.instId === ev.toInstId ? { ...c, damageTaken: (c.damageTaken || 0) + ev.amount } : c),
            },
          };
        }
      }
      return next;
    }

    case 'BUFF_CREATURES': {
      const p = ev.player;
      const side = state[p];
      return {
        ...state,
        [p]: {
          ...side,
          battlefield: {
            ...side.battlefield,
            creatures: side.battlefield.creatures.map(c => ({
              ...c,
              buffed: { p: (c.buffed?.p || 0) + ev.p, t: (c.buffed?.t || 0) + ev.t },
              hasHaste: c.hasHaste || ev.grantsHaste,
              hasTrample: c.hasTrample || ev.grantsTrample,
            })),
          },
        },
      };
    }

    case 'END_TURN':
      return { ...state, focus: null };

    case 'VICTORY':
      return { ...state, ended: true, winner: ev.winner, focus: null };

    default:
      return state;
  }
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

/* ── Hand row ───────────────────────────────────────────────────── */
function HandRow({ hand, side, focus }) {
  return (
    <div className={`gm-hand gm-hand-${side}`}>
      {hand.map((c, i) => (
        <div
          key={c.instId}
          className={`gm-hand-slot${focus === c.instId ? ' gm-hand-focus' : ''}${c._reveal ? ' gm-hand-reveal' : ''}`}
          style={{ '--n': i, '--total': hand.length }}
        >
          <Card
            card={c.cardId}
            size="hand"
            faceDown={side === 'opp'}
            deckSide={side}
            focused={focus === c.instId}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Battlefield row (lands or creatures) ──────────────────────── */
function BattleRow({ items, side, row, focus, attackingTo }) {
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
function LogPanel({ log, phase }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);
  return (
    <div className="gm-log" aria-live="polite">
      <div className="gm-log-head">
        <span className="gm-log-dot" /> {phase || 'Match start'}
      </div>
      <div className="gm-log-scroll" ref={ref}>
        {log.slice(-7).map((l, i) => (
          <div key={log.length - 7 + i} className={`gm-log-line gm-log-${l.kind}`}>{l.text}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Victory screen ────────────────────────────────────────────── */
function VictoryScreen({ onContinue }) {
  return (
    <div className="gm-victory" role="dialog" aria-label="Match complete">
      <div className="gm-victory-inner">
        <div className="gm-victory-label">MATCH COMPLETE</div>
        <h2 className="gm-victory-title">Izzet · Data-Driven <span>wins.</span></h2>
        <p className="gm-victory-sub">
          This site was built by the wizard who cast MTGBAN. Scroll down for the rest of the spellbook.
        </p>
        <div className="gm-victory-tags">
          <span>WotC Senior Data Scientist</span>
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
  const [idx, setIdx] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef(null);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Auto-skip when reduced motion — fire onComplete so parent unmounts cleanly.
  useEffect(() => {
    if (reduceMotion) {
      setSkipped(true);
      onComplete?.();
    }

  }, [reduceMotion]);

  // Advance through the script
  useEffect(() => {
    if (skipped || state.ended) return;
    if (idx >= EVENTS.length) return;
    const ev = EVENTS[idx];
    const delay = Math.max(40, (ev.d || 300) / speed);
    timerRef.current = setTimeout(() => {
      dispatch(ev);
      setIdx(i => i + 1);
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, skipped, state.ended, speed]);

  const handleSkip = () => {
    setSkipped(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    onComplete?.();
  };

  const handleContinue = () => {
    onComplete?.();
  };

  if (skipped && !state.ended) {
    // Instant skip path — no match UI, just invoke onComplete; parent scrolls away.
    return null;
  }

  return (
    <section className="gm-root" aria-label="Ghost match intro" data-ended={state.ended ? 'true' : 'false'}>
      <div className="gm-bg" aria-hidden="true" />
      <div className="gm-scan" aria-hidden="true" />

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
        <HandRow hand={state.you.hand} side="you" focus={state.focus} />
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

      {/* Log + controls (bottom-right) */}
      <div className="gm-hud">
        <LogPanel log={state.log} phase={state.phase} />
        <div className="gm-controls">
          <button
            type="button"
            className={`gm-speed${speed === 1.5 ? ' gm-speed-on' : ''}`}
            onClick={() => setSpeed(s => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))}
            aria-label="Playback speed"
            title="Playback speed"
          >
            {speed}×
          </button>
          <button type="button" className="gm-skip" onClick={handleSkip}>
            Skip match <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {state.ended && <VictoryScreen onContinue={handleContinue} />}
    </section>
  );
}
