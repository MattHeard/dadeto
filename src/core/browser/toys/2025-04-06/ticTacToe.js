import { parseJsonOrFallback } from '../browserToysCore.js';
import { when } from '../../common.js';

/**
 * @typedef {'X' | 'O'} TicTacToePlayer
 * @typedef {{ row: number, col: number }} TicTacToePosition
 * @typedef {{ player: TicTacToePlayer, position: TicTacToePosition }} TicTacToeMove
 * @typedef {{ moves: TicTacToeMove[] }} TicTacToePayload
 * @typedef {{
 *   board: Array<Array<TicTacToePlayer | null>>,
 *   seen: Set<string>
 * }} TicTacToeBoardState
 * @typedef {{ valid: boolean, earlyWin: boolean }} MoveResult
 * @typedef {{ valid: boolean, earlyWin: boolean, stop: boolean }} MoveAccumulator
 * @typedef {{ moveScore: number, move: { row: number, column: number } }} ScoredMove
 * @typedef {{
 *   board: TicTacToeBoardState['board'],
 *   player: TicTacToePlayer,
 *   moves: TicTacToeMove[]
 * }} MinimaxParams
 */

/**
 * Determine the opposing player.
 * @param {TicTacToePlayer} player - Current player.
 * @returns {TicTacToePlayer} Opponent player.
 */
function getOpponent(player) {
  if (player === 'X') {
    return 'O';
  } else {
    return 'X';
  }
}

/**
 * Ensure the move alternates players according to turn order.
 * @param {{ move: TicTacToeMove, index: number, moves: TicTacToeMove[] }} params - Move context.
 * @returns {boolean} True when the move respects turn order.
 */
function respectsTurnOrder({ move, index, moves }) {
  return index === 0 || move.player !== moves[index - 1].player;
}

/**
 * Determine whether the value is a plain object.
 * @param {unknown} val - Candidate value.
 * @returns {val is Record<string, unknown>} True when the value is a non-null object.
 */
function isObject(val) {
  return typeof val === 'object' && val !== null;
}

/**
 * Validate that the parsed payload contains moves.
 * @param {unknown} parsed - Parsed input value.
 * @returns {TicTacToeMove[] | null} Moves when valid, otherwise null.
 */
function getValidParsedMoves(parsed) {
  return when(isValidParsedMoves(parsed), () => parsed.moves);
}

/**
 * Build a reducer that runs validators against the parsed payload.
 * @param {unknown} parsed - Candidate payload.
 * @returns {(acc: boolean, fn: (payload: unknown) => boolean) => boolean} Reducer that short circuits on invalid payloads.
 */
function makeValidatorReducer(parsed) {
  return (
    /**
     * @param {boolean} acc - Accumulated validation result.
     * @param {(payload: unknown) => boolean} fn - Validator function.
     * @returns {boolean} Validation result for the current function.
     */
    (acc, fn) => {
      if (!acc) {
        return false;
      }
      return fn(parsed);
    }
  );
}

/**
 * Validate that the parsed object exposes a moves array.
 * @param {unknown} parsed - Candidate payload.
 * @returns {parsed is TicTacToePayload} True when the payload carries moves.
 */
function isValidParsedMoves(parsed) {
  const validators = [isObject, hasMovesArray];
  return validators.reduce(makeValidatorReducer(parsed), true);
}

/**
 * Check whether the object exposes a moves array.
 * @param {unknown} val - Candidate value.
 * @returns {val is TicTacToePayload} True when the object carries a moves array.
 */
function hasMovesArray(val) {
  return isObject(val) && Array.isArray(val.moves);
}

/**
 * Parse the input JSON safely and extract the moves array when valid.
 * @param {string} input - JSON string containing tic-tac-toe moves.
 * @returns {TicTacToeMove[] | null} Moves or null when parsing fails.
 */
