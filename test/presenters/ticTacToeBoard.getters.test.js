import { describe, it, expect } from '@jest/globals';
import {
  getPlayer,
  getPosition,
} from '../../src/core/browser/presenters/ticTacToeBoard.js';

describe('ticTacToeBoard getters', () => {
  const invalidInputs = [
    [null, 'null move'],
    [undefined, 'undefined move'],
    [{}, 'missing property'],
  ];

  invalidInputs.forEach(([input, desc]) => {
    it(`returns undefined for ${desc}`, () => {
      expect(getPlayer(input)).toBeUndefined();
      expect(getPosition(input)).toBeUndefined();
    });
  });

  it('does not throw when move is null', () => {
    expect(() => getPlayer(null)).not.toThrow();
    expect(() => getPosition(null)).not.toThrow();
  });
});
