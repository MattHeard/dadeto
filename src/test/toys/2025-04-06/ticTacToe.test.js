import { test, expect } from '@jest/globals';
import { ticTacToeMove } from '../../../toys/2025-04-06/ticTacToe.js';

test('returns optimal move for invalid input', () => {
  const env = new Map();
  const result = ticTacToeMove('invalid json', env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('detects win for X and returns no additional move', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 0, column: 1 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } } // X wins across the top row
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves); // no additional move since game is over
});

test('returns optimal move for malformed schema', () => {
  const env = new Map();
  const result = ticTacToeMove(JSON.stringify({ badKey: [] }), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('detects invalid player alternation', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'X', position: { row: 0, column: 1 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('detects duplicate positions', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 0 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('detects too many moves on the board', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 1, column: 1 } },
      { player: 'O', position: { row: 1, column: 2 } },
      { player: 'X', position: { row: 2, column: 0 } },
      { player: 'O', position: { row: 2, column: 1 } },
      { player: 'X', position: { row: 2, column: 2 } },
      { player: 'O', position: { row: 0, column: 0 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('detects full board with no remaining moves', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 1, column: 1 } },
      { player: 'O', position: { row: 1, column: 2 } },
      { player: 'X', position: { row: 2, column: 0 } },
      { player: 'O', position: { row: 2, column: 1 } },
      { player: 'X', position: { row: 2, column: 2 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves);
});

test('detects win for O and returns no additional move', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 0, column: 1 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 2, column: 2 } },
      { player: 'O', position: { row: 1, column: 2 } } // O wins across the middle row
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves); // game is over, no extra move
});

test('detects tie game with no remaining moves', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 1, column: 0 } },
      { player: 'O', position: { row: 2, column: 0 } },
      { player: 'X', position: { row: 1, column: 2 } },
      { player: 'O', position: { row: 2, column: 2 } },
      { player: 'X', position: { row: 2, column: 1 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
    expect(output.moves).toEqual(input.moves); // board is full, no move added
});

test('selects optimal move in mid-game scenario', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 0, column: 1 } },
      { player: 'O', position: { row: 2, column: 1 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(5);
  expect(output.moves[4].player).toBe('X');
  // X can win by taking (0, 2)
  expect(output.moves[4].position).toEqual({ row: 0, column: 2 });
});

test('handles null move entry gracefully', () => {
  const env = new Map();
  const input = {
    moves: [null]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('handles invalid player', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'Z', position: { row: 0, column: 0 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('handles out-of-bounds position', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 5, column: -1 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('assigns X to first move when moves list is empty', () => {
  const env = new Map();
  const input = {
    moves: []
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0].player).toBe('X');
});

test('handles position as non-object', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: "invalid" }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({ player: 'X', position: { row: 1, column: 1 } });
});

test('forces minimax to score a tie at max depth', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 1, column: 2 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 2, column: 1 } },
      { player: 'O', position: { row: 2, column: 2 } }
    ]
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  // Only one move left, and it leads to a tie
  expect(output.moves).toHaveLength(9);
  expect(output.moves[8]).toEqual({ player: 'X', position: { row: 2, column: 0 } });
});