function parseInputSafely(input) {
  const parsed = parseJsonOrFallback(input);
  return getValidParsedMoves(parsed);
}

/**
 * Decide whether the toy should skip adding a new move.
 * @param {boolean} earlyWin - Indicator that a win already occurred.
 * @param {TicTacToeMove[]} moves - Moves played so far.
 * @returns {boolean} True when the moves array is truthy.
 */
function shouldSkipMove(earlyWin, moves) {
  return earlyWin || moves.length >= 9;
}
/**
 * Build the JSON string for the provided move list.
 * @param {TicTacToeMove[]} moves - Current move array.
 * @returns {string} JSON payload containing moves.
 */
function buildMoveResponse(moves) {
  const response = { moves };
  return JSON.stringify(response);
}

/**
 * Build a response when a new move must be appended.
 * @param {TicTacToeMove[]} moves - Existing moves.
 * @param {TicTacToeMove} newMove - Move to append.
 * @returns {boolean} True when the moves list stays within the board limit.
 */
function buildMoveResponseWithNewMove(moves, newMove) {
  const updatedMoves = [...moves, newMove];
  return buildMoveResponse(updatedMoves);
}

/**
 * Build a response without adding a new move.
 * @param {TicTacToeMove[]} moves - Existing moves.
 * @returns {boolean} True when the moves array passes all validators.
 */
function buildMoveResponseWithoutNewMove(moves) {
  return buildMoveResponse(moves);
}

/**
 * Entry point for the Tic Tac Toe toy.
 * @param {string} input - JSON string describing moves.
 * @returns {string} Response payload.
 */
export function ticTacToeMove(input) {
  const moves = parseInputSafely(input);

  // Inline validateAndApplyMoves
  if (isInvalidMoves(moves)) {
    return returnInitialOptimalMove();
  }
  return handleValidMoves(moves);
}

/**
 * Continue processing when moves are valid.
 * @param {TicTacToeMove[]} moves - Moves array.
 * @returns {boolean} True when the move application is valid.
 */
function handleValidMoves(moves) {
  const { board, seen } = initializeBoardAndSeen();
  const result = applyMovesSequentially(moves, board, seen);
  if (!result.valid) {
    return returnInitialOptimalMove();
  }
  return handleValidAppliedMoves(moves, board, result);
}

/**
 * Handle the game state once moves are successfully applied.
 * @param {TicTacToeMove[]} moves - Applied moves.
 * @param {TicTacToeBoardState['board']} board - Current board state.
 * @param {MoveResult} result - Result of applying the moves.
 * @returns {boolean} True when processing should halt.
 */
function handleValidAppliedMoves(moves, board, result) {
  const earlyWin = result.earlyWin;

  if (shouldSkipMove(earlyWin, moves)) {
    return buildMoveResponseWithoutNewMove(moves);
  }

  const nextPlayer = determineNextPlayer(moves);
  const bestMove = findBestMove(board, nextPlayer, moves);
  const newMove = { player: nextPlayer, position: bestMove };
  return buildMoveResponseWithNewMove(moves, newMove);
}

/**
 * Initialize an empty board and seen positions tracker.
 * @returns {TicTacToeBoardState} The empty board/seen state for the next move.
 */
function initializeBoardAndSeen() {
  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  const seen = new Set();
  return { board, seen };
}

/**
 * Confirm that the moves array has a truthy value.
 * @param {TicTacToeMove[] | null} moves - Candidate moves.
 * @returns {boolean}
 */
function isTruthyMoves(moves) {
  return Boolean(moves);
}

/**
 * Confirm the value is an array of moves.
 * @param {unknown} moves - Candidate value.
 * @returns {moves is TicTacToeMove[]} True when the value is an array.
 */
function isArrayMoves(moves) {
  return Array.isArray(moves);
}

/**
 * Ensure the moves array does not exceed the board capacity.
 * @param {TicTacToeMove[] | null} moves - Candidate moves.
 * @returns {boolean}
 */
