import { describe, it, expect } from '@jest/globals';
import {
  getPlayer,
  getPosition
} from '../../src/presenters/ticTacToeBoard.js';

describe('ticTacToeBoard internal functions', () => {
  it('getPlayer returns undefined for undefined move', () => {
    expect(getPlayer(undefined)).toBeUndefined();
  });

  it('getPosition returns undefined for undefined move', () => {
    expect(getPosition(undefined)).toBeUndefined();
  });

  it('handles null move without throwing', () => {
    expect(() => getPlayer(null)).not.toThrow();
    expect(() => getPosition(null)).not.toThrow();
    expect(getPlayer(null)).toBeUndefined();
    expect(getPosition(null)).toBeUndefined();
  });
});
