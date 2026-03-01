const GAME_STATE_KEY = 'hiLoCardGame:gameState';
const KEYBOARD_STATE_KEY = 'hiLoCardGame:keyboardState';
const HIGHER_KEY = 'ArrowUp';
const LOWER_KEY = 'ArrowDown';

/**
 * @typedef {{ correct: number, incorrect: number, total: number }} HiLoScore
 * @typedef {{ currentCard: number, score: HiLoScore }} HiLoGameState
 * @typedef {{ activeKey: string | null }} HiLoKeyboardState
 * @typedef {{ type: string, key?: string }} HiLoInputEvent
 */

/**
 * Determine whether a key represents a valid hi-lo guess.
 * @param {unknown} key - Candidate keyboard key.
 * @returns {key is string} True when the key maps to a valid guess.
 */
export function isGuessKey(key) {
  return key === HIGHER_KEY || key === LOWER_KEY;
}

/**
 * Build a score object with zeroed counters.
 * @returns {HiLoScore} Empty score.
 */
export function createInitialScore() {
  return { correct: 0, incorrect: 0, total: 0 };
}

/**
 * Draw a card rank from 1-13 inclusive.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {number} Drawn card rank.
 */
export function drawCard(getRandomNumber) {
  return Math.floor(getRandomNumber() * 13) + 1;
}

/**
 * Build the initial game state.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {HiLoGameState} Initialized game state.
 */
export function createInitialGameState(getRandomNumber) {
  return {
    currentCard: drawCard(getRandomNumber),
    score: createInitialScore(),
  };
}

/**
 * Build the initial keyboard state.
 * @returns {HiLoKeyboardState} Initialized keyboard state.
 */
export function createInitialKeyboardState() {
  return { activeKey: null };
}

/**
 * Parse the raw toy input into a keyboard event payload.
 * @param {string} input - Raw input string.
 * @returns {HiLoInputEvent | null} Parsed event or null.
 */
export function parseHiLoInput(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return null;
  }

  try {
    return normalizeParsedEvent(JSON.parse(input));
  } catch {
    return null;
  }
}

/**
 * Normalize parsed json into an input event.
 * @param {unknown} parsed - Parsed json candidate.
 * @returns {HiLoInputEvent | null} Valid input event or null.
 */
function normalizeParsedEvent(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const candidate = /** @type {Record<string, unknown>} */ (parsed);
  if (typeof candidate.type !== 'string') {
    return null;
  }

  return {
    type: candidate.type,
    key: getOptionalString(candidate.key),
  };
}

/**
 * Convert unknown values into optional strings.
 * @param {unknown} value - Candidate string value.
 * @returns {string | undefined} String when valid.
 */