function isShortEnoughMoves(moves) {
  return !moves || moves.length <= 9;
}

/**
 * Determine whether the moves array fails validation.
 * @param {TicTacToeMove[] | null} moves - Candidate moves.
 * @returns {boolean} True when the moves should be rejected.
 */
function isInvalidMoves(moves) {
  const validators = [isTruthyMoves, isArrayMoves, isShortEnoughMoves];
  return !validators.every(fn => fn(moves));
}

/**
 * Check whether the move can be applied at the current index.
 * @param {number} i - Move index.
 * @param {TicTacToeMove[]} moves - Moves array.
 * @param {(move: TicTacToeMove) => boolean} apply - Callback that applies the move.
 * @returns {boolean} True when applying the move at index `i` is valid.
 */
function isMoveApplicationValid(i, moves, apply) {
  const move = moves[i];
  const canBeApplied = canMoveBeApplied(move, i, moves);
  const valid = canBeApplied && apply(move);
  return valid;
}

/**
 * Decide whether to stop processing moves.
 * @param {boolean} valid - Current validity flag.
 * @param {boolean} earlyWin - Indicates if a win was already detected.
 * @returns {boolean} True when processing should halt (either invalid move or early win).
 */
function shouldStop(valid, earlyWin) {
  return !valid || earlyWin;
}

/**
 * Build a reducer that applies moves sequentially.
 * @param {TicTacToeMove[]} moves - Moves array.
 * @param {TicTacToeBoardState['board']} board - Board state.
 * @param {Set<string>} seen - Seen positions.
 * @returns {(acc: MoveAccumulator, _: TicTacToeMove | undefined, i: number) => MoveAccumulator} Reducer that walks through the move list until it stops.
 */
function applyMoveReducer(moves, board, seen) {
  return function (acc, _, i) {
    if (acc.stop) {
      return acc;
    }

    const apply = move => applyMoveToBoard(board, move, seen);
    const valid = isMoveApplicationValid(i, moves, apply);
    const earlyWin = checkEarlyWin(board);
    const stop = shouldStop(valid, earlyWin);

    return { valid, earlyWin, stop };
  };
}

/**
 * Apply the provided moves to the board and summarize the result.
 * @param {TicTacToeMove[]} moves - Moves to apply.
 * @param {TicTacToeBoardState['board']} board - Board state.
 * @param {Set<string>} seen - Seen coordinates.
 * @returns {MoveResult}
 */
function applyMovesSequentially(moves, board, seen) {
  const initial = { valid: true, earlyWin: false, stop: false };
  const reducer = applyMoveReducer(moves, board, seen);
  const result = moves.reduce(reducer, initial);
  return { valid: result.valid, earlyWin: result.earlyWin };
}

/**
 * Clone the board rows.
 * @param {TicTacToeBoardState['board']} board - Board to copy.
 * @returns {TicTacToeBoardState['board']}
 */
function copyBoard(board) {
  return board.map(row => row.slice());
}

/**
 * Set a cell value on a copy of the board.
 * @param {TicTacToeBoardState['board']} board - Source board.
 * @param {{ r: number, c: number }} coordinates - Cell coordinates.
 * @param {TicTacToePlayer} value - Value to insert.
 * @returns {TicTacToeBoardState['board']} Updated board copy.
 */
function setBoardCell(board, coordinates, value) {
  const { r, c } = coordinates;
  const boardCopy = copyBoard(board);
  boardCopy[r][c] = value;
  return boardCopy;
}

/**
 * Score a hypothetical move using minimax.
 * @param {TicTacToePlayer} player - Player making the move.
 * @param {TicTacToeMove[]} moves - Moves already played.
 * @param {(value: TicTacToePlayer) => TicTacToeBoardState['board']} setCell - Function that applies the move.
 * @returns {number} Move score.
 */
