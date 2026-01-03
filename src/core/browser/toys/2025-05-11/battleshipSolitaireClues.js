/*
 * Battleship Solitaire – Row/Column-Clue Generator
 * -----------------------------------------------
 * Toy signature:  generateClues(input: string): string
 *   input : JSON string of a { width, height, ships } object
 * Returns a JSON string of { rowClues: number[], colClues: number[] }  or { error }
 * @returns {*} - description
 */

import { safeParseJson, getFirstErrorMessage } from '../../browser-core.js';
import { returnErrorResultOrValue } from '../../../cloud/cloud-core.js';

/**
 * @typedef {{ x: number, y: number }} BattleshipCoordinate
 * @typedef {{ direction: 'H' | 'V', length: number, start: BattleshipCoordinate }} BattleshipShip
 * @typedef {{ width: number, height: number, ships: BattleshipShip[] }} BattleshipFleet
 * @typedef {{ row: number[], col: number[] }} BattleshipClueBuffer
 * @typedef {{ width: number, height: number }} BattleshipBoard
 * @typedef {{ error?: string }} BattleshipErrorResult
 */

/**
 * Generate row and column clues for the provided fleet configuration.
 * @param {string} input - JSON string describing the fleet.
 * @returns {string} Row/column clue payload or error object.
 */
function generateClues(input) {
  const fleet = parseFleet(input);
  if ('error' in fleet) {
    return JSON.stringify({ error: fleet.error });
  }
  const { width, height, ships } = fleet;
  const clues = /** @type {BattleshipClueBuffer} */ ({
    row: Array(height).fill(0),
    col: Array(width).fill(0),
  });
  const board = /** @type {BattleshipBoard} */ ({ width, height });
  ships.forEach(ship => {
    getShipCells(ship).forEach(coord => {
      incrementClues(coord, board, clues);
    });
  });
  return JSON.stringify({ rowClues: clues.row, colClues: clues.col });
}

/**
 * Resolve every coordinate occupied by the ship.
 * @param {BattleshipShip} ship - Ship payload describing direction and length.
 * @returns {BattleshipCoordinate[]} Coordinates covering the ship.
 */
function getShipCells(ship) {
  if (ship.direction === 'H') {
    return getHorizontalCells(ship);
  }
  return getVerticalCells(ship);
}

/**
 * Return the horizontal coordinates for the provided ship.
 * @param {BattleshipShip} ship - Ship placed horizontally.
 * @returns {BattleshipCoordinate[]} Coordinates along the row.
 */
function getHorizontalCells(ship) {
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push({ x: ship.start.x + i, y: ship.start.y });
  }
  return cells;
}

/**
 * Return the vertical coordinates for the provided ship.
 * @param {BattleshipShip} ship - Ship placed vertically.
 * @returns {BattleshipCoordinate[]} Coordinates along the column.
 */
function getVerticalCells(ship) {
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push({ x: ship.start.x, y: ship.start.y + i });
  }
  return cells;
}

/**
 * Increase the clue counters when a ship segment is valid.
 * @param {BattleshipCoordinate} position - Ship segment coordinate.
 * @param {BattleshipBoard} board - Board dimensions.
 * @param {BattleshipClueBuffer} clues - Counters for rows/columns.
 * @returns {void}
 */
function incrementClues(position, board, clues) {
  if (isValidCell(position, board)) {
    clues.row[position.y] += 1;
    clues.col[position.x] += 1;
  }
}

/**
 * Validate that the coordinate lies inside the board.
 * @param {BattleshipCoordinate} coord - Candidate coordinate.
 * @param {BattleshipBoard} board - Board limits.
 * @returns {boolean} True when the coordinate is on the board.
 */
function isValidCell({ x, y }, board) {
  return isValidX(x, board) && isValidY(y, board);
}

/**
 * @param {number} x - Column index.
 * @param {BattleshipBoard} board - Board limits.
 * @returns {boolean} True when the column lies in range.
 */
function isValidX(x, board) {
  return x >= 0 && x < board.width;
}

/**
 * @param {number} y - Row index.
 * @param {BattleshipBoard} board - Board limits.
 * @returns {boolean} True when the row lies in range.
 */
function isValidY(y, board) {
  return y >= 0 && y < board.height;
}

/**
 * Parse the fleet JSON payload and guard against malformed input.
 * @param {string} input - JSON string describing the fleet.
 * @returns {BattleshipFleet | { error: string }} Parsed fleet or error descriptor.
 */
function parseFleet(input) {
  /** @type {(value: string) => BattleshipFleet} */
  const parseJsonValue = value => JSON.parse(value);
  const fleet = safeParseJson(input, parseJsonValue);
  const error = computeFleetError(fleet);
  return returnErrorResultOrValue(error, () => fleet);
}

const fleetChecks = [
  [fleet => fleet === undefined, 'Invalid input JSON'],
  [fleet => !isValidFleet(fleet), 'Invalid fleet structure'],
];

/**
 * Evaluate the fleet object against the configured checks.
 * @param {unknown} fleet - Candidate payload to validate.
 * @returns {string | null} Error message when invalid, null otherwise.
 */
function computeFleetError(fleet) {
  return getFirstErrorMessage(fleetChecks, fleet);
}

/**
 * Determine whether the candidate value is numeric.
 * @param {unknown} value - Candidate value.
 * @returns {value is number} True when the input is a number.
 */
function isNumber(value) {
  return typeof value === 'number';
}

/**
 * Validate the fleet structure extracted from parsed input.
 * @param {unknown} fleet - Candidate fleet payload.
 * @returns {fleet is BattleshipFleet} True when width, height, and ships are valid.
 */
function isValidFleet(fleet) {
  const { width, height, ships } = Object(fleet);
  return [width, height].every(isNumber) && Array.isArray(ships);
}

export { generateClues };
