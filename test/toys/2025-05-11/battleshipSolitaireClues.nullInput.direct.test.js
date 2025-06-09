import { describe, it, expect } from '@jest/globals';
import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

describe('generateClues null input direct call', () => {
  it('returns invalid fleet structure and does not throw', () => {
    const call = () => generateClues('null');
    expect(call).not.toThrow();
    expect(call()).toBe('{"error":"Invalid fleet structure"}');
  });
});