function scoreMove(player, moves, setCell) {
  const board = setCell(player);
  const params = { board, player, moves };
  const score = minimax(0, false, params);
  return score;
}

/**
 * Build a reducer that scores each empty cell.
 * @param {TicTacToeBoardState['board']} board - Current board state.
 * @param {TicTacToePlayer} nextPlayer - Player to move next.
 * @param {TicTacToeMove[]} moves - Moves already played.
 * @returns {(acc: ScoredMove[], coordinates: { r: number, c: number }) => ScoredMove[]}
 */
function makeScoreReducer(board, nextPlayer, moves) {
  return (acc, { r, c }) => {
    const setCell = setter(board, r, c);
    const move = { row: r, column: c };
    const moveScore = scoreMove(nextPlayer, moves, setCell);
    const scoredMove = { moveScore, move };
    acc.push(scoredMove);
    return acc;
  };
}

/**
 * Score every empty cell for the next player.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {TicTacToePlayer} nextPlayer - Player to move next.
 * @param {TicTacToeMove[]} moves - Moves already played.
 * @returns {ScoredMove[]}
 */
function getScoredMoves(board, nextPlayer, moves) {
  const scoreReducer = makeScoreReducer(board, nextPlayer, moves);
  return getEmptyCells(board).reduce(scoreReducer, []);
}

/**
 * Pick the move with the highest score.
 * @param {ScoredMove[]} scoredMoves - Candidate moves with scores.
 * @returns {ScoredMove} Best scored move.
 */
function getBestScoredMove(scoredMoves) {
  return scoredMoves.reduce(
    (best, current) => {
      if (current.moveScore > best.moveScore) {
        return current;
      } else {
        return best;
      }
    },
    { moveScore: -Infinity }
  );
}

/**
 * Create a setter that inserts a value at the target coordinates.
 * @param {TicTacToeBoardState['board']} board - Board state.
 * @param {number} r - Row index.
 * @param {number} c - Column index.
 * @returns {(value: TicTacToePlayer) => TicTacToeBoardState['board']}
 */
function setter(board, r, c) {
  return value => setBoardCell(board, { r, c }, value);
}

/**
 * Evaluate and return the best move for the next player.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {TicTacToePlayer} nextPlayer - Player to move.
 * @param {TicTacToeMove[]} moves - Moves played so far.
 * @returns {TicTacToePosition}
 */
function findBestMove(board, nextPlayer, moves) {
  const scoredMoves = getScoredMoves(board, nextPlayer, moves);
  const bestScoredMove = getBestScoredMove(scoredMoves);
  return bestScoredMove.move;
}

/**
 * Collect empty cells from the board.
 * @param {TicTacToeBoardState['board']} board - Board state.
 * @returns {Array<{ r: number, c: number }>}
 */
function getEmptyCells(board) {
  return board.reduce(
    (cells, row, r) =>
      row.reduce((acc, cell, c) => {
        if (!cell) {
          acc.push({ r, c });
        }
        return acc;
      }, cells),
    []
  );
}

/**
 * Determine which player moves next.
 * @param {TicTacToeMove[]} moves - Moves played so far.
 * @returns {TicTacToePlayer}
 */
function determineNextPlayer(moves) {
  if (moves.length === 0) {
    return 'X';
  }
  return getOpponent(moves[moves.length - 1].player);
}

/**
 * Check whether a row is owned entirely by the player.
 * @param {Array<TicTacToePlayer | null>} row - Row to evaluate.
 * @param {TicTacToePlayer} player - Player to check.
 * @returns {boolean}
 */
function isRowWin(row, player) {
  return row.every(cell => cell === player);
}

/**
 * Check whether any row is a win for the player.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {TicTacToePlayer} player - Player to check.
 * @returns {boolean}
 */
function checkRows(board, player) {
  return board.some(row => isRowWin(row, player));
}

