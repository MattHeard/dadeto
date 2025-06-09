import { test, expect } from '@jest/globals';
import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

// Additional coverage to ensure null input does not trigger runtime errors
// and returns the expected error JSON string.
test('generateClues returns error JSON for null input', () => {
  const result = generateClues('null');
  expect(result).toBe('{"error":"Invalid fleet structure"}');
  expect(() => JSON.parse(result)).not.toThrow();
});
