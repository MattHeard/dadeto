import { isObject } from '../../utils/objectUtils.js';

function getOpponent(player) {
  if (player === 'X') {
    return 'O';
  } else {
    return 'X';
  }
}

function tryParseJSON(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function respectsTurnOrder({ move, index, moves }) {
  return index === 0 || move.player !== moves[index - 1].player;
}

function getValidParsedMoves(parsed) {
  const isValid = isValidParsedMoves(parsed);
  if (isValid) {
    return parsed.moves;
  } else {
    return null;
  }
}

function makeValidatorReducer(parsed) {
  return (acc, fn) => {
    if (!acc) {
      return false;
    }
    return fn(parsed);
  };
}

function isValidParsedMoves(parsed) {
  const validators = [isObject, hasMovesArray];
  return validators.reduce(makeValidatorReducer(parsed), true);
}

function hasMovesArray(val) {
  return isObject(val) && Array.isArray(val.moves);
}

function parseInputSafely(input) {
  const parsed = tryParseJSON(input);
  return getValidParsedMoves(parsed);
}

function shouldSkipMove(earlyWin, moves) {
  return earlyWin || moves.length >= 9;
}

function buildMoveResponseWithNewMove(moves, newMove) {
  const updatedMoves = [...moves, newMove];
  const response = { moves: updatedMoves };
  return JSON.stringify(response);
}

function buildMoveResponseWithoutNewMove(moves) {
  const response = { moves };
  return JSON.stringify(response);
}

export function ticTacToeMove(input) {
  const moves = parseInputSafely(input);

  // Inline validateAndApplyMoves
  if (isInvalidMoves(moves)) {
    return returnInitialOptimalMove();
  }
  return handleValidMoves(moves);
}

function handleValidMoves(moves) {
  const { board, seen } = initializeBoardAndSeen();
  const result = applyMovesSequentially(moves, board, seen);
  if (!result.valid) {
    return returnInitialOptimalMove();
  }
  return handleValidAppliedMoves(moves, board, result);
}

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

function initializeBoardAndSeen() {
  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  const seen = new Set();
  return { board, seen };
}

function isTruthyMoves(moves) {
  return Boolean(moves);
}

function isArrayMoves(moves) {
  return Array.isArray(moves);
}

function isShortEnoughMoves(moves) {
  return !moves || moves.length <= 9;
}

function isInvalidMoves(moves) {
  const validators = [isTruthyMoves, isArrayMoves, isShortEnoughMoves];
  return !validators.every(fn => fn(moves));
}

function isMoveApplicationValid(i, moves, apply) {
  const move = moves[i];
  const canBeApplied = canMoveBeApplied(move, i, moves);
  const valid = canBeApplied && apply(move);
  return valid;
}

function shouldStop(valid, earlyWin) {
  return !valid || earlyWin;
}

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

function applyMovesSequentially(moves, board, seen) {
  const initial = { valid: true, earlyWin: false, stop: false };
  const reducer = applyMoveReducer(moves, board, seen);
  const result = moves.reduce(reducer, initial);
  return { valid: result.valid, earlyWin: result.earlyWin };
}

function copyBoard(board) {
  return board.map(row => row.slice());
}

function setBoardCell(board, coordinates, value) {
  const { r, c } = coordinates;
  const boardCopy = copyBoard(board);
  boardCopy[r][c] = value;
  return boardCopy;
}

function scoreMove(player, moves, setCell) {
  const board = setCell(player);
  const params = { board, player, moves };
  const score = minimax(0, false, params);
  return score;
}

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

function getScoredMoves(board, nextPlayer, moves) {
  const scoreReducer = makeScoreReducer(board, nextPlayer, moves);
  return getEmptyCells(board).reduce(scoreReducer, []);
}

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

function setter(board, r, c) {
  return value => setBoardCell(board, { r, c }, value);
}

function findBestMove(board, nextPlayer, moves) {
  const scoredMoves = getScoredMoves(board, nextPlayer, moves);
  const bestScoredMove = getBestScoredMove(scoredMoves);
  return bestScoredMove.move;
}

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

function determineNextPlayer(moves) {
  if (moves.length === 0) {
    return 'X';
  }
  return getOpponent(moves[moves.length - 1].player);
}

function isRowWin(row, player) {
  return row.every(cell => cell === player);
}

function checkRows(board, player) {
  return board.some(row => isRowWin(row, player));
}

function isColumnWin(board, col, player) {
  return board.every(row => row[col] === player);
}

function checkColumns(board, player) {
  return [0, 1, 2].some(col => isColumnWin(board, col, player));
}

function checkDiagonals(board, player) {
  const leftToRight = [0, 1, 2].every(i => board[i][i] === player);
  const rightToLeft = [0, 1, 2].every(i => board[i][2 - i] === player);
  return leftToRight || rightToLeft;
}

function checkEarlyWin(board) {
  return isWin(board, 'X') || isWin(board, 'O');
}

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

function getTerminalScore(isWinPlayer, depth) {
  if (isWinPlayer()) {
    return 10 - depth;
  }
  return depth - 10;
}

function shouldEvaluateTerminal(isWinPlayer, isWinOpponent) {
  return isWinPlayer() || isWinOpponent();
}

function evaluateTerminalState(isWinPlayer, isWinOpponent, depth) {
  if (shouldEvaluateTerminal(isWinPlayer, isWinOpponent)) {
    return getTerminalScore(isWinPlayer, depth);
  }
  return null;
}

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

function simulateMoves(board, accumulateScores) {
  return getAvailableMoves(board).reduce(accumulateScores, []);
}

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

function selectScore(scores, isMax) {
  if (isMax) {
    return Math.max(...scores);
  } else {
    return Math.min(...scores);
  }
}

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

function hasValidPlayer({ move }) {
  return ['X', 'O'].includes(move.player);
}

function hasValidPosition({ move }) {
  const position = move.position;
  if (!isObject(position)) {
    return false;
  }
  const { row, column } = position;
  return isValidRowAndColumn(row, column);
}

function isValidRowAndColumn(row, column) {
  return [0, 1, 2].includes(row) && [0, 1, 2].includes(column);
}

function canMoveBeApplied(move, index, moves) {
  if (!isObject(move)) {
    return false;
  }
  return isMoveDetailsValid({ move, index, moves });
}

function isMoveDetailsValid(params) {
  const validators = [hasValidPlayer, hasValidPosition, respectsTurnOrder];
  return validators.every(fn => fn(params));
}

function isWin(board, player) {
  const checks = [checkRows, checkColumns, checkDiagonals];
  return checks.some(fn => fn(board, player));
}

function returnInitialOptimalMove() {
  // In an empty board, the optimal first move is the center
  const optimal = { player: 'X', position: { row: 1, column: 1 } };
  return JSON.stringify({ moves: [optimal] });
}
