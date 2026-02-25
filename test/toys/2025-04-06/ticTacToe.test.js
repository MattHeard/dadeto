import { test, expect } from '@jest/globals';
import { ticTacToeMove } from '../../../src/core/browser/toys/2025-04-06/ticTacToe.js';

test('returns optimal move for invalid input', () => {
  const env = new Map();
  const result = ticTacToeMove('invalid json', env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('minimax early tie return is triggered', () => {
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
      { player: 'O', position: { row: 2, column: 0 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(9);
  expect(output.moves[8]).toEqual({
    player: 'X',
    position: { row: 2, column: 2 },
  });
});

test('detects win for X and returns no additional move', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 0, column: 1 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } }, // X wins across the top row
    ],
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
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('returns optimal move when moves array contains non-object item', () => {
  const env = new Map();
  const input = {
    moves: [0],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('detects invalid player alternation', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'X', position: { row: 0, column: 1 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('stops processing after invalid move and ignores remaining moves', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'X', position: { row: 0, column: 1 } }, // invalid alternation
      { player: 'O', position: { row: 0, column: 2 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('detects duplicate positions', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 0 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
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
      { player: 'O', position: { row: 0, column: 0 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
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
      { player: 'X', position: { row: 2, column: 2 } },
    ],
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
      { player: 'O', position: { row: 1, column: 2 } }, // O wins across the middle row
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves); // game is over, no extra move
});

test('detects column win for X and returns no additional move', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 1, column: 0 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 2, column: 0 } }, // X wins down the first column
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves); // no additional move since column win ends the game
});

test('detects diagonal win for X and returns no additional move', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 1, column: 1 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 2, column: 2 } }, // X wins diagonally
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves); // no additional move on diagonal win
});

test('detects right-to-left diagonal win for X and returns no additional move', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 2 } },
      { player: 'O', position: { row: 0, column: 0 } },
      { player: 'X', position: { row: 1, column: 1 } },
      { player: 'O', position: { row: 1, column: 0 } },
      { player: 'X', position: { row: 2, column: 0 } }, // X wins diagonal from top-right to bottom-left
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves); // no additional move on diagonal win
});

test('adds ninth move to result in a tie', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 1, column: 0 } },
      { player: 'O', position: { row: 1, column: 2 } },
      { player: 'X', position: { row: 2, column: 1 } },
      { player: 'O', position: { row: 2, column: 0 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(9);
  // The 9th move should be X at (2,2)
  expect(output.moves[8]).toEqual({
    player: 'X',
    position: { row: 2, column: 2 },
  });
  // Ensure no win is detected (the board is a tie)
  // Optionally, if output contains a 'winner' or similar property, check it is undefined/null/empty
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
      { player: 'X', position: { row: 2, column: 1 } },
    ],
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
      { player: 'O', position: { row: 2, column: 1 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(5);
  expect(output.moves[4].player).toBe('X');
  // X can win by taking (0, 2)
  expect(output.moves[4].position).toEqual({ row: 0, column: 2 });
});

test('covers non-terminal state in minimax search', () => {
  // Board state: X in center, O in top-left, X in bottom-right
  // No winner, not full, minimax will recurse and hit 'return null' in evaluateTerminalState
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 1, column: 1 } },
      { player: 'O', position: { row: 0, column: 0 } },
      { player: 'X', position: { row: 2, column: 2 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  // Should return a valid next move, and moves should increase by 1
  expect(output.moves.length).toBe(input.moves.length + 1);
  // The next move should be for O
  expect(output.moves[output.moves.length - 1].player).toBe('O');
});

test('determines next optimal position on a non-terminal board', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 1, column: 1 } },
      { player: 'O', position: { row: 0, column: 0 } },
      { player: 'X', position: { row: 2, column: 2 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves.length).toBe(input.moves.length + 1);
  expect(output.moves[3]).toEqual({
    player: 'O',
    position: { row: 0, column: 1 },
  });
});

test('handles null move entry gracefully', () => {
  const env = new Map();
  const input = {
    moves: [null],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('handles invalid player', () => {
  const env = new Map();
  const input = {
    moves: [{ player: 'Z', position: { row: 0, column: 0 } }],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('handles out-of-bounds position', () => {
  const env = new Map();
  const input = {
    moves: [{ player: 'X', position: { row: 5, column: -1 } }],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('handles invalid row with valid column', () => {
  const env = new Map();
  const input = {
    moves: [{ player: 'X', position: { row: 5, column: 1 } }],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('handles invalid column with valid row', () => {
  const env = new Map();
  const input = {
    moves: [{ player: 'X', position: { row: 0, column: 5 } }],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('assigns X to first move when moves list is empty', () => {
  const env = new Map();
  const input = {
    moves: [],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0].player).toBe('X');
});

test('handles position as non-object', () => {
  const env = new Map();
  const input = {
    moves: [{ player: 'X', position: 'invalid' }],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('handles null position gracefully', () => {
  const env = new Map();
  const input = {
    moves: [{ player: 'X', position: null }],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
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
      { player: 'O', position: { row: 2, column: 2 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  // Only one move left, and it leads to a tie
  expect(output.moves).toHaveLength(9);
  expect(output.moves[8]).toEqual({
    player: 'X',
    position: { row: 2, column: 0 },
  });
});

test('handles duplicate board cell even if not duplicate position object', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 1, column: 1 } },
      { player: 'O', position: { row: 1, column: 1 } }, // duplicate board cell
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('forces minimax to run from O perspective', () => {
  const env = new Map();
  const input = {
    moves: [{ player: 'X', position: { row: 0, column: 0 } }],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(2);
  expect(output.moves[1].player).toBe('O');
});

test('returns fallback when minimax fails to assign bestMove', () => {
  const env = new Map();
  // All cells are filled with null to simulate a fully corrupted board
  const input = {
    moves: Array.from({ length: 9 }, function (_, i) {
      let player;
      if (i % 2 === 0) {
        player = 'X';
      } else {
        player = 'O';
      }
      return {
        player: player,
        position: { row: Math.floor(i / 3), column: i % 3 },
      };
    }),
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toEqual(input.moves); // no move added
});

test('returns early if board cell is already filled but not caught by seen', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 1, column: 1 } },
      // duplicate using a different object reference
      {
        player: 'O',
        position: JSON.parse(JSON.stringify({ row: 1, column: 1 })),
      },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  // Should fallback to initial move
  expect(output.moves).toHaveLength(1);
  expect(output.moves[0]).toEqual({
    player: 'X',
    position: { row: 1, column: 1 },
  });
});

test('triggers minimax tie return at full depth without win', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 0, column: 0 } },
      { player: 'O', position: { row: 0, column: 1 } },
      { player: 'X', position: { row: 0, column: 2 } },
      { player: 'O', position: { row: 1, column: 1 } },
      { player: 'X', position: { row: 1, column: 0 } },
      { player: 'O', position: { row: 1, column: 2 } },
      { player: 'X', position: { row: 2, column: 1 } },
      { player: 'O', position: { row: 2, column: 0 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(9);
  expect(output.moves[8]).toEqual({
    player: 'X',
    position: { row: 2, column: 2 },
  });
});

test('computes best response from bottom-left opening', () => {
  const env = new Map();
  const input = {
    moves: [
      { player: 'X', position: { row: 2, column: 0 } },
      { player: 'O', position: { row: 1, column: 1 } },
    ],
  };
  const result = ticTacToeMove(JSON.stringify(input), env);
  const output = JSON.parse(result);
  expect(output.moves).toHaveLength(3);
  expect(output.moves[2]).toEqual({
    player: 'X',
    position: { row: 1, column: 0 },
  });
});
