/**
 * createBattleshipFleetBoardElement
 * ---------------------------------
 * Renders a Battleship-Solitaire fleet into a monospace text grid.
 * @param {string} inputString – JSON-encoded RevealedBattleshipFleet
 * @param {object} dom         – abstraction with createElement / setTextContent
 * @param fleet
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

/**
 *
 * @param boardInfo
 * @param ships
 */
function placeShipsOnBoard(boardInfo, ships) {
  const placeShip = ship => placeSingleShipOnBoard(boardInfo, ship);
  ships.forEach(placeShip);
}

/**
 *
 * @param boardInfo
 * @param ship
 */
function placeSingleShipOnBoard(boardInfo, ship) {
  if (isMalformedShip(ship)) {
    return; // skip malformed
  }
  fillShipOnBoard(boardInfo, ship);
}

/**
 *
 * @param boardInfo
 * @param ship
 */
function fillShipOnBoard(boardInfo, ship) {
  Array.from({ length: ship.length }).forEach((_, i) => {
    fillShipCell(boardInfo, ship, i);
  });
}

/**
 *
 * @param boardInfo
 * @param ship
 * @param i
 */
function fillShipCell(boardInfo, ship, i) {
  const x = getShipCellX(ship, i);
  const y = getShipCellY(ship, i);
  const coord = { x, y };
  markShipCellOnBoard(boardInfo, coord);
}

/**
 *
 * @param ship
 * @param i
 */
function getShipCellY(ship, i) {
  if (ship.direction === 'V') {
    return ship.start.y + i;
  }
  return ship.start.y;
}

/**
 *
 * @param ship
 * @param i
 */
function getShipCellX(ship, i) {
  if (ship.direction === 'H') {
    return ship.start.x + i;
  }
  return ship.start.x;
}

/**
 *
 * @param boardInfo
 * @param coord
 */
function markShipCellOnBoard(boardInfo, coord) {
  const { board, dimensions } = boardInfo;
  if (isOutOfBounds(coord, dimensions)) {
    return;
  }
  const { x, y } = coord;
  board[y][x] = '#';
}

/**
 *
 * @param ship
 */
function isMalformedShip(ship) {
  const validators = [
    isMissingStart,
    isInvalidStartCoordinates,
    isInvalidLength,
    isInvalidDirection,
  ];
  return validators.some(validator => validator(ship));
}

/**
 *
 * @param ship
 */
function isMissingStart(ship) {
  return !ship.start;
}

/**
 *
 * @param ship
 */
function isInvalidStartCoordinates(ship) {
  return typeof ship.start.x !== 'number' || typeof ship.start.y !== 'number';
}

/**
 *
 * @param ship
 */
function isInvalidLength(ship) {
  return typeof ship.length !== 'number';
}

/**
 *
 * @param ship
 */
function isInvalidDirection(ship) {
  return ship.direction !== 'H' && ship.direction !== 'V';
}

/**
 *
 * @param coord
 * @param dimensions
 */
function isOutOfBounds(coord, dimensions) {
  return (
    isNegativeCoordinate(coord) ||
    isCoordinateExceedsDimensions(coord, dimensions)
  );
}

/**
 *
 * @param coord
 */
function isNegativeCoordinate(coord) {
  const { x, y } = coord;
  return x < 0 || y < 0;
}

/**
 *
 * @param coord
 * @param dimensions
 */
function isCoordinateExceedsDimensions(coord, dimensions) {
  const { x, y } = coord;
  const { width, height } = dimensions;
  return x >= width || y >= height;
}

/**
 *
 * @param inputString
 * @param dom
 */
export function createBattleshipFleetBoardElement(inputString, dom) {
  let fleet;
  // 1. Parse input safely
  try {
    fleet = JSON.parse(inputString);
  } catch {
    // On error, render a default empty fleet
    return handleParsedFleet({ width: 10, height: 10, ships: [] }, dom);
  }
  return handleParsedFleet(fleet, dom);
}

/**
 *
 * @param fleet
 * @param dom
 */
function handleParsedFleet(fleet, dom) {
  const errorMsg = validateFleetObject(fleet);
  if (errorMsg) {
    const err = dom.createElement('p');
    dom.setTextContent(err, errorMsg);
    return err;
  }
  return renderFleetBoard(fleet, dom);
}

/**
 *
 * @param fleet
 * @param dom
 */
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
