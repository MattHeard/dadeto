import { describe, it, expect } from '@jest/globals';
import { generateClues } from '../../../src/toys/2025-05-11/battleshipSolitaireClues.js';

describe('generateClues null input handling', () => {
  it('returns invalid fleet structure and does not throw', () => {
    expect(() => generateClues('null')).not.toThrow();
    const output = JSON.parse(generateClues('null'));
    expect(output).toEqual({ error: 'Invalid fleet structure' });
  });
});