/**
 * Check whether a column is a win for the player.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {number} col - Column index.
 * @param {TicTacToePlayer} player - Player to check.
 * @returns {boolean}
 */
function isColumnWin(board, col, player) {
  return board.every(row => row[col] === player);
}

/**
 * Check whether any column is a win for the player.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {TicTacToePlayer} player - Player to check.
 * @returns {boolean}
 */
function checkColumns(board, player) {
  return [0, 1, 2].some(col => isColumnWin(board, col, player));
}

/**
 * Check whether a diagonal is a win for the player.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {TicTacToePlayer} player - Player to check.
 * @returns {boolean}
 */
function checkDiagonals(board, player) {
  const leftToRight = [0, 1, 2].every(i => board[i][i] === player);
  const rightToLeft = [0, 1, 2].every(i => board[i][2 - i] === player);
  return leftToRight || rightToLeft;
}

/**
 * Detect whether either player already has a winning line.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @returns {boolean}
 */
function checkEarlyWin(board) {
  return isWin(board, 'X') || isWin(board, 'O');
}

/**
 * Apply the move to the board and update the seen set.
 * @param {TicTacToeBoardState['board']} board - Board to mutate.
 * @param {TicTacToeMove} move - Move being applied.
 * @param {Set<string>} seen - Seen coordinates.
 * @returns {boolean}
 */
function applyMoveToBoard(board, move, seen) {
  const { player, position } = move;
  const { row, column } = position;

  const key = `${row},${column}`;
  if (seen.has(key)) {
    return false;
  }
  seen.add(key);

  board[row][column] = player;
  return true;
}

/**
 * Compute the minimax score for a winning state.
 * @param {() => boolean} isWinPlayer - Callback indicating a win for the player.
 * @param {number} depth - Current depth in the search tree.
 * @returns {number}
 */
function getTerminalScore(isWinPlayer, depth) {
  if (isWinPlayer()) {
    return 10 - depth;
  }
  return depth - 10;
}

/**
 * Determine whether the game is in a terminal state.
 * @param {() => boolean} isWinPlayer - Callback for player win.
 * @param {() => boolean} isWinOpponent - Callback for opponent win.
 * @returns {boolean}
 */
function shouldEvaluateTerminal(isWinPlayer, isWinOpponent) {
  return isWinPlayer() || isWinOpponent();
}

/**
 * Evaluate and score the terminal state if present.
 * @param {() => boolean} isWinPlayer - Callback for player win.
 * @param {() => boolean} isWinOpponent - Callback for opponent win.
 * @param {number} depth - Current search depth.
 * @returns {number | null}
 */
function evaluateTerminalState(isWinPlayer, isWinOpponent, depth) {
  if (shouldEvaluateTerminal(isWinPlayer, isWinOpponent)) {
    return getTerminalScore(isWinPlayer, depth);
  }
  return null;
}

/**
 * List available moves on the board.
 * @param {TicTacToeBoardState['board']} board - Current board state.
 * @returns {Array<[number, number]>}
 */
function getAvailableMoves(board) {
  return board.reduce(
    (moves, row, r) =>
      row.reduce((acc, cell, c) => {
        if (!cell) {
          acc.push([r, c]);
        }
        return acc;
      }, moves),
    []
  );
}

/**
 * Simulate moves by accumulating scores.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {(scores: number[], move: [number, number]) => number[]} accumulateScores - Reducer over available moves.
 * @returns {number[]}
 */
function simulateMoves(board, accumulateScores) {
  return getAvailableMoves(board).reduce(accumulateScores, []);
}

/**
 * Minimax search for tic-tac-toe.
 * @param {number} depth - Current depth in the search tree.
 * @param {boolean} isMax - Whether the current layer is maximizing.
 * @param {MinimaxParams} params - Search parameters.
 * @returns {number}
 */
