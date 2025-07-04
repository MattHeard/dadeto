/*
 * Battleship Solitaire – Row/Column-Clue Generator
 * -----------------------------------------------
 * Toy signature:  generateClues(input: string): string
 *   input : JSON string of a { width, height, ships } object
 * Returns a JSON string of { rowClues: number[], colClues: number[] }  or { error }
 */

import { safeParseJson } from '../../utils/jsonUtils.js';

/**
 *
 * @param input
 */
function generateClues(input) {
  const fleet = parseFleet(input);
  if (fleet.error) {
    return JSON.stringify({ error: fleet.error });
  }
  const { width, height, ships } = fleet;
  const clues = { row: Array(height).fill(0), col: Array(width).fill(0) };
  const board = { width, height };
  ships.forEach(ship => {
    getShipCells(ship).forEach(([x, y]) => {
      incrementClues({ x, y }, board, clues);
    });
  });
  return JSON.stringify({ rowClues: clues.row, colClues: clues.col });
}

/**
 *
 * @param ship
 */
function getShipCells(ship) {
  if (ship.direction === 'H') {
    return getHorizontalCells(ship);
  }
  return getVerticalCells(ship);
}

/**
 *
 * @param ship
 */
function getHorizontalCells(ship) {
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push([ship.start.x + i, ship.start.y]);
  }
  return cells;
}

/**
 *
 * @param ship
 */
function getVerticalCells(ship) {
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push([ship.start.x, ship.start.y + i]);
  }
  return cells;
}

/**
 *
 * @param position
 * @param board
 * @param clues
 */
function incrementClues(position, board, clues) {
  if (isValidCell(position, board)) {
    clues.row[position.y] += 1;
    clues.col[position.x] += 1;
  }
}

/**
 *
 * @param root0
 * @param root0.x
 * @param root0.y
 * @param board
 */
function isValidCell({ x, y }, board) {
  return isValidX(x, board) && isValidY(y, board);
}

/**
 *
 * @param x
 * @param board
 */
function isValidX(x, board) {
  return x >= 0 && x < board.width;
}

/**
 *
 * @param y
 * @param board
 */
function isValidY(y, board) {
  return y >= 0 && y < board.height;
}

/**
 *
 * @param input
 */
function parseFleet(input) {
  const fleet = safeParseJson(input);
  const error = computeFleetError(fleet);
  if (error) {
    return { error };
  }
  return fleet;
}

const fleetChecks = [
  [fleet => fleet === undefined, 'Invalid input JSON'],
  [fleet => !isValidFleet(fleet), 'Invalid fleet structure'],
];

/**
 *
 * @param fleet
 */
function computeFleetError(fleet) {
  const found = fleetChecks.find(([predicate]) => predicate(fleet));
  if (found) {
    return found[1];
  }
  return '';
}

/**
 *
 * @param value
 */
function isNumber(value) {
  return typeof value === 'number';
}

/**
 *
 * @param fleet
 */
function isValidFleet(fleet) {
  const { width, height, ships } = Object(fleet);
  return [width, height].every(isNumber) && Array.isArray(ships);
}

export { generateClues };
