import { describe, it, expect } from '@jest/globals';
import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

describe('generateClues repeated null input', () => {
  it('handles null input consistently without throwing', () => {
    const call = () => generateClues('null');
    for (let i = 0; i < 3; i++) {
      expect(call).not.toThrow();
      expect(call()).toBe('{"error":"Invalid fleet structure"}');
    }
  });
});
