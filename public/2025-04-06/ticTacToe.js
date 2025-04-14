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

function validateParsedMoves(parsed) {
  return parsed && typeof parsed === "object" && Array.isArray(parsed.moves)
    ? parsed.moves
    : null;
}

function parseInputSafely(input) {
  const parsed = tryParseJSON(input);
  return validateParsedMoves(parsed);
}

function shouldSkipMove(earlyWin, moves) {
  return earlyWin || moves.length >= 9;
}

function buildMoveResponse(moves, newMove = null) {
  const updatedMoves = newMove ? [...moves, newMove] : moves;
  return JSON.stringify({ moves: updatedMoves });
}

export function ticTacToeMove(input) {
  const moves = parseInputSafely(input);
  if (!moves) return returnInitialOptimalMove();

  const result = validateAndApplyMoves(moves);
  if (!result) return returnInitialOptimalMove();
  const { board, earlyWin } = result;
  if (shouldSkipMove(earlyWin, moves)) return buildMoveResponse(moves);

  const nextPlayer = determineNextPlayer(moves);
  const bestMove = findBestMove(board, nextPlayer, moves);
  const newMove = { player: nextPlayer, position: bestMove };
  return buildMoveResponse(moves, newMove);
}

function initializeBoardAndSeen() {
  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  const seen = new Set();
  return { board, seen };
}

function processMove(move, index, moves, board, seen) {
  if (!isValidMove(move, index, moves)) return false;
  if (!applyMoveToBoard(board, move, seen)) return false;
  return true;
}

function validateAndApplyMoves(moves) {
  if (!Array.isArray(moves) || moves.length > 9) return null;

  const { board, seen } = initializeBoardAndSeen();

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!processMove(move, i, moves, board, seen)) return null;

    if (checkEarlyWin(board)) {
      return { board, earlyWin: true };
    }
  }

  return { board, earlyWin: false };
}

function findBestMove(board, nextPlayer, moves) {
  let best = -Infinity;
  let bestMove = null;

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (!board[r][c]) {
        board[r][c] = nextPlayer;
        const score = minimax(board, 0, false, nextPlayer, moves);
        board[r][c] = null;
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
  if (moves.length === 0) return "X";
  return moves[moves.length - 1].player === "X" ? "O" : "X";
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
  if (seen.has(key)) return false;
  seen.add(key);

  board[row][column] = player;
  return true;
}

function evaluateTerminalState(board, player, opponent, depth, moves) {
  if (isWin(board, player)) return 10 - depth;
  if (isWin(board, opponent)) return depth - 10;
  if (depth + moves.length === 9) return 0;
  return null;
}

function getAvailableMoves(board) {
  const moves = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (!board[r][c]) moves.push([r, c]);
    }
  }
  return moves;
}

function minimax(board, depth, isMax, player, moves) {
  const opponent = player === "X" ? "O" : "X";
  const terminalScore = evaluateTerminalState(board, player, opponent, depth, moves);
  if (terminalScore !== null) return terminalScore;

  const scores = [];
  for (const [r, c] of getAvailableMoves(board)) {
    board[r][c] = isMax ? player : opponent;
    scores.push(minimax(board, depth + 1, !isMax, player, moves));
    board[r][c] = null;
  }
  return isMax ? Math.max(...scores) : Math.min(...scores);
}

function hasValidPlayer(player) {
  return ["X", "O"].includes(player);
}

function hasValidPosition(position) {
  if (!position || typeof position !== "object") return false;
  const { row, column } = position;
  return [0, 1, 2].includes(row) && [0, 1, 2].includes(column);
}

function isValidMove(move, index, moves) {
  if (!move || typeof move !== "object") return false;

  const { player, position } = move;
  if (!hasValidPlayer(player)) return false;
  if (!hasValidPosition(position)) return false;

  if (!respectsTurnOrder(index, player, moves)) return false;

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
