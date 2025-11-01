import { test, expect } from '@jest/globals';
import { generateClues } from '../../../src/core/browser/toys/2025-05-11/battleshipSolitaireClues.js';

test('generateClues handles null value input', () => {
  const call = () => generateClues(null);
  expect(call).not.toThrow();
  expect(call()).toBe('{"error":"Invalid fleet structure"}');
});
