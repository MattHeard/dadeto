import { parseJsonOrFallback } from '../browserToysCore.js';
import { when } from '../../common.js';

/**
 *
 * @param {*} player - description
 * @returns {*} - description
 */
function getOpponent(player) {
  if (player === 'X') {
    return 'O';
  } else {
    return 'X';
  }
}

/**
 *
 * @param {*} root0 - description
 * @param {*} root0.move - description
 * @param {*} root0.index - description
 * @param {*} root0.moves - description
 * @returns {*} - description
 */
function respectsTurnOrder({ move, index, moves }) {
  return index === 0 || move.player !== moves[index - 1].player;
}

/**
 *
 * @param {*} val - description
 * @returns {*} - description
 */
function isObject(val) {
  return typeof val === 'object' && val !== null;
}

/**
 *
 * @param {*} parsed - description
 * @returns {*} - description
 */
function getValidParsedMoves(parsed) {
  return when(isValidParsedMoves(parsed), () => parsed.moves);
}

/**
 *
 * @param {*} parsed - description
 * @returns {*} - description
 */
function makeValidatorReducer(parsed) {
  return (acc, fn) => {
    if (!acc) {
      return false;
    }
    return fn(parsed);
  };
}

/**
 *
 * @param {*} parsed - description
 * @returns {*} - description
 */
function isValidParsedMoves(parsed) {
  const validators = [isObject, hasMovesArray];
  return validators.reduce(makeValidatorReducer(parsed), true);
}

/**
 *
 * @param {*} val - description
 * @returns {*} - description
 */
function hasMovesArray(val) {
  return isObject(val) && Array.isArray(val.moves);
}

/**
 *
 * @param {*} input - description
 * @returns {*} - description
 */
function parseInputSafely(input) {
  const parsed = parseJsonOrFallback(input);
  return getValidParsedMoves(parsed);
}

/**
 *
 * @param {*} earlyWin - description
 * @param {*} moves - description
 * @returns {*} - description
 */
function shouldSkipMove(earlyWin, moves) {
  return earlyWin || moves.length >= 9;
}

/**
 * Build the JSON string for the provided move list.
 * @param {*} moves - Current move array.
 * @returns {string} JSON payload containing moves.
 */
function buildMoveResponse(moves) {
  const response = { moves };
  return JSON.stringify(response);
}

/**
 *
 * @param {*} moves - description
 * @param {*} newMove - description
 * @returns {*} - description
 */
function buildMoveResponseWithNewMove(moves, newMove) {
  const updatedMoves = [...moves, newMove];
  return buildMoveResponse(updatedMoves);
}

/**
 *
 * @param {*} moves - description
 * @returns {*} - description
 */
function buildMoveResponseWithoutNewMove(moves) {
  return buildMoveResponse(moves);
}

/**
 *
 * @param {*} input - description
 * @returns {*} - description
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
 *
 * @param {*} moves - description
 * @returns {*} - description
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
 *
 * @param {*} moves - description
 * @param {*} board - description
 * @param {*} result - description
 * @returns {*} - description
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
 *
 * @returns {*} - description
 */
function initializeBoardAndSeen() {
  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  const seen = new Set();
  return { board, seen };
}

/**
 *
 * @param {*} moves - description
 * @returns {*} - description
 */
function isTruthyMoves(moves) {
  return Boolean(moves);
}

/**
 *
 * @param {*} moves - description
 * @returns {*} - description
 */
function isArrayMoves(moves) {
  return Array.isArray(moves);
}

/**
 *
 * @param {*} moves - description
 * @returns {*} - description
 */
function isShortEnoughMoves(moves) {
  return !moves || moves.length <= 9;
}

/**
 *
 * @param {*} moves - description
 * @returns {*} - description
 */
function isInvalidMoves(moves) {
  const validators = [isTruthyMoves, isArrayMoves, isShortEnoughMoves];
  return !validators.every(fn => fn(moves));
}

/**
 *
 * @param {*} i - description
 * @param {*} moves - description
 * @param {*} apply - description
 * @returns {*} - description
 */
