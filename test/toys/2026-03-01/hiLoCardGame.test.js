import { describe, expect, it } from '@jest/globals';
import { createMemoryStorageLens } from '../../../src/core/browser/memoryStorageLens.js';
import {
  applyHiLoEvent,
  createInitialGameState,
  createInitialKeyboardState,
  hiLoCardGameToy,
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
});
