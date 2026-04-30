/* Event timeline for the ghost match.
   Each event runs sequentially; the reducer in GhostMatch.jsx processes them.
   `delay` is ms to wait *before* the event fires (adds dramatic pacing). */

export const INITIAL_STATE = {
  phase: 'pregame',
  turn: 0,
  activePlayer: null,
  you: {
    name: 'Chris',
    deckName: 'Izzet · Data-Driven',
    life: 20,
    hand: [],       // [{ instId, cardId }]
    library: [],    // deck, top-of-deck drawn first
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
  stack: [],        // [{ instId, cardId, owner, targetInstId, countered }]
  log: [],          // [{ text, kind }]
  focus: null,      // an instId being highlighted (for the "cast" flash)
  ended: false,
  winner: null,
};

/* Starting hands set up as instance IDs. Lands numbered so we can reference them.
   Opponent's cards carry their real id (state internal), but render face-down. */
export const OPENING = {
  you: [
    { instId: 'you-pacific-1',       cardId: 'pacific-ocean' },
    { instId: 'you-do-1',            cardId: 'do-droplet' },
    { instId: 'you-snowflake-1',     cardId: 'snowflake' },
    { instId: 'you-toolkit-1',       cardId: 'toolkit' },
    { instId: 'you-mtgban-1',        cardId: 'mtgban' },
    { instId: 'you-counterflux-1',   cardId: 'counterflux' },
    { instId: 'you-ghscope-1',       cardId: 'ghscope' },
  ],
  opp: [
    { instId: 'opp-plains-1',        cardId: 'another-meeting' },
    { instId: 'opp-plains-2',        cardId: 'another-meeting' },
    { instId: 'opp-plains-3',        cardId: 'another-meeting' },
    { instId: 'opp-swamp-1',         cardId: 'legacy-spreadsheet' },
    { instId: 'opp-scope-1',         cardId: 'scope-creep' },
    { instId: 'opp-overrun-1',       cardId: 'meeting-overrun' },
    { instId: 'opp-redtape-1',       cardId: 'red-tape' },
  ],
};

/* Cards that get drawn during the match (not in opening hand). */
export const DRAW_PILE = {
  you: [
    { instId: 'you-claude-1',   cardId: 'claude-code' },          // T1 draw
    { instId: 'you-wotc-1',     cardId: 'wizards-of-the-coast' }, // T3 draw
    { instId: 'you-bigquery-1', cardId: 'bigquery' },             // T4 draw
  ],
  opp: [
    // Opp draws filler that never gets cast.
    { instId: 'opp-undoc-1',  cardId: 'undocumented-script' },   // T2 draw
    { instId: 'opp-plains-4', cardId: 'another-meeting' },       // T3 draw
    { instId: 'opp-plains-5', cardId: 'another-meeting' },       // T4 draw
  ],
};

/* ── Event types ──────────────────────────────────────────────────
   LOG           { text, kind? }
   PHASE         { turn, player, label }
   DRAW          { player, instId, cardId }  — single card
   PLAY_LAND     { player, instId }           — hand → battlefield.lands
   TAP           { player, instId }           — for mana or attack
   UNTAP_ALL     { player }
   CAST          { player, instId, cardId, fromZone? } — hand → stack + focus
   STACK_TARGET  { sourceInstId, targetInstId }  — line between stack items
   COUNTER_STAMP { instId }                   — marks a stack item as countered
   RESOLVE       { instId, effects? }         — stack top → effect → battlefield/graveyard
   ETB_DAMAGE    { sourceInstId, target: 'opp'|'you', amount }
   ATTACK        { player, instId }           — tap as attacker
   BLOCK         { attackerInstId, blockerInstId }
   COMBAT_DAMAGE { fromInstId, toInstId?, toPlayer?, amount, dies? }
   BUFF_CREATURES{ player, p, t, grantsHaste? } — global pump from enchantment
   END_TURN      { player }
   VICTORY       { winner }
*/

export const EVENTS = [
  /* ─── Pre-game ─── */
  { d: 400,  type: 'LOG', text: '// Match begins. Best of one.', kind: 'header' },
  { d: 800,  type: 'LOG', text: 'Shuffling libraries…' },
  { d: 700,  type: 'LOG', text: 'Opening hands drawn. You are on the draw.' },
  { d: 600,  type: 'DEAL_OPENING' },

  /* ─── Turn 1 · Opponent ─── */
  { d: 900, type: 'PHASE', turn: 1, player: 'opp', label: 'T1 · The Deadlines' },
  { d: 700, type: 'LOG', text: 'Deadlines plays Another Meeting.' },
  { d: 300, type: 'PLAY_LAND', player: 'opp', instId: 'opp-plains-1' },
  { d: 900, type: 'LOG', text: 'Deadlines passes. No play.' },
  { d: 400, type: 'END_TURN', player: 'opp' },

  /* ─── Turn 1 · You ─── */
  { d: 700, type: 'PHASE', turn: 1, player: 'you', label: 'T1 · Chris' },
  { d: 500, type: 'LOG', text: 'Chris draws for turn.' },
  { d: 200, type: 'DRAW', player: 'you', instId: 'you-claude-1', cardId: 'claude-code' },
  { d: 900, type: 'LOG', text: 'Chris plays Pacific Data Ocean.' },
  { d: 200, type: 'PLAY_LAND', player: 'you', instId: 'you-pacific-1' },
  { d: 900, type: 'END_TURN', player: 'you' },

  /* ─── Turn 2 · Opponent ─── */
  { d: 600, type: 'PHASE', turn: 2, player: 'opp', label: 'T2 · The Deadlines' },
  { d: 400, type: 'UNTAP_ALL', player: 'opp' },
  { d: 300, type: 'DRAW', player: 'opp', instId: 'opp-undoc-1', cardId: 'undocumented-script' },
  { d: 600, type: 'PLAY_LAND', player: 'opp', instId: 'opp-plains-2' },
  { d: 500, type: 'LOG', text: 'Deadlines taps two Plains.' },
  { d: 200, type: 'TAP', player: 'opp', instId: 'opp-plains-1' },
  { d: 150, type: 'TAP', player: 'opp', instId: 'opp-plains-2' },
  { d: 600, type: 'LOG', text: 'Deadlines casts Scope Creep. {1}{W}.' },
  { d: 300, type: 'CAST', player: 'opp', instId: 'opp-scope-1', cardId: 'scope-creep' },
  { d: 800, type: 'RESOLVE', instId: 'opp-scope-1' },
  { d: 700, type: 'LOG', text: 'Scope Creep enters. 1/1. "Just one more small thing."' },
  { d: 600, type: 'END_TURN', player: 'opp' },

  /* ─── Turn 2 · You ─── */
  { d: 500, type: 'PHASE', turn: 2, player: 'you', label: 'T2 · Chris' },
  { d: 400, type: 'UNTAP_ALL', player: 'you' },
  { d: 300, type: 'DRAW', player: 'you', instId: 'you-wotc-1', cardId: 'wizards-of-the-coast' },
  { d: 700, type: 'LOG', text: 'Chris plays Digital Ocean Droplet.' },
  { d: 200, type: 'PLAY_LAND', player: 'you', instId: 'you-do-1' },
  { d: 700, type: 'LOG', text: 'Chris taps Island and Mountain. {1}{U}.' },
  { d: 200, type: 'TAP', player: 'you', instId: 'you-pacific-1' },
  { d: 150, type: 'TAP', player: 'you', instId: 'you-do-1' },
  { d: 500, type: 'LOG', text: 'Chris casts R & Python Toolkit.' },
  { d: 300, type: 'CAST', player: 'you', instId: 'you-toolkit-1', cardId: 'toolkit' },
  { d: 800, type: 'RESOLVE', instId: 'you-toolkit-1' },
  { d: 600, type: 'LOG', text: 'Toolkit enters. 2/1, haste. Scry 2.' },
  { d: 700, type: 'LOG', text: 'Chris declares attackers: R & Python Toolkit.', kind: 'beat' },
  { d: 300, type: 'ATTACK', player: 'you', instId: 'you-toolkit-1' },
  { d: 800, type: 'LOG', text: 'Deadlines declines to block.' },
  { d: 500, type: 'COMBAT_DAMAGE', fromInstId: 'you-toolkit-1', toPlayer: 'opp', amount: 2 },
  { d: 700, type: 'LOG', text: 'Deadlines takes 2. Life: 18.' },
  { d: 500, type: 'END_TURN', player: 'you' },

  /* ─── Turn 3 · Opponent ─── */
  { d: 600, type: 'PHASE', turn: 3, player: 'opp', label: 'T3 · The Deadlines' },
  { d: 400, type: 'UNTAP_ALL', player: 'opp' },
  { d: 300, type: 'DRAW', player: 'opp', instId: 'opp-plains-4', cardId: 'another-meeting' },
  { d: 600, type: 'PLAY_LAND', player: 'opp', instId: 'opp-swamp-1' },
  { d: 500, type: 'LOG', text: 'Deadlines taps three lands.' },
  { d: 200, type: 'TAP', player: 'opp', instId: 'opp-plains-1' },
  { d: 150, type: 'TAP', player: 'opp', instId: 'opp-plains-2' },
  { d: 150, type: 'TAP', player: 'opp', instId: 'opp-swamp-1' },
  { d: 500, type: 'LOG', text: 'Deadlines casts Meeting Overrun. {2}{W}.' },
  { d: 300, type: 'CAST', player: 'opp', instId: 'opp-overrun-1', cardId: 'meeting-overrun' },
  { d: 800, type: 'RESOLVE', instId: 'opp-overrun-1' },
  { d: 700, type: 'LOG', text: 'Meeting Overrun enters. 3/3. "We\'ll circle back."' },
  { d: 800, type: 'LOG', text: 'Deadlines attacks with Scope Creep.', kind: 'beat' },
  { d: 300, type: 'ATTACK', player: 'opp', instId: 'opp-scope-1' },
  { d: 600, type: 'LOG', text: 'Chris blocks with Toolkit.' },
  { d: 300, type: 'BLOCK', attackerInstId: 'opp-scope-1', blockerInstId: 'you-toolkit-1' },
  { d: 700, type: 'COMBAT_DAMAGE', fromInstId: 'opp-scope-1', toInstId: 'you-toolkit-1', amount: 1, dies: true },
  { d: 200, type: 'COMBAT_DAMAGE', fromInstId: 'you-toolkit-1', toInstId: 'opp-scope-1', amount: 2, dies: true },
  { d: 700, type: 'LOG', text: 'Both fall to scope. Trade for tempo.' },
  { d: 500, type: 'END_TURN', player: 'opp' },

  /* ─── Turn 3 · You — THE CLIMAX ─── */
  { d: 700, type: 'PHASE', turn: 3, player: 'you', label: 'T3 · Chris' },
  { d: 400, type: 'UNTAP_ALL', player: 'you' },
  { d: 300, type: 'DRAW', player: 'you', instId: 'you-bigquery-1', cardId: 'bigquery' },
  { d: 900, type: 'LOG', text: 'Chris plays Snowflake Warehouse. Dual land: U or R.' },
  { d: 200, type: 'PLAY_LAND', player: 'you', instId: 'you-snowflake-1' },
  { d: 700, type: 'LOG', text: 'Chris taps three lands. {1}{U}{R}.' },
  { d: 200, type: 'TAP', player: 'you', instId: 'you-pacific-1' },
  { d: 150, type: 'TAP', player: 'you', instId: 'you-do-1' },
  { d: 150, type: 'TAP', player: 'you', instId: 'you-snowflake-1' },
  { d: 700, type: 'LOG', text: 'Chris casts MTGBAN.', kind: 'beat' },
  { d: 400, type: 'CAST', player: 'you', instId: 'you-mtgban-1', cardId: 'mtgban' },
  { d: 1200, type: 'LOG', text: 'Priority to The Deadlines. The stack holds.', kind: 'pause' },

  /* Counter war */
  { d: 1000, type: 'LOG', text: 'Deadlines responds with Red Tape. {W}{W}.', kind: 'threat' },
  { d: 200, type: 'TAP', player: 'opp', instId: 'opp-plains-3' },
  { d: 100, type: 'TAP', player: 'opp', instId: 'opp-plains-4' },
  { d: 400, type: 'CAST', player: 'opp', instId: 'opp-redtape-1', cardId: 'red-tape' },
  { d: 300, type: 'STACK_TARGET', sourceInstId: 'opp-redtape-1', targetInstId: 'you-mtgban-1' },
  { d: 1000, type: 'LOG', text: 'Priority to Chris. Chris has an answer.', kind: 'pause' },

  { d: 900, type: 'LOG', text: 'Chris responds with Counterflux. Stack of docs.', kind: 'beat' },
  { d: 200, type: 'TAP', player: 'you', instId: 'you-snowflake-1', note: 'tap-for-second-U' }, // dual re-tapped? No, already tapped. Simplify: Counterflux cost is paid from a separate source.
  { d: 400, type: 'CAST', player: 'you', instId: 'you-counterflux-1', cardId: 'counterflux' },
  { d: 300, type: 'STACK_TARGET', sourceInstId: 'you-counterflux-1', targetInstId: 'opp-redtape-1' },
  { d: 1200, type: 'LOG', text: 'Stack: Counterflux → Red Tape → MTGBAN.', kind: 'header' },

  /* Resolve in LIFO */
  { d: 800, type: 'RESOLVE', instId: 'you-counterflux-1' },
  { d: 300, type: 'COUNTER_STAMP', instId: 'opp-redtape-1' },
  { d: 900, type: 'LOG', text: 'Red Tape: countered.' },
  { d: 700, type: 'RESOLVE', instId: 'opp-redtape-1', toGraveyard: 'opp' },
  { d: 800, type: 'LOG', text: 'MTGBAN resolves.', kind: 'beat' },
  { d: 600, type: 'RESOLVE', instId: 'you-mtgban-1' },
  { d: 900, type: 'LOG', text: 'MTGBAN triggers: 6 damage to target opponent.', kind: 'threat' },
  { d: 500, type: 'ETB_DAMAGE', sourceInstId: 'you-mtgban-1', target: 'opp', amount: 6 },
  { d: 900, type: 'LOG', text: 'Deadlines: 18 → 12. MTGBAN hits the table. $1.2M annually.' },
  { d: 800, type: 'END_TURN', player: 'you' },

  /* ─── Turn 4 · Opponent — desperation ─── */
  { d: 600, type: 'PHASE', turn: 4, player: 'opp', label: 'T4 · The Deadlines' },
  { d: 400, type: 'UNTAP_ALL', player: 'opp' },
  { d: 300, type: 'DRAW', player: 'opp', instId: 'opp-plains-5', cardId: 'another-meeting' },
  { d: 700, type: 'PLAY_LAND', player: 'opp', instId: 'opp-plains-5' },
  { d: 700, type: 'LOG', text: 'Deadlines attacks with Meeting Overrun.', kind: 'beat' },
  { d: 300, type: 'ATTACK', player: 'opp', instId: 'opp-overrun-1' },
  { d: 600, type: 'LOG', text: 'Chris blocks with MTGBAN.' },
  { d: 300, type: 'BLOCK', attackerInstId: 'opp-overrun-1', blockerInstId: 'you-mtgban-1' },
  { d: 700, type: 'COMBAT_DAMAGE', fromInstId: 'opp-overrun-1', toInstId: 'you-mtgban-1', amount: 3, dies: false },
  { d: 200, type: 'COMBAT_DAMAGE', fromInstId: 'you-mtgban-1', toInstId: 'opp-overrun-1', amount: 4, dies: true },
  { d: 800, type: 'LOG', text: 'Meeting Overrun: disposed of. MTGBAN holds at 4/1.' },
  { d: 500, type: 'END_TURN', player: 'opp' },

  /* ─── Turn 4 · You — THE FINISH ─── */
  { d: 700, type: 'PHASE', turn: 4, player: 'you', label: 'T4 · Chris' },
  { d: 400, type: 'UNTAP_ALL', player: 'you' },
  { d: 800, type: 'LOG', text: 'Damage wears off. MTGBAN is 4/4 again.' },
  { d: 500, type: 'LOG', text: 'Chris draws for turn.' },
  { d: 300, type: 'DRAW_REVEAL', player: 'you', instId: 'you-wotc-1-reveal', cardId: 'wizards-of-the-coast' },
  { d: 1100, type: 'LOG', text: 'Chris plays BigQuery Workspace. Four lands.', kind: 'beat' },
  { d: 200, type: 'PLAY_LAND', player: 'you', instId: 'you-bigquery-1' },
  { d: 600, type: 'LOG', text: 'Chris taps all four lands. {2}{U}{R}.' },
  { d: 200, type: 'TAP', player: 'you', instId: 'you-pacific-1' },
  { d: 100, type: 'TAP', player: 'you', instId: 'you-do-1' },
  { d: 100, type: 'TAP', player: 'you', instId: 'you-snowflake-1' },
  { d: 100, type: 'TAP', player: 'you', instId: 'you-bigquery-1' },
  { d: 700, type: 'LOG', text: 'Chris casts Wizards of the Coast.', kind: 'beat' },
  { d: 400, type: 'CAST', player: 'you', instId: 'you-wotc-1', cardId: 'wizards-of-the-coast' },
  { d: 1000, type: 'LOG', text: 'Deadlines has no response.' },
  { d: 600, type: 'RESOLVE', instId: 'you-wotc-1' },
  { d: 700, type: 'LOG', text: 'Your creatures get +3/+3, haste, and trample.', kind: 'threat' },
  { d: 500, type: 'BUFF_CREATURES', player: 'you', p: 3, t: 3, grantsHaste: true, grantsTrample: true },
  { d: 800, type: 'LOG', text: 'MTGBAN is now 7/7 with haste and trample.' },
  { d: 700, type: 'LOG', text: 'Chris attacks with MTGBAN.', kind: 'beat' },
  { d: 300, type: 'ATTACK', player: 'you', instId: 'you-mtgban-1' },
  { d: 900, type: 'LOG', text: 'Deadlines has no blockers.' },
  { d: 500, type: 'COMBAT_DAMAGE', fromInstId: 'you-mtgban-1', toPlayer: 'opp', amount: 7 },
  { d: 800, type: 'LOG', text: 'Deadlines: 12 → 5.', kind: 'threat' },
  { d: 900, type: 'LOG', text: 'Deadlines concedes.', kind: 'header' },
  { d: 1200, type: 'VICTORY', winner: 'you' },
];
