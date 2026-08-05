import { forwardRef } from 'react';

/* MagicCardFace
 *
 * The literal "Chris Pachulski" Magic card — single source of truth for
 * the card content shown on the Hero (top of page) and on the front face
 * of the contact-section MagicShowcaseCard (bottom of page). Top/bottom
 * consistency lives here: change name / art / type line / rules text /
 * P-T in one place and both surfaces update.
 *
 * Returns the `.mtg-card` root + `.mtg-frame` content tree. ForwardRef
 * lets the Hero attach its cursor-tracking tilt to the same DOM element.
 * Other consumers (showcase card) can ignore the ref.
 */
const MagicCardFace = forwardRef(function MagicCardFace(_props, ref) {
  return (
    <div
      ref={ref}
      className="mtg-card"
      role="img"
      aria-label="Chris Pachulski: a custom Magic-style card"
    >
      <div className="mtg-frame">
        <div className="mtg-titlebar mtg-stage" style={{ '--d': '0.10s' }}>
          <div className="mtg-name">Chris Pachulski</div>
          <div className="mtg-mana">
            <span className="mtg-pip pip-gen mtg-stage" style={{ '--d': '0.55s' }}>2</span>
            <span className="mtg-pip pip-u mtg-stage" style={{ '--d': '0.65s' }} aria-label="Blue mana">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M10 2.5 C 10 2.5, 4.5 8.5, 4.5 12.5 C 4.5 16, 7 18, 10 18 C 13 18, 15.5 16, 15.5 12.5 C 15.5 8.5, 10 2.5, 10 2.5 Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="mtg-pip pip-r mtg-stage" style={{ '--d': '0.75s' }} aria-label="Red mana">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M10 2.5 C 11 5, 13.5 6, 13.5 9 C 13.5 10.5, 12.8 11.5, 12 12 C 13.5 11, 15 10, 15.5 8 C 16.5 11, 16 14.5, 13.5 16.5 C 11.5 18, 8.5 18, 6.5 16.5 C 4 14.5, 3.5 11, 4.5 8 C 5 10, 6.5 11, 8 12 C 7.2 11.5, 6.5 10.5, 6.5 9 C 6.5 6, 9 5, 10 2.5 Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        </div>

        <div className="mtg-art mtg-stage" style={{ '--d': '0.25s' }}>
          <img
            src="/hero-art.webp"
            alt="Chris Pachulski, painted as an Izzet wizard"
            draggable="false"
            onError={(e) => e.currentTarget.parentElement.classList.add('mtg-art-fallback')}
          />
        </div>

        <div className="mtg-typebar mtg-stage" style={{ '--d': '0.95s' }}>
          <span className="mtg-type">Legendary Creature — Human Wizard</span>
          <span className="mtg-setsymbol" aria-hidden="true">◆</span>
        </div>

        <div className="mtg-textbox">
          <p className="mtg-rule mtg-stage" style={{ '--d': '1.15s' }}>Python, SQL, R</p>
          <p className="mtg-rule mtg-stage" style={{ '--d': '1.30s' }}>Protection from Data</p>
          <p className="mtg-rule mtg-stage" style={{ '--d': '1.45s' }}>
            This creature's power is equal to the number of ETL pipelines you control, and its toughness is equal to that number plus 1.
          </p>
          <p className="mtg-flavor mtg-stage" style={{ '--d': '1.75s' }}>
            "Short of leg. Long of opinion. The toddlers and dachshunds are brothers in arms and rule my life."
          </p>
        </div>

        <div className="mtg-bottom">
          <span className="mtg-pt mtg-stage" style={{ '--d': '2.05s' }}>*/*+1</span>
        </div>
      </div>
    </div>
  );
});

export default MagicCardFace;