function isMoveApplicationValid(i, moves, apply) {
  const move = moves[i];
  const canBeApplied = canMoveBeApplied(move, i, moves);
  const valid = canBeApplied && apply(move);
  return valid;
}

/**
 *
 * @param {*} valid - description
 * @param {*} earlyWin - description
 * @returns {*} - description
 */
function shouldStop(valid, earlyWin) {
  return !valid || earlyWin;
}

/**
 *
 * @param {*} moves - description
 * @param {*} board - description
 * @param {*} seen - description
 * @returns {*} - description
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
 *
 * @param {*} moves - description
 * @param {*} board - description
 * @param {*} seen - description
 * @returns {*} - description
 */
function applyMovesSequentially(moves, board, seen) {
  const initial = { valid: true, earlyWin: false, stop: false };
  const reducer = applyMoveReducer(moves, board, seen);
  const result = moves.reduce(reducer, initial);
  return { valid: result.valid, earlyWin: result.earlyWin };
}

/**
 *
 * @param {*} board - description
 * @returns {*} - description
 */
function copyBoard(board) {
  return board.map(row => row.slice());
}

/**
 *
 * @param {*} board - description
 * @param {*} coordinates - description
 * @param {*} value - description
 * @returns {*} - description
 */
function setBoardCell(board, coordinates, value) {
  const { r, c } = coordinates;
  const boardCopy = copyBoard(board);
  boardCopy[r][c] = value;
  return boardCopy;
}

/**
 *
 * @param {*} player - description
 * @param {*} moves - description
 * @param {*} setCell - description
 * @returns {*} - description
 */
function scoreMove(player, moves, setCell) {
  const board = setCell(player);
  const params = { board, player, moves };
  const score = minimax(0, false, params);
  return score;
}

/**
 *
 * @param {*} board - description
 * @param {*} nextPlayer - description
 * @param {*} moves - description
 * @returns {*} - description
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
 *
 * @param {*} board - description
 * @param {*} nextPlayer - description
 * @param {*} moves - description
 * @returns {*} - description
 */
function getScoredMoves(board, nextPlayer, moves) {
  const scoreReducer = makeScoreReducer(board, nextPlayer, moves);
  return getEmptyCells(board).reduce(scoreReducer, []);
}

/**
 *
 * @param {*} scoredMoves - description
 * @returns {*} - description
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
 *
 * @param {*} board - description
 * @param {*} r - description
 * @param {*} c - description
 * @returns {*} - description
 */
function setter(board, r, c) {
  return value => setBoardCell(board, { r, c }, value);
}

/**
 *
 * @param {*} board - description
 * @param {*} nextPlayer - description
 * @param {*} moves - description
 * @returns {*} - description
 */
function findBestMove(board, nextPlayer, moves) {
  const scoredMoves = getScoredMoves(board, nextPlayer, moves);
  const bestScoredMove = getBestScoredMove(scoredMoves);
  return bestScoredMove.move;
}

/**
 *
 * @param {*} board - description
 * @returns {*} - description
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
 *
 * @param {*} moves - description
 * @returns {*} - description
 */
function determineNextPlayer(moves) {
  if (moves.length === 0) {
    return 'X';
  }
  return getOpponent(moves[moves.length - 1].player);
}

/**
 *
 * @param {*} row - description
 * @param {*} player - description
 * @returns {*} - description
 */
function isRowWin(row, player) {
  return row.every(cell => cell === player);
}

/**
 *
 * @param {*} board - description
 * @param {*} player - description
 * @returns {*} - description
 */
function checkRows(board, player) {
  return board.some(row => isRowWin(row, player));
}

/**
 *
 * @param {*} board - description
 * @param {*} col - description
 * @param {*} player - description
 * @returns {*} - description
 */
function isColumnWin(board, col, player) {
  return board.every(row => row[col] === player);
}

/**
 *
 * @param {*} board - description
 * @param {*} player - description
 * @returns {*} - description
 */
function checkColumns(board, player) {
  return [0, 1, 2].some(col => isColumnWin(board, col, player));
}

