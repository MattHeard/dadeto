import { test, expect } from '@jest/globals';
import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

test('generateClues gracefully handles "false" input', () => {
  const call = () => generateClues('false');
  expect(call).not.toThrow();
  expect(call()).toBe('{"error":"Invalid fleet structure"}');
});
