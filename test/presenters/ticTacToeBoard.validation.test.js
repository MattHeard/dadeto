import { describe, it, expect } from '@jest/globals';
import {
  isValidPosition,
  hasValidPositionWithEmptyCell,
  isCellEmpty,
  isValidCoordinate,
  arePositionCoordinatesValid,
  hasValidRow,
  hasValidColumn,
  isValidPlayer,
  isLegalMove,
} from '../../src/core/browser/presenters/ticTacToeBoard.js';

describe('ticTacToeBoard validation helpers', () => {
  it('rejects undefined positions', () => {
    expect(isValidPosition(undefined)).toBe(false);
  });

  it('rejects positions with a non-numeric column', () => {
    const candidate = { row: 1, column: 'x' };
    expect(isValidPosition(candidate)).toBe(false);
  });

  it('rejects positions whose cell is already occupied', () => {
    const board = Array.from({ length: 3 }, () => Array(3).fill('X'));
    const move = { position: { row: 0, column: 0 } };
    expect(hasValidPositionWithEmptyCell(move, board)).toBe(false);
  });

  it('accepts valid positions pointing at empty cells', () => {
    const board = Array.from({ length: 3 }, () => Array(3).fill(' '));
    const move = { position: { row: 2, column: 1 } };
    expect(hasValidPositionWithEmptyCell(move, board)).toBe(true);
    expect(isCellEmpty(move.position, board)).toBe(true);
  });

  it('requires each coordinate to be exactly one of the three board indexes', () => {
    expect(isValidCoordinate(0)).toBe(true);
    expect(isValidCoordinate(2)).toBe(true);
    expect(isValidCoordinate(3)).toBe(false);
    expect(isValidCoordinate('1')).toBe(false);
  });

  it('validates row and column independently', () => {
    expect(isValidPosition({ row: 1, column: 1 })).toBe(true);
    expect(isValidPosition(null)).toBe(false);
    expect(hasValidRow({ row: 0 })).toBe(true);
    expect(hasValidRow({ row: 3 })).toBe(false);
    expect(hasValidColumn({ column: 2 })).toBe(true);
    expect(hasValidColumn({ column: -1 })).toBe(false);
    expect(hasValidRow(undefined)).toBe(false);
    expect(hasValidColumn(undefined)).toBe(false);
    expect(arePositionCoordinatesValid({ row: 1, column: 1 })).toBe(true);
    expect(arePositionCoordinatesValid({ row: 1, column: 3 })).toBe(false);
  });

  it('accepts only X and O players', () => {
    expect(isValidPlayer('X')).toBe(true);
    expect(isValidPlayer('O')).toBe(true);
    expect(isValidPlayer('x')).toBe(false);
    expect(isValidPlayer(undefined)).toBe(false);
  });

  it('requires both a legal player and an empty valid cell', () => {
    const board = Array.from({ length: 3 }, () => Array(3).fill(' '));
    expect(isLegalMove({ player: 'X', position: { row: 0, column: 0 } }, board)).toBe(true);
    expect(isLegalMove({ player: 'Q', position: { row: 0, column: 0 } }, board)).toBe(false);
    board[0][0] = 'X';
    expect(isLegalMove({ player: 'O', position: { row: 0, column: 0 } }, board)).toBe(false);
  });
});
