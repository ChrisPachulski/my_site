import { CARDS } from './cards.js';

/* Inline mana pip SVGs — same shape language as Hero's MagicCard. */
const PIP_SVG = {
  U: (<path d="M10 2.5 C 10 2.5, 4.5 8.5, 4.5 12.5 C 4.5 16, 7 18, 10 18 C 13 18, 15.5 16, 15.5 12.5 C 15.5 8.5, 10 2.5, 10 2.5 Z" fill="currentColor"/>),
  R: (<path d="M10 2.5 C 11 5, 13.5 6, 13.5 9 C 13.5 10.5, 12.8 11.5, 12 12 C 13.5 11, 15 10, 15.5 8 C 16.5 11, 16 14.5, 13.5 16.5 C 11.5 18, 8.5 18, 6.5 16.5 C 4 14.5, 3.5 11, 4.5 8 C 5 10, 6.5 11, 8 12 C 7.2 11.5, 6.5 10.5, 6.5 9 C 6.5 6, 9 5, 10 2.5 Z" fill="currentColor"/>),
  W: (<circle cx="10" cy="10" r="6.5" fill="currentColor"/>),
  B: (<circle cx="10" cy="10" r="6.5" fill="currentColor"/>),
};

function ManaPip({ symbol }) {
  if (/^\d+$/.test(symbol)) {
    return <span className="gm-pip gm-pip-gen">{symbol}</span>;
  }
  return (
    <span className={`gm-pip gm-pip-${symbol.toLowerCase()}`} aria-label={`${symbol} mana`}>
      <svg viewBox="0 0 20 20" aria-hidden="true">{PIP_SVG[symbol]}</svg>
    </span>
  );
}

function ManaCost({ cost }) {
  if (!cost) return null;
  return (
    <div className="gm-cost">
      {cost.map((s, i) => <ManaPip key={i} symbol={s} />)}
    </div>
  );
}

/* Card art is pure CSS — each "art kind" has a gradient treatment. */
function CardArt({ kind, legendary }) {
  return (
    <div className={`gm-art gm-art-${kind}${legendary ? ' gm-art-leg' : ''}`}>
      <div className="gm-art-fx" />
      <div className="gm-art-fx gm-art-fx-2" />
      {/* Subtle glyph for legendaries */}
      {legendary && <div className="gm-art-crest">◆</div>}
    </div>
  );
}

/* Frame color: single color → that color; multi → izzet gradient; colorless → neutral. */
function frameClass(colors = []) {
  if (!colors || colors.length === 0) return 'gm-frame-c';
  if (colors.length === 1) return `gm-frame-${colors[0].toLowerCase()}`;
  // Two-color: special-case izzet (U+R) and orzhov (W+B)
  const key = colors.slice().sort().join('');
  if (key === 'RU') return 'gm-frame-izzet';
  if (key === 'BW') return 'gm-frame-orzhov';
  return 'gm-frame-multi';
}

export default function Card({
  card,           // card data from CARDS (or cardId string)
  size = 'hand',  // 'hand' | 'battlefield' | 'stack' | 'hero'
  tapped = false,
  faceDown = false,
  countered = false,
  focused = false,
  buffed = null,  // {p, t} delta from enchantment
  deckSide = 'you', // for face-down back style
}) {
  const c = typeof card === 'string' ? CARDS[card] : card;
  if (!c) return null;

  const classes = [
    'gm-card',
    `gm-size-${size}`,
    frameClass(c.colors),
    tapped && 'gm-tapped',
    faceDown && 'gm-facedown',
    countered && 'gm-countered',
    focused && 'gm-focused',
    c.isLand && 'gm-is-land',
    c.legendary && 'gm-is-legendary',
  ].filter(Boolean).join(' ');

  if (faceDown) {
    return (
      <div className={`${classes} gm-back-${deckSide}`} aria-hidden="true">
        <div className="gm-back-face">
          <div className="gm-back-crest">{deckSide === 'you' ? '◆' : '✕'}</div>
          <div className="gm-back-label">{deckSide === 'you' ? 'IZZET' : 'DEADLINES'}</div>
        </div>
      </div>
    );
  }

  const totalPower = c.power != null ? c.power + (buffed?.p || 0) : null;
  const totalTough = c.toughness != null ? c.toughness + (buffed?.t || 0) : null;

  return (
    <div className={classes} role="img" aria-label={c.name}>
      <div className="gm-frame">
        <div className="gm-titlebar">
          <span className="gm-name">{c.name}</span>
          <ManaCost cost={c.cost} />
        </div>
        <CardArt kind={c.art} legendary={c.legendary} />
        <div className="gm-typebar">
          <span className="gm-type">{c.type}</span>
          {c.legendary && <span className="gm-set">◆</span>}
        </div>
        <div className="gm-text">
          {c.text && <p className="gm-rule">{c.text.replaceAll('~', c.name.split(' ')[0])}</p>}
          {c.flavor && <p className="gm-flavor">{c.flavor}</p>}
        </div>
        <div className="gm-bottom">
          {totalPower != null && (
            <span className={`gm-pt${buffed ? ' gm-pt-buffed' : ''}`}>
              {totalPower}/{totalTough}
            </span>
          )}
        </div>
        {countered && (
          <div className="gm-counter-stamp" aria-label="Countered">
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M 25 25 L 75 75 M 75 25 L 25 75" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            </svg>
            <span>COUNTERED</span>
          </div>
        )}
      </div>
    </div>
  );
}
