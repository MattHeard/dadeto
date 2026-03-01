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
  if (!hasInputPayload(input)) {
    return null;
  }
  return parseInputPayload(input);
}

/**
 * Parse the input payload, returning null when parsing fails.
 * @param {string} input - Raw input payload.
 * @returns {HiLoInputEvent | null} Parsed event or null.
 */
function parseInputPayload(input) {
  try {
    return normalizeParsedEvent(JSON.parse(input));
  } catch {
    return null;
  }
}

/**
 * Determine whether the toy input contains a parsable payload candidate.
 * @param {unknown} input - Raw toy input.
 * @returns {input is string} True when parsing should be attempted.
 */
function hasInputPayload(input) {
  if (typeof input !== 'string') {
    return false;
  }
  return input.length > 0;
}

/**
 * Normalize parsed json into an input event.
 * @param {unknown} parsed - Parsed json candidate.
 * @returns {HiLoInputEvent | null} Valid input event or null.
 */
function normalizeParsedEvent(parsed) {
  if (!isObjectCandidate(parsed)) {
    return null;
  }
  return buildNormalizedParsedEvent(
    /** @type {Record<string, unknown>} */ (parsed)
  );
}

/**
 * Build a normalized parsed event from a validated record.
 * @param {Record<string, unknown>} candidate - Parsed input record.
 * @returns {HiLoInputEvent | null} Normalized input event or null.
 */
function buildNormalizedParsedEvent(candidate) {
  const eventType = readEventType(candidate);
  if (!eventType) {
    return null;
  }

  return {
    type: eventType,
    key: getOptionalString(candidate.key),
  };
}

/**
 * Check whether a parsed value can be treated as an object record.
 * @param {unknown} value - Parsed input candidate.
 * @returns {boolean} True when the value is an object.
 */
