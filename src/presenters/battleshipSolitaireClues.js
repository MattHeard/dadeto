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

function isObject(value) {
  return value && typeof value === 'object';
}

function hasValidClueArrays(obj) {
  return Array.isArray(obj.rowClues) && Array.isArray(obj.colClues);
}

function hasNonNumberValues(arr) {
  return arr.some(n => typeof n !== 'number');
}

function isEmpty(arr) {
  return arr.length === 0;
}

function getClueArrays(obj) {
  return [obj.rowClues, obj.colClues];
}

function validateCluesObject(obj) {
  const checks = [
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
  const found = checks.find(([predicate]) => predicate(obj));
  if (found) {
    return found[1];
  }
  return '';
}

function padLeft(numStr, width) {
  return numStr.padStart(width, ' ');
}

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

export function createBattleshipCluesBoardElement(inputString, dom) {
  let clues;
  let invalid = false;
  try {
    clues = JSON.parse(inputString);
  } catch {
    invalid = true;
  }
  if (!invalid) {
    const error = validateCluesObject(clues);
    if (error) {
      invalid = true;
    }
  }
  if (invalid) {
    clues = { rowClues: Array(10).fill(0), colClues: Array(10).fill(0) };
  }

  const { rowClues, colClues } = clues;
  const width = colClues.length;

  const rowPad = Math.max(...rowClues).toString().length;

  /* ---------- TOP COLUMN CLUES ---------- */
  const colLines = buildColumnDigitMatrix(colClues); // [maxDigits][width]
  const topClueLines = colLines.map(
    lineArr =>
      padLeft('', rowPad) + ' ' + lineArr.join(' ') + ' ' + padLeft('', rowPad)
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
