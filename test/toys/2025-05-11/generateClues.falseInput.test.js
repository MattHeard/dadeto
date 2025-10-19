import { test, expect } from '@jest/globals';
import { generateClues } from '../../../src/core/toys/2025-05-11/battleshipSolitaireClues.js';

test.each([['false'], ['null']])(
  'generateClues gracefully handles %s input',
  value => {
    const call = () => generateClues(value);
    expect(call).not.toThrow();
    expect(call()).toBe('{"error":"Invalid fleet structure"}');
  }
);
