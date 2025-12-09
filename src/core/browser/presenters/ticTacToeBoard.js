import { isObject } from '../common.js';
import { createPreFromContent } from './browserPresentersCore.js';

/**
 * Extract the player from a move object.
 * @param {{player?: string}} move - Move object that may contain a `player`.
 * @returns {string | undefined} The player symbol or `undefined`.
 */
function getPlayer(move) {
  return move?.player;
}

/**
 * Extract the position from a move object.
 * @param {{position?: {row: number, column: number}}} move - Move object.
 * @returns {{row: number, column: number} | undefined} Board coordinates.
 */
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
    return (
      typeof position.column === 'number' && [0, 1, 2].includes(position.column)
    );
  },
  function cellIsEmpty({ position, board }) {
    return board[position.row][position.column] === ' ';
  },
];

/**
 * Determine if a move is legal.
 * @param {{player?: string, position?: {row: number, column: number}}} move -
 * Move to validate.
 * @param {string[][]} board - Current board state.
 * @returns {boolean} Whether the move can be applied.
 */
function isLegalMove(move, board) {
  const player = getPlayer(move);
  const position = getPosition(move);
  const args = { player, position, board };
  return moveValidators.every(fn => fn(args));
}

/**
 * Update the board if the provided move is legal.
 * @param {{player?: string, position?: {row: number, column: number}}} move -
 * Candidate move.
 * @param {string[][]} board - Board to update.
 * @returns {void}
 */
function updateBoardIfLegal(move, board) {
  if (isLegalMove(move, board)) {
    const { row, column } = getPosition(move);
    board[row][column] = getPlayer(move);
  }
}

/**
 * Apply a move to the board if it contains a valid position.
 * @param {{player?: string, position?: {row: number, column: number}}} move -
 * Move to attempt.
 * @param {string[][]} board - Board to mutate.
 * @returns {void}
 */
function applyMove(move, board) {
  const position = getPosition(move);
  if (isObject(position)) {
    updateBoardIfLegal(move, board);
  }
}

/**
 * Create a DOM element representing a tic‑tac‑toe board.
 * @param {string} inputString - JSON encoded array of moves.
 * @param {{createElement: Function, setTextContent: Function}} dom - DOM
 * abstraction used for creation and rendering.
 * @returns {HTMLElement} `<pre>` containing the board layout.
 */
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

/**
 * Render a tic‑tac‑toe board from parsed data.
 * @param {{moves?: Array<object>}} data - Parsed moves object.
 * @param {{createElement: Function, setTextContent: Function}} dom - DOM
 * abstraction for element creation.
 * @returns {HTMLElement} `<pre>` element representing the board.
 */
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
  return createPreFromContent(content, dom);
}

export { getPlayer, getPosition };