function minimax(depth, isMax, params) {
  const opponent = getOpponent(params.player);
  const isWinPlayer = () => isWin(params.board, params.player);
  const isWinOpponent = () => isWin(params.board, opponent);
  const terminalScore = evaluateTerminalState(
    isWinPlayer,
    isWinOpponent,
    depth
  );
  if (terminalScore !== null) {
    return terminalScore;
  }
  const accumulateScores = makeAccumulateScores(params, depth, isMax);
  const scores = simulateMoves(params.board, accumulateScores);
  return selectScore(scores, isMax);
}

/**
 * Select the best or worst score depending on the layer.
 * @param {number[]} scores - Collected scores.
 * @param {boolean} isMax - Whether to select the maximum.
 * @returns {number}
 */
function selectScore(scores, isMax) {
  if (isMax) {
    return Math.max(...scores);
  } else {
    return Math.min(...scores);
  }
}

/**
 * Create a reducer that accumulates scores for each simulated move.
 * @param {MinimaxParams} params - Current search parameters.
 * @param {number} depth - Current depth.
 * @param {boolean} isMax - Whether the layer maximizes scores.
 * @returns {(scores: number[], move: [number, number]) => number[]}
 */
function makeAccumulateScores(params, depth, isMax) {
  let value;
  if (isMax) {
    value = params.player;
  } else {
    value = getOpponent(params.player);
  }
  return (scores, [r, c]) => {
    // Deep copy the board
    const newBoard = params.board.map(row => row.slice());
    newBoard[r][c] = value;
    const newParams = {
      board: newBoard,
      player: params.player,
      moves: params.moves,
    };
    const score = minimax(depth + 1, !isMax, newParams);
    scores.push(score);
    return scores;
  };
}

/**
 * Validate that the move is issued by a recognized player.
 * @param {{ move: TicTacToeMove }} params - Move wrapper.
 * @returns {boolean}
 */
function hasValidPlayer({ move }) {
  return ['X', 'O'].includes(move.player);
}

/**
 * Check whether the move carries a valid position.
 * @param {{ move: TicTacToeMove }} params - Move wrapper.
 * @returns {boolean}
 */
function hasValidPosition({ move }) {
  const position = move.position;
  if (!isObject(position)) {
    return false;
  }
  const { row, column } = position;
  return isValidRowAndColumn(row, column);
}

/**
 * Validate row and column indices.
 * @param {number} row - Row index.
 * @param {number} column - Column index.
 * @returns {boolean}
 */
function isValidRowAndColumn(row, column) {
  return [0, 1, 2].includes(row) && [0, 1, 2].includes(column);
}

/**
 * Determine whether the move can be applied at the current index.
 * @param {unknown} move - Move candidate.
 * @param {number} index - Move index.
 * @param {TicTacToeMove[]} moves - Moves array.
 * @returns {boolean}
 */
function canMoveBeApplied(move, index, moves) {
  if (!isObject(move)) {
    return false;
  }
  return isMoveDetailsValid({ move, index, moves });
}

/**
 * Validate that the move details satisfy all validators.
 * @param {{ move: unknown, index: number, moves: TicTacToeMove[] }} params - Move context.
 * @returns {boolean}
 */
function isMoveDetailsValid(params) {
  const validators = [hasValidPlayer, hasValidPosition, respectsTurnOrder];
  return validators.every(fn => fn(params));
}

/**
 * Check whether the player has a winning line on the board.
 * @param {TicTacToeBoardState['board']} board - Current board.
 * @param {TicTacToePlayer} player - Player to evaluate.
 * @returns {boolean}
 */
function isWin(board, player) {
  const checks = [checkRows, checkColumns, checkDiagonals];
  return checks.some(fn => fn(board, player));
}

/**
 * Return the initial optimal move payload.
 * @returns {string}
 */
function returnInitialOptimalMove() {
  // In an empty board, the optimal first move is the center
  const optimal = { player: 'X', position: { row: 1, column: 1 } };
  return JSON.stringify({ moves: [optimal] });
}
