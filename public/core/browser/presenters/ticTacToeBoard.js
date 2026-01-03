import { createPreFromContent } from './browserPresentersCore.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {Pick<DOMHelpers, 'createElement'|'setTextContent'>} PresenterDOMHelpers */

/**
 * @typedef {object} TicTacToePosition
 * @property {number} row - Zero-based row index inside the grid.
 * @property {number} column - Zero-based column index inside the grid.
 */

/**
 * @typedef {object} TicTacToeMove
 * @property {'X'|'O'} player - Symbol representing the player who made the move.
 * @property {TicTacToePosition} position - Grid coordinates for the move.
 */

/**
 * @typedef {Partial<TicTacToeMove>} TicTacToeMoveCandidate
 */

/**
 * @typedef {object} TicTacToeRenderData
 * @property {Array<TicTacToeMoveCandidate | null | undefined>} [moves] - Moves to replay in order.
 */

/**
 * @param {TicTacToeMoveCandidate | null | undefined} move - Candidate that might be absent.
 * @returns {move is TicTacToeMoveCandidate} Whether the move carries data.
 */
function isDefinedMove(move) {
  return Boolean(move);
}

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

/**
 * @typedef {object} TicTacToeValidatorArgs
 * @property {string} [player] - Candidate player symbol.
 * @property {TicTacToePosition} [position] - Candidate board coordinates.
 * @property {string[][]} board - Current board state used to validate the move.
 */

/**
 * Test whether a grid coordinate is within the 3×3 board.
 * @param {unknown} value - Coordinate to validate.
 * @returns {value is number} True when the value is a number between 0 and 2.
 */
function isValidCoordinate(value) {
  return typeof value === 'number' && [0, 1, 2].includes(value);
}

/**
 * Validate that the candidate position describes a board slot.
 * @param {TicTacToePosition | undefined} position - Candidate position.
 * @returns {position is TicTacToePosition} True when both row and column are provided.
 */
function isValidPosition(position) {
  if (!position) {
    return false;
  }
  return arePositionCoordinatesValid(position);
}

/**
 * @param {TicTacToePosition} position - Coordinates describing a slot.
 * @returns {boolean} True when row and column coordinates are valid.
 */
function arePositionCoordinatesValid(position) {
  return hasValidRow(position) && hasValidColumn(position);
}

/**
 * Does the provided position specify a valid row index?
 * @param {TicTacToePosition | undefined} position - Candidate position.
 * @returns {boolean} True when the row is 0, 1, or 2.
 */
function hasValidRow(position) {
  if (!position) {
    return false;
  }
  return isValidCoordinate(position.row);
}

/**
 * Does the provided position specify a valid column index?
 * @param {TicTacToePosition | undefined} position - Candidate position.
 * @returns {boolean} True when the column is 0, 1, or 2.
 */
function hasValidColumn(position) {
  if (!position) {
    return false;
  }
  return isValidCoordinate(position.column);
}

/**
 * Ensure the provided player symbol is either 'X' or 'O'.
 * @param {unknown} player - Candidate player symbol.
 * @returns {player is 'X' | 'O'} True when the symbol matches a legal player.
 */
function isValidPlayer(player) {
  return player === 'X' || player === 'O';
}

/**
 * Check if a board cell is still empty.
 * @param {TicTacToePosition} position - Position to inspect.
 * @param {string[][]} board - Current board state.
 * @returns {boolean} True when the cell contains a blank space.
 */
function isCellEmpty(position, board) {
  return board[position.row][position.column] === ' ';
}

/**
 * Validate that the move lands on an empty board cell.
 * @param {TicTacToeMoveCandidate} move - Move being applied.
 * @param {string[][]} board - Current board state.
 * @returns {boolean} True when the move targets a blank slot.
 */
function hasValidPositionWithEmptyCell(move, board) {
  const position = getPosition(move);
  if (!isValidPosition(position)) {
    return false;
  }
  return isCellEmpty(position, board);
}

/**
 * Determine if a move is legal.
 * @param {TicTacToeMoveCandidate} move - Move to validate.
 * @param {string[][]} board - Current board state.
 * @returns {move is TicTacToeMove} Whether the move can be applied.
 */
function isLegalMove(move, board) {
  const player = getPlayer(move);
  return hasValidPositionWithEmptyCell(move, board) && isValidPlayer(player);
}

/**
 * Update the board if the provided coordinates and player are valid.
 * @param {TicTacToeMove} moveDetails - Validated move details.
 * @param {string[][]} board - Board to update.
 * @returns {void}
 */
function updateBoardIfLegal(moveDetails, board) {
  board[moveDetails.position.row][moveDetails.position.column] =
    moveDetails.player;
}

/**
 * Apply a move to the board if it contains a valid position.
 * @param {TicTacToeMoveCandidate} move - Move to attempt.
 * @param {string[][]} board - Board to mutate.
 * @returns {void}
 */
function applyMove(move, board) {
  if (!isLegalMove(move, board)) {
    return;
  }

  updateBoardIfLegal(move, board);
}

/**
 * Create a DOM element representing a tic‑tac‑toe board.
 * @param {string} inputString - JSON encoded array of moves.
 * @param {PresenterDOMHelpers} dom - DOM abstraction used for creation and rendering.
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
 * @param {TicTacToeRenderData} data - Parsed moves object.
 * @param {PresenterDOMHelpers} dom - DOM abstraction for element creation.
 * @returns {HTMLElement} `<pre>` element representing the board.
 */
function renderTicTacToeBoardFromData(data, dom) {
  // 2. Initialise empty 3 × 3 grid
  const board = Array.from({ length: 3 }, () => Array(3).fill(' '));

  // 3. Apply each legal move (first–come, first-served)
  /** @type {TicTacToeMoveCandidate[]} */
  let moves = [];
  if (Array.isArray(data.moves)) {
    moves = /** @type {TicTacToeMoveCandidate[]} */ (
      data.moves.filter(isDefinedMove)
    );
  }
  moves.forEach(move => applyMove(move, board));

  // 4. Render board into a monospace grid
  const rowStrings = board.map(r => ` ${r[0]} | ${r[1]} | ${r[2]} `);
  const content = rowStrings.join('\n---+---+---\n');

  // 5. Package in a <pre> element
  return createPreFromContent(content, dom);
}

export { getPlayer, getPosition };
