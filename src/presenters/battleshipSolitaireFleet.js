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
function validateFleetObject(fleet) {
  const validators = [
    [f => typeof f.width !== 'number', 'Missing or invalid property: width'],
    [f => typeof f.height !== 'number', 'Missing or invalid property: height'],
    [f => !Array.isArray(f.ships), 'Missing or invalid property: ships'],
    [() => true, ''],
  ];
  const found = validators.find(([validator]) => validator(fleet));
  return found[1];
}

function placeShipsOnBoard(boardInfo, fleet) {
  const { ships } = fleet;
  ships.forEach(ship => {
    placeSingleShipOnBoard(boardInfo, ship);
  });
}

function placeSingleShipOnBoard(boardInfo, ship) {
  const { board, width, height } = boardInfo;
  if (isMalformedShip(ship)) {
    return; // skip malformed
  }
  for (let i = 0; i < ship.length; i++) {
    let x, y;
    if (ship.direction === 'H') {
      x = ship.start.x + i;
    } else {
      x = ship.start.x;
    }
    if (ship.direction === 'V') {
      y = ship.start.y + i;
    } else {
      y = ship.start.y;
    }
    if (isOutOfBounds(x, y, width, height)) { continue; }
    board[y][x] = '#';
  }
}

function isMalformedShip(ship) {
  const { start, length, direction } = ship;
  return (
    !start || typeof start.x !== 'number' || typeof start.y !== 'number' ||
    typeof length !== 'number' || (direction !== 'H' && direction !== 'V')
  );
}

function isOutOfBounds(x, y, width, height) {
  return x < 0 || y < 0 || x >= width || y >= height;
}

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

  const errorMsg = validateFleetObject(fleet);
  if (errorMsg) {
    const err = dom.createElement('p');
    dom.setTextContent(err, errorMsg);
    return err;
  }
  return renderFleetBoard(fleet, dom);
}

function renderFleetBoard(fleet, dom) {
  const { width, height } = fleet;
  // 2. Initialise empty grid with water symbols
  const createWaterRow = () => Array(width).fill('\u00b7');
  const board = Array.from({ length: height }, createWaterRow);
  const boardInfo = { board, width, height };

  // 3. Place ships – mark with '#'
  placeShipsOnBoard(boardInfo, fleet);

  // 4. Convert to string
  const formatRow = row => row.join(' ');
  const joinRows = rows => rows.join('\n');
  const rowStrings = board.map(formatRow);
  const content = joinRows(rowStrings);

  // 5. Wrap in <pre>
  const pre = dom.createElement('pre');
  dom.setTextContent(pre, content);
  return pre;
}

