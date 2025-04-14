export function ticTacToeMove(input) {
  try {
    const parsed = JSON.parse(input);
    const { moves } = parsed;
    const result = validateAndApplyMoves(moves);
    if (!result) return returnInitialOptimalMove();
    const { board, earlyWin } = result;
    if (earlyWin) return JSON.stringify({ moves });

    if (moves.length >= 9) return JSON.stringify({ moves });

    const nextPlayer = moves.length === 0
      ? "X"
      : moves[moves.length - 1].player === "X" ? "O" : "X";

    function minimax(b, depth, isMax, player) {
      const opp = player === "X" ? "O" : "X";
      if (isWin(b, player)) return 10 - depth;
      if (isWin(b, opp)) return depth - 10;
      if (depth + moves.length === 9) return 0;

      const scores = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (!b[r][c]) {
            b[r][c] = isMax ? player : opp;
            scores.push(minimax(b, depth + 1, !isMax, player));
            b[r][c] = null;
          }
        }
      }
      return isMax ? Math.max(...scores) : Math.min(...scores);
    }

    let best = -Infinity;
    let bestMove = null;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!board[r][c]) {
          board[r][c] = nextPlayer;
          const score = minimax(board, 0, false, nextPlayer);
          board[r][c] = null;
          if (score > best) {
            best = score;
            bestMove = { row: r, column: c };
          }
        }
      }
    }

    const newMove = { player: nextPlayer, position: bestMove };
    return JSON.stringify({ moves: [...moves, newMove] });
  } catch {
    return returnInitialOptimalMove();
  }
}

function validateAndApplyMoves(moves) {
  if (!Array.isArray(moves) || moves.length > 9) return null;

  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  const seen = new Set();

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (!move || typeof move !== "object") return null;

    const { player, position } = move;
    if (!["X", "O"].includes(player)) return null;
    if (!position || typeof position !== "object") return null;

    const { row, column } = position;
    if (![0, 1, 2].includes(row) || ![0, 1, 2].includes(column)) return null;

    const key = `${row},${column}`;
    if (seen.has(key)) return null;
    seen.add(key);

    board[row][column] = player;

    if (i > 0 && player === moves[i - 1].player) return null;

    if (isWin(board, "X") || isWin(board, "O")) {
      return { board, earlyWin: true };
    }
  }

  return { board, earlyWin: false };
}

function isWin(b, p) {
  for (let i = 0; i < 3; i++) {
    if (b[i][0] === p && b[i][1] === p && b[i][2] === p) return true;
    if (b[0][i] === p && b[1][i] === p && b[2][i] === p) return true;
  }
  if (b[0][0] === p && b[1][1] === p && b[2][2] === p) return true;
  if (b[0][2] === p && b[1][1] === p && b[2][0] === p) return true;
  return false;
}

function returnInitialOptimalMove() {
  // In an empty board, the optimal first move is the center
  const optimal = { player: "X", position: { row: 1, column: 1 } };
  return JSON.stringify({ moves: [optimal] });
}
