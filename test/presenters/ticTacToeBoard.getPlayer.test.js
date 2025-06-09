import { describe, test, expect } from '@jest/globals';
import {
  getPlayer,
  getPosition
} from '../../src/presenters/ticTacToeBoard.js';

describe('getPlayer and getPosition', () => {
  test('return undefined for null move', () => {
    expect(getPlayer(null)).toBeUndefined();
    expect(getPosition(null)).toBeUndefined();
  });

  test('return undefined for undefined move', () => {
    expect(getPlayer(undefined)).toBeUndefined();
    expect(getPosition(undefined)).toBeUndefined();
  });

  test('return undefined when property missing', () => {
    expect(getPlayer({})).toBeUndefined();
    expect(getPosition({})).toBeUndefined();
  });
});