function isObjectCandidate(value) {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Check whether a parsed record contains an event type.
 * @param {Record<string, unknown>} candidate - Parsed input record.
 * @returns {boolean} True when the record contains a string event type.
 */
function hasEventType(candidate) {
  return typeof candidate.type === 'string';
}

/**
 * Read the event type from a parsed record.
 * @param {Record<string, unknown>} candidate - Parsed input record.
 * @returns {string | null} Event type or null.
 */
function readEventType(candidate) {
  if (hasEventType(candidate)) {
    return candidate.type;
  }
  return null;
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
  if (!isObjectCandidate(value)) {
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
  if (!isObjectCandidate(value)) {
    return createInitialGameState(getRandomNumber);
  }
  return buildNormalizedGameState(
    /** @type {Record<string, unknown>} */ (value),
    getRandomNumber
  );
}

/**
 * Build a normalized game state from a validated record.
 * @param {Record<string, unknown>} candidate - Stored game record.
 * @param {() => number} getRandomNumber - Random number supplier for fallback creation.
 * @returns {HiLoGameState} Safe game state.
 */
function buildNormalizedGameState(candidate, getRandomNumber) {
  const currentCard = getValidCard(candidate.currentCard);
  if (!hasCurrentCard(currentCard)) {
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
  if (!isObjectCandidate(value)) {
    return createInitialKeyboardState();
  }

  const candidate = /** @type {Record<string, unknown>} */ (value);
  return {
    activeKey: readActiveKey(candidate.activeKey),
  };
}

/**
 * Check whether a normalized current card exists.
 * @param {number | null} currentCard - Normalized card rank.
 * @returns {currentCard is number} True when the card exists.
 */
function hasCurrentCard(currentCard) {
  return currentCard !== null;
}

/**
 * Normalize a stored active key.
 * @param {unknown} value - Stored active key candidate.
 * @returns {string | null} Active key or null.
 */
function readActiveKey(value) {
  return getOptionalString(value) ?? null;
}

/**
 * Validate a stored card rank.
 * @param {unknown} value - Candidate rank.
 * @returns {number | null} Valid card rank or null.
 */
function getValidCard(value) {
  const card = Number(value);
  if (!isPlayableCard(card)) {
    return null;
  }
  return card;
}

/**
 * Check whether a numeric card is both integer and in range.
 * @param {number} card - Candidate card rank.
 * @returns {boolean} True when the card is playable.
 */
function isPlayableCard(card) {
  return isIntegerCard(card) && isCardInRange(card);
}

/**
 * Check whether a card rank candidate is an integer.
 * @param {number} card - Candidate card rank.
 * @returns {boolean} True when the card is an integer.
 */
function isIntegerCard(card) {
  return Number.isInteger(card);
}

/**
 * Check whether a card rank falls within the supported deck range.
 * @param {number} card - Candidate card rank.
 * @returns {boolean} True when the card is between 1 and 13.
 */
function isCardInRange(card) {
  return card >= 1 && card <= 13;
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
 * @param {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} state - Current game and keyboard state.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state pair.
 */
export function applyHiLoEvent(inputEvent, state, getRandomNumber) {
  if (shouldIgnoreHiLoEvent(inputEvent)) {
    return state;
  }
  return resolveHiLoEvent(inputEvent, state, getRandomNumber);
}

/**
 * Route a valid keyboard event through release or guess handling.
 * @param {HiLoInputEvent} inputEvent - Parsed keyboard payload.
 * @param {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} state - Current game and keyboard state.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state pair.
 */
function resolveHiLoEvent(inputEvent, state, getRandomNumber) {
  if (shouldReleaseHeldKey(inputEvent)) {
    return releaseHeldKey(inputEvent, state);
  }

  return handleKeydownGuess(inputEvent, state, getRandomNumber);
}

/**
 * Check whether the incoming event should be ignored immediately.
 * @param {HiLoInputEvent | null} inputEvent - Parsed keyboard payload.
 * @returns {boolean} True when the event should be ignored.
 */
function shouldIgnoreHiLoEvent(inputEvent) {
  return inputEvent === null;
}

/**
 * Check whether the input event is a keyup event.
 * @param {HiLoInputEvent} inputEvent - Parsed keyboard event.
 * @returns {boolean} True when the event type is keyup.
 */
function isKeyupEvent(inputEvent) {
  return inputEvent.type === 'keyup';
}

/**
 * Check whether the input event should release a held key.
 * @param {HiLoInputEvent} inputEvent - Parsed keyboard event.
 * @returns {boolean} True when the event is a keyup.
 */
function shouldReleaseHeldKey(inputEvent) {
  return isKeyupEvent(inputEvent);
}

/**
 * Release the held key when the matching keyup arrives.
 * @param {HiLoInputEvent} inputEvent - Incoming keyboard event.
 * @param {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} state - Current game and keyboard state.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state.
 */
function releaseHeldKey(inputEvent, state) {
  const { gameState, keyboardState } = state;
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
 * @param {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} state - Current game and keyboard state.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state.
 */
function handleKeydownGuess(inputEvent, state, getRandomNumber) {
  if (!isGuessEvent(inputEvent)) {
    return state;
  }
  return applyGuessWhenReady(inputEvent, state, getRandomNumber);
}

/**
 * Apply a guess only when no key is currently held.
 * @param {HiLoInputEvent} inputEvent - Incoming keyboard event.
 * @param {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} state - Current game and keyboard state.
 * @param {() => number} getRandomNumber - Random number supplier.
 * @returns {{ gameState: HiLoGameState, keyboardState: HiLoKeyboardState }} Updated state.
 */
function applyGuessWhenReady(inputEvent, state, getRandomNumber) {
  const { gameState, keyboardState } = state;
  if (hasHeldKey(keyboardState)) {
    return state;
  }

  return {
    gameState: applyGuess(gameState, inputEvent.key, getRandomNumber),
    keyboardState: { activeKey: inputEvent.key },
  };
}

/**
 * Check whether the keyboard already has a held key.
 * @param {HiLoKeyboardState} keyboardState - Current keyboard state.
 * @returns {boolean} True when a key is currently held.
 */
function hasHeldKey(keyboardState) {
  return keyboardState.activeKey !== null;
}

/**
 * Check whether the input event represents a guess submission.
 * @param {HiLoInputEvent} inputEvent - Parsed keyboard event.
 * @returns {boolean} True when the event is a valid guess keydown.
 */
function isGuessEvent(inputEvent) {
  if (inputEvent.type !== 'keydown') {
    return false;
  }
  return isGuessKey(inputEvent.key);
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
