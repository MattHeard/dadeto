/**
 * createBattleshipCluesBoardElement
 * ---------------------------------
 * Renders a blank Battleship‑Solitaire grid with row/column clues.
 *
 * INPUT (stringified JSON):
 * {
 *   "rowClues": [5, 12, 3, ...],
 *   "colClues": [1, 9, 11, ...]
 * }
 *
 * OUTPUT: <pre> HTMLElement containing something like
 *
 *      1 2
 *    1 2 1
 *   5 · · · · 5
 *  12 · · · · 12
 *   3 · · · ·  3
 *      1 2
 *
 *  – Row clues shown left & right, padded to the widest row‑clue width
 *  – Column clues shown on top & bottom, stacked so lowest digit line
 *    (ones) is closest to the grid
 */

import { isObject } from '../browser/common.js';
import { safeParseJson } from '../utils/jsonUtils.js';

/**
 * Check that the given object has rowClues and colClues arrays.
 * @param {object} obj - Parsed JSON object.
 * @returns {boolean} True when both arrays are present.
 */
function hasValidClueArrays(obj) {
  return Array.isArray(obj.rowClues) && Array.isArray(obj.colClues);
}

/**
 * Determine if an array contains non-number values.
 * @param {Array} arr - Array to inspect.
 * @returns {boolean} True if any value is not a number.
 */
function hasNonNumberValues(arr) {
  return arr.some(n => typeof n !== 'number');
}

/**
 * Check whether an array is empty.
 * @param {Array} arr - Array to check.
 * @returns {boolean} True if the array has no items.
 */
function isEmpty(arr) {
  return arr.length === 0;
}

/**
 * Extract row and column clue arrays from the object.
 * @param {object} obj - Parsed clue object.
 * @returns {Array[]} A pair [rowClues, colClues].
 */
function getClueArrays(obj) {
  return [obj.rowClues, obj.colClues];
}

const VALIDATION_CHECKS = [
  [o => !isObject(o), 'Invalid JSON object'],
  [o => !hasValidClueArrays(o), 'Missing rowClues or colClues array'],
  [
    o => getClueArrays(o).some(hasNonNumberValues),
    'Clue values must be numbers',
  ],
  [
    o => getClueArrays(o).some(isEmpty),
    'rowClues and colClues must be non-empty',
  ],
];

/**
 * Return a validation error message for the clue object if any rule fails.
 * @param {object} obj - Parsed clue object.
 * @returns {string} Error message or empty string.
 */
function findValidationError(obj) {
  const found = VALIDATION_CHECKS.find(([predicate]) => predicate(obj));
  if (found) {
    return found[1];
  }
  return '';
}

/**
 * Pad a string of digits on the left to a fixed width.
 * @param {string} numStr - String of digits.
 * @param {number} width - Desired width.
 * @returns {string} Padded string.
 */
function padLeft(numStr, width) {
  return numStr.padStart(width, ' ');
}

const DEFAULT_CLUES = {
  rowClues: Array(10).fill(0),
  colClues: Array(10).fill(0),
};

const INVALID_CLUE_CHECKS = [
  obj => obj === null || obj === undefined,
  obj => Boolean(findValidationError(obj)),
];

/**
 * Build a matrix of digit strings for the column clues.
 * @param {number[]} colClues - Column clue values.
 * @returns {string[][]} Matrix of digits by line.
 */
function buildColumnDigitMatrix(colClues) {
  const maxDigits = Math.max(...colClues).toString().length;
  // top lines array of length maxDigits
  const rows = Array.from({ length: maxDigits }, () => []);
  colClues.forEach(clue => {
    const padded = padLeft(clue.toString(), maxDigits);
    [...padded].forEach((ch, idx) => {
      rows[idx].push(ch);
    });
  });
  return rows; // order: tens→ones (top→bottom)
}

/**
 * Parse JSON input and return clue object or default 10×10 grid clues.
 * @param {string} inputString - JSON configuration string.
 * @returns {{rowClues: number[], colClues: number[]}} Parsed clues object.
 */
function parseCluesOrDefault(inputString) {
  const obj = safeParseJson(inputString);
  if (INVALID_CLUE_CHECKS.some(fn => fn(obj))) {
    return DEFAULT_CLUES;
  }
  return obj;
}

/**
 * Build a preformatted Battleship-Solitaire clue board.
 * @param {string} inputString - JSON clue configuration.
 * @param {object} dom - DOM utilities.
 * @returns {HTMLElement} The generated <pre> element.
 */
export function createBattleshipCluesBoardElement(inputString, dom) {
  const clues = parseCluesOrDefault(inputString);

  const { rowClues, colClues } = clues;
  const width = colClues.length;

  const rowPad = Math.max(...rowClues).toString().length;

  /* ---------- TOP COLUMN CLUES ---------- */
  const colLines = buildColumnDigitMatrix(colClues); // [maxDigits][width]
  const topClueLines = colLines.map(
    lineArr =>
      `${padLeft('', rowPad)} ${lineArr.join(' ')} ${padLeft('', rowPad)}`
  );

  /* ---------- GRID WITH ROW CLUES ---------- */
  const makeDotRow = () => Array(width).fill('·').join(' ');
  const gridLines = rowClues.map(clue => {
    const clueStr = padLeft(clue.toString(), rowPad);
    return `${clueStr} ${makeDotRow()} ${clueStr}`;
  });

  /* ---------- BOTTOM COLUMN CLUES (same as top) ---------- */
  const bottomClueLines = [...topClueLines];

  /* ---------- ASSEMBLE CONTENT ---------- */
  const allLines = [...topClueLines, ...gridLines, ...bottomClueLines];
  const content = allLines.join('\n');

  const pre = dom.createElement('pre');
  dom.setTextContent(pre, content);
  return pre;
}
