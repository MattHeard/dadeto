import { describe, test, expect } from '@jest/globals';
import {
  getPlayer,
  getPosition
} from '../../src/presenters/ticTacToeBoard.js';

describe('ticTacToeBoard getters via import', () => {
  test('getPlayer returns undefined for undefined move', () => {
    expect(getPlayer(undefined)).toBeUndefined();
  });

  test('getPosition returns undefined for undefined move', () => {
    expect(getPosition(undefined)).toBeUndefined();
  });
});
