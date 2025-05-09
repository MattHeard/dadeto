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

function placeShipsOnBoard(boardInfo, ships) {
  const placeShip = ship => placeSingleShipOnBoard(boardInfo, ship);
  ships.forEach(placeShip);
}

function placeSingleShipOnBoard(boardInfo, ship) {
  if (isMalformedShip(ship)) {
    return; // skip malformed
  }
  fillShipOnBoard(boardInfo, ship);

}

function fillShipOnBoard(boardInfo, ship) {
  Array.from({ length: ship.length }).forEach((_, i) => {
    fillShipCell(boardInfo, ship, i);
  });

}


function fillShipCell(boardInfo, ship, i) {
  const { board, dimensions } = boardInfo;
  const x = getShipCellX(ship, i);
  const y = getShipCellY(ship, i);
  const coord = { x, y };
  markShipCellOnBoard(board, coord, dimensions);
}

function getShipCellY(ship, i) {
  if (ship.direction === 'V') {
    return ship.start.y + i;
  }
  return ship.start.y;
}

function getShipCellX(ship, i) {
  if (ship.direction === 'H') {
    return ship.start.x + i;
  }
  return ship.start.x;
}

function markShipCellOnBoard(board, coord, dimensions) {
  const { x, y } = coord;
  const { width, height } = dimensions;
  if (isOutOfBounds(x, y, width, height)) {
    return;
  }
  board[y][x] = '#';
}

function isMalformedShip(ship) {
  const validators = [
    isMissingStart,
    isInvalidStartCoordinates,
    isInvalidLength,
    isInvalidDirection,
  ];
  return validators.some(validator => validator(ship));
}

function isMissingStart(ship) {
  return !ship.start;
}

function isInvalidStartCoordinates(ship) {
  return typeof ship.start.x !== 'number' || typeof ship.start.y !== 'number';
}

function isInvalidLength(ship) {
  return typeof ship.length !== 'number';
}

function isInvalidDirection(ship) {
  return ship.direction !== 'H' && ship.direction !== 'V';
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
  const dimensions = { width, height };
  const boardInfo = { board, dimensions };

  // 3. Place ships – mark with '#'
  placeShipsOnBoard(boardInfo, fleet.ships);

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

