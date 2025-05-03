function getOpponent(player) {
  return player === "X" ? "O" : "X";
}

function tryParseJSON(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function respectsTurnOrder(index, player, moves) {
  return index === 0 || player !== moves[index - 1].player;
}

function isObject(val) {
  return typeof val === "object" && val !== null;
}

function getValidParsedMoves(parsed) {
  const isValid = isValidParsedMoves(parsed);
  return isValid ? parsed.moves : null;
}

function isValidParsedMoves(parsed) {
  const validators = [isObject, hasMovesArray];
  return validators.every(fn => fn(parsed));
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
  if (isInvalidMoves(moves)) {return returnInitialOptimalMove();}
  return handleValidMoves(moves);
}

function handleValidMoves(moves) {
  const { board, seen } = initializeBoardAndSeen();
  const result = applyMovesSequentially(moves, board, seen);
  if (!result.valid) {return returnInitialOptimalMove();}
  return handleValidAppliedMoves(moves, board, result);
}

function handleValidAppliedMoves(moves, board, result) {
  const earlyWin = result.earlyWin;

  if (shouldSkipMove(earlyWin, moves)) {return buildMoveResponseWithoutNewMove(moves);}

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

function isFalsyMoves(moves) {
  return !moves;
}

function isNotArrayMoves(moves) {
  return !Array.isArray(moves);
}

function isTooLongMoves(moves) {
  return moves && moves.length > 9;
}

function isInvalidMoves(moves) {
  const validators = [isFalsyMoves, isNotArrayMoves, isTooLongMoves];
  return validators.some(fn => fn(moves));
}

function processMove(move, index, moves, board, seen) {
  if (!isValidMove(move, index, moves)) {return false;}
  if (!applyMoveToBoard(board, move, seen)) {return false;}
  return true;
}

function applyMovesSequentially(moves, board, seen) {
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!processMove(move, i, moves, board, seen)) {return { valid: false };}
    if (checkEarlyWin(board)) {return { valid: true, earlyWin: true };}
  }
  return { valid: true, earlyWin: false };
}


function scoreMove(board, r, c, player, moves) {
  board[r][c] = player;
  const score = minimax(board, 0, false, player, moves);
  board[r][c] = null;
  return score;
}

function findBestMove(board, nextPlayer, moves) {
  let best = -Infinity;
  let bestMove = null;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (!board[r][c]) {
        const score = scoreMove(board, r, c, nextPlayer, moves);
        if (score > best) {
          best = score;
          bestMove = { row: r, column: c };
        }
      }
    }
  }

  return bestMove;
}

function determineNextPlayer(moves) {
  if (moves.length === 0) {return "X";}
  return getOpponent(moves[moves.length - 1].player);
}

function checkRows(board, player) {
  for (let i = 0; i < 3; i++) {
    if (board[i][0] === player && board[i][1] === player && board[i][2] === player) {
      return true;
    }
  }
  return false;
}

function checkColumns(board, player) {
  for (let i = 0; i < 3; i++) {
    if (board[0][i] === player && board[1][i] === player && board[2][i] === player) {
      return true;
    }
  }
  return false;
}

function checkDiagonals(board, player) {
  return (
    (board[0][0] === player && board[1][1] === player && board[2][2] === player) ||
    (board[0][2] === player && board[1][1] === player && board[2][0] === player)
  );
}

function checkEarlyWin(board) {
  return isWin(board, "X") || isWin(board, "O");
}

function applyMoveToBoard(board, move, seen) {
  const { player, position } = move;
  const { row, column } = position;

  const key = `${row},${column}`;
  if (seen.has(key)) {return false;}
  seen.add(key);

  board[row][column] = player;
  return true;
}

function evaluateTerminalState(board, player, opponent, depth, moves) {
  if (isWin(board, player)) {return 10 - depth;}
  if (isWin(board, opponent)) {return depth - 10;}

  return null;
}

function getAvailableMoves(board) {
  const moves = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (!board[r][c]) {moves.push([r, c]);}
    }
  }
  return moves;
}

function simulateMoves(board, depth, isMax, player, moves) {
  const scores = [];
  const opponent = getOpponent(player);
  for (const [r, c] of getAvailableMoves(board)) {
    board[r][c] = isMax ? player : opponent;
    scores.push(minimax(board, depth + 1, !isMax, player, moves));
    board[r][c] = null;
  }
  return scores;
}

function minimax(board, depth, isMax, player, moves) {
  const opponent = getOpponent(player);
  const terminalScore = evaluateTerminalState(board, player, opponent, depth, moves);
  if (terminalScore !== null) {return terminalScore;}

  const scores = simulateMoves(board, depth, isMax, player, moves);
  return isMax ? Math.max(...scores) : Math.min(...scores);
}

function hasValidPlayer(player) {
  return ["X", "O"].includes(player);
}

function hasValidPosition(position) {
  if (!position || typeof position !== "object") {return false;}
  const { row, column } = position;
  return [0, 1, 2].includes(row) && [0, 1, 2].includes(column);
}

function isValidMove(move, index, moves) {
  if (!move || typeof move !== "object") {return false;}

  const { player, position } = move;
  if (!hasValidPlayer(player)) {return false;}
  if (!hasValidPosition(position)) {return false;}

  if (!respectsTurnOrder(index, player, moves)) {return false;}

  return true;
}

function isWin(board, player) {
  return checkRows(board, player) || checkColumns(board, player) || checkDiagonals(board, player);
}

function returnInitialOptimalMove() {
  // In an empty board, the optimal first move is the center
  const optimal = { player: "X", position: { row: 1, column: 1 } };
  return JSON.stringify({ moves: [optimal] });
}
