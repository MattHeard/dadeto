/**
 * createBattleshipFleetBoardElement
 * ---------------------------------
 * Renders a Battleship-Solitaire fleet into a monospace text grid.
 *
 * @param {string} inputString – JSON-encoded RevealedBattleshipFleet
 * @param {object} dom         – abstraction with createElement / setTextContent
 * @returns {HTMLElement}      – <pre> element (board) or <p> element (error)
 *
 * Fleet JSON shape:
 * {
 *   "width": 6,
 *   "height": 6,
 *   "ships": [
 *     { "start": { "x": 0, "y": 1 }, "length": 4, "direction": "H" },
 *     ...
 *   ]
 * }
 */
export function createBattleshipFleetBoardElement(inputString, dom) {
    let fleet;
  
    // 1. Parse input safely
    try {
      fleet = JSON.parse(inputString);
    } catch {
      const err = dom.createElement('p');
      dom.setTextContent(err, 'Invalid JSON');
      return err;
    }
  
    const { width, height, ships } = fleet ?? {};
    if (
      typeof width !== 'number' || typeof height !== 'number' ||
      !Array.isArray(ships)
    ) {
      const err = dom.createElement('p');
      dom.setTextContent(err, 'Invalid fleet structure');
      return err;
    }
  
    // 2. Initialise empty grid with water symbols
    const board = Array.from({ length: height }, () =>
      Array(width).fill('\u00b7') // middle-dot
    );
  
    // 3. Place ships – mark with '#'
    for (const ship of ships) {
      const { start, length, direction } = ship ?? {};
      if (
        !start || typeof start.x !== 'number' || typeof start.y !== 'number' ||
        typeof length !== 'number' || (direction !== 'H' && direction !== 'V')
      ) {
        continue; // skip malformed
      }
  
      for (let i = 0; i < length; i++) {
        const x = direction === 'H' ? start.x + i : start.x;
        const y = direction === 'V' ? start.y + i : start.y;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        board[y][x] = '#';
      }
    }
  
    // 4. Convert to string
    const rowStrings = board.map(row => row.join(' '));
    const content = rowStrings.join('\n');
  
    // 5. Wrap in <pre>
    const pre = dom.createElement('pre');
    dom.setTextContent(pre, content);
    return pre;
  }
  