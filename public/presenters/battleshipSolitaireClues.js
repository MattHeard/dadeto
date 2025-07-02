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

const VALIDATION_CHECKS = [
  [o => !o || typeof o !== 'object', 'Invalid JSON object'],
  [
    o => !Array.isArray(o.rowClues) || !Array.isArray(o.colClues),
    'Missing rowClues or colClues array',
  ],
  [
    o =>
      o.rowClues.some(n => typeof n !== 'number') ||
      o.colClues.some(n => typeof n !== 'number'),
    'Clue values must be numbers',
  ],
  [
    o => o.rowClues.length === 0 || o.colClues.length === 0,
    'rowClues and colClues must be non-empty',
  ],
];

function findValidationError(obj) {
  const found = VALIDATION_CHECKS.find(([pred]) => pred(obj));
  return found ? found[1] : '';
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
      rows[idx].push(ch === ' ' ? ' ' : ch);
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
    const error = findValidationError(clues);
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
