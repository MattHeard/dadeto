/**
 * createTicTacToeBoardElement
 * ---------------------------
 * @param {string} inputString – JSON-encoded moves array
 * @param {object} dom         – abstraction with createElement / setTextContent
 * @returns {HTMLElement}      – <pre> (board) or <p> (error)
 */
export function createTicTacToeBoardElement(inputString, dom) {
  let data;

  // 1. Parse input safely
  try {
    data = JSON.parse(inputString);
  } catch (_) {
    const errEl = dom.createElement('p');
    dom.setTextContent(errEl, 'Invalid JSON'); // 🛑
    return errEl;
  }

  // 2. Initialise empty 3 × 3 grid
  const board = Array.from({ length: 3 }, () => Array(3).fill(' '));

  // 3. Apply each legal move (first–come, first-served)
  (data.moves ?? []).forEach(({ player, position } = {}) => {
    const { row, column } = position ?? {};
    if (
      (player === 'X' || player === 'O') &&
        [0, 1, 2].includes(row) &&
        [0, 1, 2].includes(column) &&
        board[row][column] === ' '
    ) {
      board[row][column] = player;
    }
  });

  // 4. Render board into a monospace grid
  const rowStrings = board.map(r => ` ${r[0]} | ${r[1]} | ${r[2]} `);
  const content = rowStrings.join('\n---+---+---\n');

  // 5. Package in a <pre> element
  const pre = dom.createElement('pre');
  dom.setTextContent(pre, content);
  return pre;
}