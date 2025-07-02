import { test, expect } from '@jest/globals';
import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

test('generateClues handles "null" input without throwing', () => {
  const result = generateClues('null');
  expect(result).toBe('{"error":"Invalid fleet structure"}');
});
