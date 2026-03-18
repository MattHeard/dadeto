import { describe, expect, it } from '@jest/globals';
import { createMemoryStorageLens } from '../../../src/core/browser/memoryStorageLens.js';
import {
  applyHiLoEvent,
  createInitialGameState,
  createInitialKeyboardState,
  hiLoCardGameToy,
  normalizeGameState,
  normalizeParsedEvent,
  parseHiLoInput,
} from '../../../src/core/browser/toys/2026-03-01/hiLoCardGame.js';

/**
 * Create a toy env with deterministic random draws.
 * @param {number[]} values - Sequence of random values to consume.
 * @returns {Map<string, unknown>} Deterministic toy environment.
 */
function makeEnv(values) {
  const memoryLens = createMemoryStorageLens();
  let index = 0;
  const getRandomNumber = () => values[index++] ?? 0;
  return new Map([
    ['memoryLens', memoryLens],
    ['getRandomNumber', getRandomNumber],
  ]);
}

describe('parseHiLoInput', () => {
  it('returns null for invalid json payloads', () => {
    expect(parseHiLoInput('nope')).toBeNull();
  });

  it('keeps key strings when present', () => {
    expect(parseHiLoInput('{"type":"keydown","key":"ArrowUp"}')).toEqual({
      type: 'keydown',
      key: 'ArrowUp',
    });
  });

  it('returns null when json parses but is not an object', () => {
    expect(parseHiLoInput('"scalar"')).toBeNull();
  });

  it('returns null when json parses to an array', () => {
    expect(parseHiLoInput('[]')).toBeNull();
  });

  it('returns null for non-string inputs', () => {
    expect(parseHiLoInput(null)).toBeNull();
  });

  it('returns null when the payload omits a type', () => {
    expect(parseHiLoInput(JSON.stringify({ key: 'ArrowUp' }))).toBeNull();
  });
});

describe('normalizeParsedEvent', () => {
  it('returns null for a non-object parsed payload', () => {
    expect(normalizeParsedEvent(null)).toBeNull();
  });
});

describe('applyHiLoEvent', () => {
  it('scores a correct higher guess and locks the key until release', () => {
    const initial = {
      currentCard: 6,
      score: { correct: 0, incorrect: 0, total: 0 },
    };
    const keyboard = createInitialKeyboardState();
    const result = applyHiLoEvent(
      { type: 'keydown', key: 'ArrowUp' },
      { gameState: initial, keyboardState: keyboard },
      () => 0.75
    );

    expect(result.gameState.score).toEqual({
      correct: 1,
      incorrect: 0,
      total: 1,
    });
    expect(result.keyboardState).toEqual({ activeKey: 'ArrowUp' });
  });

  it('ignores second keydown events while a key is still held', () => {
    const initial = {
      currentCard: 6,
      score: { correct: 1, incorrect: 0, total: 1 },
    };
    const keyboard = { activeKey: 'ArrowUp' };
    const result = applyHiLoEvent(
      { type: 'keydown', key: 'ArrowDown' },
      { gameState: initial, keyboardState: keyboard },
      () => 0.1
    );

    expect(result).toEqual({ gameState: initial, keyboardState: keyboard });
  });

  it('counts an incorrect lower guess when the next card is higher', () => {
    const initial = {
      currentCard: 4,
      score: { correct: 0, incorrect: 0, total: 0 },
    };
    const keyboard = createInitialKeyboardState();
    const result = applyHiLoEvent(
      { type: 'keydown', key: 'ArrowDown' },
      { gameState: initial, keyboardState: keyboard },
      () => 0.75
    );

    expect(result.gameState.score).toEqual({
      correct: 0,
      incorrect: 1,
      total: 1,
    });
  });

  it('releases the active key on matching keyup', () => {
    const initial = createInitialGameState(() => 0.2);
    const result = applyHiLoEvent(
      { type: 'keyup', key: 'ArrowDown' },
      {
        gameState: initial,
        keyboardState: { activeKey: 'ArrowDown' },
      },
      () => 0.8
    );

    expect(result.keyboardState.activeKey).toBeNull();
    expect(result.gameState).toEqual(initial);
  });

  it('ignores non-guess keydown events', () => {
    const initial = {
      currentCard: 6,
      score: { correct: 0, incorrect: 0, total: 0 },
    };
    const keyboard = createInitialKeyboardState();
    const result = applyHiLoEvent(
      { type: 'keydown', key: 'Enter' },
      { gameState: initial, keyboardState: keyboard },
      () => 0.5
    );

    expect(result).toEqual({ gameState: initial, keyboardState: keyboard });
  });

  it('ignores non-keydown events even when guess keys arrive', () => {
    const initial = {
      currentCard: 6,
      score: { correct: 0, incorrect: 0, total: 0 },
    };
    const keyboard = createInitialKeyboardState();
    const result = applyHiLoEvent(
      { type: 'keypress', key: 'ArrowUp' },
      { gameState: initial, keyboardState: keyboard },
      () => 0.5
    );

    expect(result).toEqual({ gameState: initial, keyboardState: keyboard });
  });

  it('ignores keydown events without a string key', () => {
    const initial = {
      currentCard: 6,
      score: { correct: 0, incorrect: 0, total: 0 },
    };
    const keyboard = createInitialKeyboardState();
    const result = applyHiLoEvent(
      { type: 'keydown' },
      { gameState: initial, keyboardState: keyboard },
      () => 0.5
    );

    expect(result).toEqual({ gameState: initial, keyboardState: keyboard });
  });

  it('returns the original state when a key getter becomes non-string after guess validation', () => {
    const initial = {
      currentCard: 6,
      score: { correct: 0, incorrect: 0, total: 0 },
    };
    const keyboard = createInitialKeyboardState();
    let readCount = 0;
    const inputEvent = {
      type: 'keydown',
      get key() {
        readCount += 1;
        return readCount === 1 ? 'ArrowUp' : 123;
      },
    };

    const result = applyHiLoEvent(
      /** @type {{ type: 'keydown', key?: string }} */ (inputEvent),
      { gameState: initial, keyboardState: keyboard },
      () => 0.5
    );

    expect(result).toEqual({ gameState: initial, keyboardState: keyboard });
    expect(readCount).toBe(2);
  });
});

