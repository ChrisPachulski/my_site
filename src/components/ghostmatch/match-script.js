/* Ghost Match — playable beats.
   Mulligan picks the 4-card hand; setup auto-sequences three turns in ~3 seconds;
   the player counters Red Tape with one click to win on turn 3. */

export const INITIAL_STATE = {
  phase: 'pregame',
  turn: 0,
  activePlayer: null,
  prompt: null,
  you: {
    name: 'Chris',
    deckName: 'Izzet · Data-Driven',
    life: 20,
    hand: [],
    library: [],
    battlefield: { lands: [], creatures: [], other: [] },
    graveyard: [],
  },
  opp: {
    name: 'The Deadlines',
    deckName: 'Orzhov · Bureaucracy',
    life: 20,
    hand: [],
    library: [],
    battlefield: { lands: [], creatures: [], other: [] },
    graveyard: [],
  },
  stack: [],
  log: [],
  focus: null,
  ended: false,
  winner: null,
};

/* The 4 cards the player keeps for the playable beat.
   Mana resolves cleanly: Snowflake (U/R) + Bigquery (U) + ambient lands cover
   {1}{U}{R} for MTGBAN with 2 blue sources still untapped for Counterflux's {U}{U}. */
export const MULLIGAN_OPENING = {
  you: [
    { instId: 'you-snowflake-1',   cardId: 'snowflake' },
    { instId: 'you-bigquery-1',    cardId: 'bigquery' },
    { instId: 'you-mtgban-1',      cardId: 'mtgban' },
    { instId: 'you-counterflux-1', cardId: 'counterflux' },
  ],
  opp: [
    { instId: 'opp-filler-1', cardId: 'undocumented-script' },
    { instId: 'opp-filler-2', cardId: 'meeting-overrun' },
    { instId: 'opp-filler-3', cardId: 'scope-creep' },
  ],
};

/* The card the player must click to win. UI highlights this card. */
export const COUNTER_CARD_INST = 'you-counterflux-1';

/* Setup beat — three turns of board state in ~3 seconds.
   Lands that aren't in the mulligan hand arrive via LAND_DIRECT (off-screen draws). */
export const SETUP_EVENTS = [
  { d: 200, type: 'LOG', text: '// T1–T3 elapse. Lands resolve.', kind: 'header' },

  // Off-deck lands so the mana math closes without dragging out the play sequence.
  { d: 70, type: 'LAND_DIRECT', player: 'you', cardId: 'pacific-ocean', instId: 'you-pacific-1' },
  { d: 70, type: 'LAND_DIRECT', player: 'you', cardId: 'pacific-ocean', instId: 'you-pacific-2' },
  { d: 70, type: 'LAND_DIRECT', player: 'you', cardId: 'do-droplet',    instId: 'you-droplet-1' },

  // Mulligan-hand lands play from hand so the player feels them land.
  { d: 90, type: 'PLAY_LAND', player: 'you', instId: 'you-bigquery-1' },
  { d: 90, type: 'PLAY_LAND', player: 'you', instId: 'you-snowflake-1' },

  // Opp lands.
  { d: 70, type: 'LAND_DIRECT', player: 'opp', cardId: 'another-meeting', instId: 'opp-plains-1' },
  { d: 70, type: 'LAND_DIRECT', player: 'opp', cardId: 'another-meeting', instId: 'opp-plains-2' },

  { d: 500, type: 'PHASE', turn: 3, player: 'you', label: 'T3 · Chris' },
  { d: 400, type: 'LOG', text: 'Chris taps three lands. {1}{U}{R}.', kind: 'beat' },
  { d: 200, type: 'TAP', player: 'you', instId: 'you-pacific-1' },
  { d: 70, type: 'TAP', player: 'you', instId: 'you-droplet-1' },
  { d: 70, type: 'TAP', player: 'you', instId: 'you-snowflake-1' },
  { d: 200, type: 'LOG', text: 'Chris casts MTGBAN.', kind: 'beat' },
  { d: 150, type: 'CAST', player: 'you', instId: 'you-mtgban-1' },

  { d: 700, type: 'LOG', text: 'The Deadlines responds. Red Tape. {W}{W}.', kind: 'threat' },
  { d: 200, type: 'TAP', player: 'opp', instId: 'opp-plains-1' },
  { d: 70, type: 'TAP', player: 'opp', instId: 'opp-plains-2' },
  { d: 200, type: 'CAST_DIRECT', player: 'opp', cardId: 'red-tape', instId: 'opp-redtape-1' },
  { d: 200, type: 'STACK_TARGET', sourceInstId: 'opp-redtape-1', targetInstId: 'you-mtgban-1' },

  { d: 600, type: 'LOG', text: 'Stack: Red Tape → MTGBAN. Priority to Chris.', kind: 'header' },
  { d: 100, type: 'PROMPT', prompt: 'counter' },
];

/* Counter beat — fires when the player clicks Counterflux.
   Counterflux costs {U}{U}; Pacific-2 and Bigquery are still untapped after MTGBAN. */
export const COUNTER_EVENTS = [
  { d: 100, type: 'CLEAR_PROMPT' },
  { d: 80, type: 'TAP', player: 'you', instId: 'you-pacific-2' },
  { d: 70, type: 'TAP', player: 'you', instId: 'you-bigquery-1' },
  { d: 200, type: 'LOG', text: 'Chris responds. Counterflux. {U}{U}.', kind: 'beat' },
  { d: 200, type: 'CAST', player: 'you', instId: 'you-counterflux-1' },
  { d: 250, type: 'STACK_TARGET', sourceInstId: 'you-counterflux-1', targetInstId: 'opp-redtape-1' },
  { d: 600, type: 'LOG', text: 'Stack: Counterflux → Red Tape → MTGBAN.', kind: 'header' },

  { d: 600, type: 'RESOLVE', instId: 'you-counterflux-1' },
  { d: 220, type: 'COUNTER_STAMP', instId: 'opp-redtape-1' },
  { d: 500, type: 'LOG', text: 'Red Tape: countered.', kind: 'beat' },
  { d: 450, type: 'RESOLVE', instId: 'opp-redtape-1' },
  { d: 500, type: 'LOG', text: 'MTGBAN resolves.', kind: 'beat' },
  { d: 450, type: 'RESOLVE', instId: 'you-mtgban-1' },
  { d: 500, type: 'LOG', text: 'Trigger: 6 damage to The Deadlines.', kind: 'threat' },
  { d: 250, type: 'ETB_DAMAGE', target: 'opp', amount: 6 },
  { d: 600, type: 'LOG', text: 'Deadlines: 20 → 14.', kind: 'beat' },
  { d: 700, type: 'VICTORY', winner: 'you' },
];

/* Timer expiry — same resolution, but the log acknowledges the auto-trigger
   so the framing stays honest. The user still gets the win. */
export const EXPIRE_PRELUDE = [
  { d: 100, type: 'CLEAR_PROMPT' },
  { d: 100, type: 'LOG', text: '// Reflex check: the counter fires on instinct.', kind: 'pause' },
];
export const EXPIRE_EVENTS = [...EXPIRE_PRELUDE, ...COUNTER_EVENTS.slice(1)];