function getOptionalString(value) {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

/**
 * Normalize stored score values.
 * @param {unknown} value - Stored score candidate.
 * @returns {HiLoScore} Safe score value.
 */
function normalizeScore(value) {
  if (!value || typeof value !== 'object') {
    return createInitialScore();
  }

  const candidate = /** @type {Record<string, unknown>} */ (value);
  return {
    correct: toScoreNumber(candidate.correct),
    incorrect: toScoreNumber(candidate.incorrect),
    total: toScoreNumber(candidate.total),
  };
}

/**
 * Normalize unknown score fields into numbers.
 * @param {unknown} value - Candidate score value.
 * @returns {number} Safe numeric score.
 */
function toScoreNumber(value) {
  return Number(value) || 0;
}

/**
 * Normalize stored game state.
 * @param {unknown} value - Stored game candidate.
 * @param {() => number} getRandomNumber - Random number supplier for fallback creation.
 * @returns {HiLoGameState} Safe game state.
 */
export function normalizeGameState(value, getRandomNumber) {
  if (!value || typeof value !== 'object') {
    return createInitialGameState(getRandomNumber);
  }

  const candidate = /** @type {Record<string, unknown>} */ (value);
  const currentCard = getValidCard(candidate.currentCard);
  if (currentCard === null) {
    return createInitialGameState(getRandomNumber);
  }

  return {
    currentCard,
    score: normalizeScore(candidate.score),
  };
}

/**
 * Normalize stored keyboard state.
 * @param {unknown} value - Stored keyboard candidate.
 * @returns {HiLoKeyboardState} Safe keyboard state.
 */
export function normalizeKeyboardState(value) {
  if (!value || typeof value !== 'object') {
    return createInitialKeyboardState();
  }

  const candidate = /** @type {Record<string, unknown>} */ (value);
  return {
    activeKey: getOptionalString(candidate.activeKey) ?? null,
  };
}

/**
 * Validate a stored card rank.
 * @param {unknown} value - Candidate rank.
 * @returns {number | null} Valid card rank or null.
 */
function getValidCard(value) {
  const card = Number(value);
  if (!Number.isInteger(card)) {
    return null;
  }
  if (card < 1 || card > 13) {
    return null;
  }
  return card;
}

/**
 * Format a card rank for display.
 * @param {number} card - Card rank from 1-13.
 * @returns {string} Human-readable label.
 */
export function formatCard(card) {
  const labels = {
    1: 'Ace',
    11: 'Jack',
    12: 'Queen',
    13: 'King',
  };
  if (labels[card]) {
    return labels[card];
  }
  return String(card);
}

/**
 * Compare a guess key against the current and next card.
 * @param {string} guessKey - Guess key.
 * @param {number} currentCard - Current card rank.
 * @param {number} nextCard - Next card rank.
 * @returns {boolean} True when the guess is correct.
 */
export function isCorrectGuess(guessKey, currentCard, nextCard) {
  if (guessKey === HIGHER_KEY) {
    return nextCard > currentCard;
  }
  return nextCard < currentCard;
}

/**
 * Apply a keydown guess to the game state.
 * @param {HiLoGameState} gameState - Current game state.
 * @param {string} guessKey - Guess key.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {HiLoGameState} Updated game state.
 */
function applyGuess(gameState, guessKey, getRandomNumber) {
  const nextCard = drawCard(getRandomNumber);
  const correct = isCorrectGuess(guessKey, gameState.currentCard, nextCard);
  return {
    currentCard: nextCard,
    score: {
      correct: gameState.score.correct + Number(correct),
      incorrect: gameState.score.incorrect + Number(!correct),
      total: gameState.score.total + 1,
    },
  };
}

/**
 * Advance game and keyboard state for an incoming key event.
 * @param {HiLoInputEvent | null} inputEvent - Parsed keyboard payload.
 * @param {HiLoGameState} gameState - Current game state.
 * @param {HiLoKeyboardState} keyboardState - Current keyboard state.
 * @param state
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state pair.
 */
export function applyHiLoEvent(inputEvent, state, getRandomNumber) {
  const { gameState, keyboardState } = state;
  if (!inputEvent) {
    return { gameState, keyboardState };
  }

  if (inputEvent.type === 'keyup') {
    return releaseHeldKey(inputEvent, gameState, keyboardState);
  }

  return handleKeydownGuess(
    inputEvent,
    gameState,
    keyboardState,
    getRandomNumber
  );
}

/**
 * Release the held key when the matching keyup arrives.
 * @param {HiLoInputEvent} inputEvent - Incoming keyboard event.
 * @param {HiLoGameState} gameState - Current game state.
 * @param {HiLoKeyboardState} keyboardState - Current keyboard state.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state.
 */
function releaseHeldKey(inputEvent, gameState, keyboardState) {
  if (keyboardState.activeKey !== inputEvent.key) {
    return { gameState, keyboardState };
  }

  return {
    gameState,
    keyboardState: { activeKey: null },
  };
}

/**
 * Handle guess keydowns while idle.
 * @param {HiLoInputEvent} inputEvent - Incoming keyboard event.
 * @param {HiLoGameState} gameState - Current game state.
 * @param {HiLoKeyboardState} keyboardState - Current keyboard state.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state.
 */
function handleKeydownGuess(
  inputEvent,
  gameState,
  keyboardState,
  getRandomNumber
) {
  if (inputEvent.type !== 'keydown' || !isGuessKey(inputEvent.key)) {
    return { gameState, keyboardState };
  }
  if (keyboardState.activeKey !== null) {
    return { gameState, keyboardState };
  }

  return {
    gameState: applyGuess(gameState, inputEvent.key, getRandomNumber),
    keyboardState: { activeKey: inputEvent.key },
  };
}

/**
 * Render the current hi-lo state for the default text presenter.
 * @param {HiLoGameState} gameState - Game state to display.
 * @returns {string} Display string.
 */
export function renderHiLoState(gameState) {
  const { correct, incorrect, total } = gameState.score;
  return `Current card: ${formatCard(gameState.currentCard)}. Score: ${correct} correct / ${incorrect} incorrect / ${total} total.`;
}

/**
 * Run the hi-lo card game toy.
 * @param {string} input - Serialized keyboard event payload.
 * @param {Map<string, Function | import('../../storageLens.js').StorageLens<unknown>>} env - Toy environment.
 * @returns {string} Rendered game state.
 */
export function hiLoCardGameToy(input, env) {
  const memoryLens =
    /** @type {import('../../storageLens.js').StorageLens<unknown>} */ (
      env.get('memoryLens')
    );
  const getRandomNumber = /** @type {() => number} */ (
    env.get('getRandomNumber')
  );

  const gameState = normalizeGameState(
    memoryLens.get(GAME_STATE_KEY),
    getRandomNumber
  );
  const keyboardState = normalizeKeyboardState(
    memoryLens.get(KEYBOARD_STATE_KEY)
  );
  const inputEvent = parseHiLoInput(input);
  const nextState = applyHiLoEvent(
    inputEvent,
    { gameState, keyboardState },
    getRandomNumber
  );

  memoryLens.set(GAME_STATE_KEY, nextState.gameState);
  memoryLens.set(KEYBOARD_STATE_KEY, nextState.keyboardState);

  return renderHiLoState(nextState.gameState);
}