describe('normalizeGameState', () => {
  it('resets invalid stored scores without mutating current card', () => {
    const stored = { currentCard: 5, score: 'not an object' };
    const normalized = normalizeGameState(stored, () => 0.5);

    expect(normalized.currentCard).toBe(5);
    expect(normalized.score).toEqual({ correct: 0, incorrect: 0, total: 0 });
  });

  it('creates a fresh state when the stored card is out of range', () => {
    const stored = {
      currentCard: 99,
      score: { correct: 1, incorrect: 1, total: 2 },
    };
    const normalized = normalizeGameState(stored, () => 0);

    expect(normalized).toEqual({
      currentCard: 1,
      score: { correct: 0, incorrect: 0, total: 0 },
    });
  });
});

describe('hiLoCardGameToy', () => {
  it('initializes and renders the current card when no input is supplied', () => {
    const env = makeEnv([0]);

    expect(hiLoCardGameToy('', env)).toBe(
      'Current card: Ace. Score: 0 correct / 0 incorrect / 0 total.'
    );
  });

  it('persists state and requires key release between guesses', () => {
    const env = makeEnv([0, 0.9, 0.1]);

    hiLoCardGameToy('', env);
    const firstGuess = hiLoCardGameToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowUp' }),
      env
    );
    const heldKeyIgnored = hiLoCardGameToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowDown' }),
      env
    );
    hiLoCardGameToy(JSON.stringify({ type: 'keyup', key: 'ArrowUp' }), env);
    const secondGuess = hiLoCardGameToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowDown' }),
      env
    );

    expect(firstGuess).toBe(
      'Current card: Queen. Score: 1 correct / 0 incorrect / 1 total.'
    );
    expect(heldKeyIgnored).toBe(firstGuess);
    expect(secondGuess).toBe(
      'Current card: 2. Score: 2 correct / 0 incorrect / 2 total.'
    );
  });

  it('keeps the active key held when an unrelated keyup arrives', () => {
    const env = makeEnv([0, 0.6]);

    const initialGuess = hiLoCardGameToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowDown' }),
      env
    );
    const unrelatedRelease = hiLoCardGameToy(
      JSON.stringify({ type: 'keyup', key: 'ArrowUp' }),
      env
    );
    const blockedGuess = hiLoCardGameToy(
      JSON.stringify({ type: 'keydown', key: 'ArrowUp' }),
      env
    );

    expect(unrelatedRelease).toBe(initialGuess);
    expect(blockedGuess).toBe(initialGuess);
  });
});
