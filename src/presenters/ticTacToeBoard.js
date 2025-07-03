import { isObject } from '../utils/typeUtils.js';

/**
 * createTicTacToeBoardElement
 * ---------------------------
 * @param {string} inputString – JSON-encoded moves array
 * @param {object} dom         – abstraction with createElement / setTextContent
 * @returns {HTMLElement}      – <pre> (board) or <p> (error)
 */
function getPlayer(move) {
  return move?.player;
}

function getPosition(move) {
  return move?.position;
}

const moveValidators = [
  function positionIsObject({ position }) {
    return isObject(position);
  },
  function validPlayer({ player }) {
    return player === 'X' || player === 'O';
  },
  function validRow({ position }) {
    return typeof position.row === 'number' && [0, 1, 2].includes(position.row);
  },
  function validColumn({ position }) {
    return typeof position.column === 'number' && [0, 1, 2].includes(position.column);
  },
  function cellIsEmpty({ position, board }) {
    return board[position.row][position.column] === ' ';
  }
];

function isLegalMove(move, board) {
  const player = getPlayer(move);
  const position = getPosition(move);
  const args = { player, position, board };
  return moveValidators.every(fn => fn(args));
}

function updateBoardIfLegal(move, board) {
  if (isLegalMove(move, board)) {
    const { row, column } = getPosition(move);
    board[row][column] = getPlayer(move);
  }
}

function applyMove(move, board) {
  const position = getPosition(move);
  if (isObject(position)) {
    updateBoardIfLegal(move, board);
  }
}

export function createTicTacToeBoardElement(inputString, dom) {
  let data;

  // 1. Parse input safely
  try {
    data = JSON.parse(inputString);
  } catch {
    // On error, render an empty board (no moves)
    return renderTicTacToeBoardFromData({ moves: [] }, dom);
  }

  return renderTicTacToeBoardFromData(data, dom);
}

function renderTicTacToeBoardFromData(data, dom) {
  // 2. Initialise empty 3 × 3 grid
  const board = Array.from({ length: 3 }, () => Array(3).fill(' '));

  // 3. Apply each legal move (first–come, first-served)
  let moves;
  if (Array.isArray(data.moves)) {
    moves = data.moves.filter(Boolean);
  } else {
    moves = [];
  }
  moves.forEach(move => applyMove(move, board));

  // 4. Render board into a monospace grid
  const rowStrings = board.map(r => ` ${r[0]} | ${r[1]} | ${r[2]} `);
  const content = rowStrings.join('\n---+---+---\n');

  // 5. Package in a <pre> element
  const pre = dom.createElement('pre');
  dom.setTextContent(pre, content);
  return pre;
}

export { getPlayer, getPosition };