/**
 *
 * @param {*} board - description
 * @param {*} player - description
 * @returns {*} - description
 */
function checkDiagonals(board, player) {
  const leftToRight = [0, 1, 2].every(i => board[i][i] === player);
  const rightToLeft = [0, 1, 2].every(i => board[i][2 - i] === player);
  return leftToRight || rightToLeft;
}

/**
 *
 * @param {*} board - description
 * @returns {*} - description
 */
function checkEarlyWin(board) {
  return isWin(board, 'X') || isWin(board, 'O');
}

/**
 *
 * @param {*} board - description
 * @param {*} move - description
 * @param {*} seen - description
 * @returns {*} - description
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
 *
 * @param {*} isWinPlayer - description
 * @param {*} depth - description
 * @returns {*} - description
 */
function getTerminalScore(isWinPlayer, depth) {
  if (isWinPlayer()) {
    return 10 - depth;
  }
  return depth - 10;
}

/**
 *
 * @param {*} isWinPlayer - description
 * @param {*} isWinOpponent - description
 * @returns {*} - description
 */
function shouldEvaluateTerminal(isWinPlayer, isWinOpponent) {
  return isWinPlayer() || isWinOpponent();
}

/**
 *
 * @param {*} isWinPlayer - description
 * @param {*} isWinOpponent - description
 * @param {*} depth - description
 * @returns {*} - description
 */
function evaluateTerminalState(isWinPlayer, isWinOpponent, depth) {
  if (shouldEvaluateTerminal(isWinPlayer, isWinOpponent)) {
    return getTerminalScore(isWinPlayer, depth);
  }
  return null;
}

/**
 *
 * @param {*} board - description
 * @returns {*} - description
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
 *
 * @param {*} board - description
 * @param {*} accumulateScores - description
 * @returns {*} - description
 */
function simulateMoves(board, accumulateScores) {
  return getAvailableMoves(board).reduce(accumulateScores, []);
}

/**
 *
 * @param {*} depth - description
 * @param {*} isMax - description
 * @param {*} params - description
 * @returns {*} - description
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
 *
 * @param {*} scores - description
 * @param {*} isMax - description
 * @returns {*} - description
 */
function selectScore(scores, isMax) {
  if (isMax) {
    return Math.max(...scores);
  } else {
    return Math.min(...scores);
  }
}

/**
 *
 * @param {*} params - description
 * @param {*} depth - description
 * @param {*} isMax - description
 * @returns {*} - description
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
 *
 * @param {*} root0 - description
 * @param {*} root0.move - description
 * @returns {*} - description
 */
function hasValidPlayer({ move }) {
  return ['X', 'O'].includes(move.player);
}

/**
 *
 * @param {*} root0 - description
 * @param {*} root0.move - description
 * @returns {*} - description
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
 *
 * @param {*} row - description
 * @param {*} column - description
 * @returns {*} - description
 */
function isValidRowAndColumn(row, column) {
  return [0, 1, 2].includes(row) && [0, 1, 2].includes(column);
}

/**
 *
 * @param {*} move - description
 * @param {*} index - description
 * @param {*} moves - description
 * @returns {*} - description
 */
function canMoveBeApplied(move, index, moves) {
  if (!isObject(move)) {
    return false;
  }
  return isMoveDetailsValid({ move, index, moves });
}

/**
 *
 * @param {*} params - description
 * @returns {*} - description
 */
function isMoveDetailsValid(params) {
  const validators = [hasValidPlayer, hasValidPosition, respectsTurnOrder];
  return validators.every(fn => fn(params));
}

/**
 *
 * @param {*} board - description
 * @param {*} player - description
 * @returns {*} - description
 */
function isWin(board, player) {
  const checks = [checkRows, checkColumns, checkDiagonals];
  return checks.some(fn => fn(board, player));
}

/**
 *
 * @returns {*} - description
 */
function returnInitialOptimalMove() {
  // In an empty board, the optimal first move is the center
  const optimal = { player: 'X', position: { row: 1, column: 1 } };
  return JSON.stringify({ moves: [optimal] });
}
