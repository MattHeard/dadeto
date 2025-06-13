import { test, expect } from '@jest/globals';
import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

test('generateClues does not iterate over strings when calculating ship cells', () => {
  const fleet = {
    width: 2,
    height: 2,
    ships: [{ start: { x: 0, y: 0 }, length: 1, direction: 'H' }],
  };
  const input = JSON.stringify(fleet);
  const originalIterator = String.prototype[Symbol.iterator];
  String.prototype[Symbol.iterator] = function* () {
    throw new Error('iterated');
  };
  let result;
  expect(() => {
    result = generateClues(input);
  }).not.toThrow();
  String.prototype[Symbol.iterator] = originalIterator;
  expect(JSON.parse(result)).toEqual({ rowClues: [1, 0], colClues: [1, 0] });
});
