/*
 * Battleship Solitaire – Row/Column-Clue Generator
 * -----------------------------------------------
 * Toy signature:  generateClues(input: string): string
 *   input : JSON string of a { width, height, ships } object
 * Returns a JSON string of { rowClues: number[], colClues: number[] }  or { error }
 * @returns {*} - description
 */

import { safeParseJson, getFirstErrorMessage } from '../../browser-core.js';
import { buildErrorResult } from '../../../cloud/cloud-core.js';

/**
 *
 * @param {*} input - description
 * @returns {*} - description
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
 * @param {*} ship - description
 * @returns {*} - description
 */
function getShipCells(ship) {
  if (ship.direction === 'H') {
    return getHorizontalCells(ship);
  }
  return getVerticalCells(ship);
}

/**
 *
 * @param {*} ship - description
 * @returns {*} - description
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
 * @param {*} ship - description
 * @returns {*} - description
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
 * @param {*} position - description
 * @param {*} board - description
 * @param {*} clues - description
 * @returns {*} - description
 */
function incrementClues(position, board, clues) {
  if (isValidCell(position, board)) {
    clues.row[position.y] += 1;
    clues.col[position.x] += 1;
  }
}

/**
 *
 * @param {*} root0 - description
 * @param {*} root0.x - description
 * @param {*} root0.y - description
 * @param {*} board - description
 * @returns {*} - description
 */
function isValidCell({ x, y }, board) {
  return isValidX(x, board) && isValidY(y, board);
}

/**
 *
 * @param {*} x - description
 * @param {*} board - description
 * @returns {*} - description
 */
function isValidX(x, board) {
  return x >= 0 && x < board.width;
}

/**
 *
 * @param {*} y - description
 * @param {*} board - description
 * @returns {*} - description
 */
function isValidY(y, board) {
  return y >= 0 && y < board.height;
}

/**
 *
 * @param {*} input - description
 * @returns {*} - description
 */
function parseFleet(input) {
  const parseJsonValue = x => JSON.parse(x);
  const fleet = safeParseJson(input, parseJsonValue);
  const error = computeFleetError(fleet);
  const errorResult = buildErrorResult(error);
  if (errorResult) {
    return errorResult;
  }
  return fleet;
}

const fleetChecks = [
  [fleet => fleet === undefined, 'Invalid input JSON'],
  [fleet => !isValidFleet(fleet), 'Invalid fleet structure'],
];

/**
 *
 * @param {*} fleet - description
 * @returns {*} - description
 */
function computeFleetError(fleet) {
  return getFirstErrorMessage(fleetChecks, fleet);
}

/**
 *
 * @param {*} value - description
 * @returns {*} - description
 */
function isNumber(value) {
  return typeof value === 'number';
}

/**
 *
 * @param {*} fleet - description
 * @returns {*} - description
 */
function isValidFleet(fleet) {
  const { width, height, ships } = Object(fleet);
  return [width, height].every(isNumber) && Array.isArray(ships);
}

export { generateClues };
