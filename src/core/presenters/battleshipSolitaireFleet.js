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
/**
 * Validate that a fleet object has the required properties.
 * @param {object} fleet - Parsed fleet object.
 * @returns {string} Empty string if valid, otherwise an error message.
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
 * Place multiple ships onto the board.
 * @param {object} boardInfo - Contains board array and dimensions.
 * @param {object[]} ships - Array of ship objects.
 */
function placeShipsOnBoard(boardInfo, ships) {
  const placeShip = ship => placeSingleShipOnBoard(boardInfo, ship);
  ships.forEach(placeShip);
}

/**
 * Place a single ship on the board if it is well formed.
 * @param {object} boardInfo - Board data.
 * @param {object} ship - Ship specification.
 */
function placeSingleShipOnBoard(boardInfo, ship) {
  if (isMalformedShip(ship)) {
    return; // skip malformed
  }
  fillShipOnBoard(boardInfo, ship);
}

/**
 * Fill each cell for a ship on the board.
 * @param {object} boardInfo - Board data.
 * @param {object} ship - Ship specification.
 */
function fillShipOnBoard(boardInfo, ship) {
  Array.from({ length: ship.length }).forEach((_, i) => {
    fillShipCell(boardInfo, ship, i);
  });
}

/**
 * Mark an individual ship cell on the board.
 * @param {object} boardInfo - Board data.
 * @param {object} ship - Ship specification.
 * @param {number} i - Index within the ship.
 */
function fillShipCell(boardInfo, ship, i) {
  const x = getShipCellX(ship, i);
  const y = getShipCellY(ship, i);
  const coord = { x, y };
  markShipCellOnBoard(boardInfo, coord);
}

/**
 * Calculate the y coordinate for the i-th cell of a ship.
 * @param {object} ship - Ship specification.
 * @param {number} i - Index within the ship.
 * @returns {number} y coordinate on the board.
 */
function getShipCellY(ship, i) {
  if (ship.direction === 'V') {
    return ship.start.y + i;
  }
  return ship.start.y;
}

/**
 * Calculate the x coordinate for the i-th cell of a ship.
 * @param {object} ship - Ship specification.
 * @param {number} i - Index within the ship.
 * @returns {number} x coordinate on the board.
 */
function getShipCellX(ship, i) {
  if (ship.direction === 'H') {
    return ship.start.x + i;
  }
  return ship.start.x;
}

/**
 * Mark a board coordinate as containing a ship cell.
 * @param {object} boardInfo - Board data.
 * @param {{x:number, y:number}} coord - Coordinate to mark.
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
 * Determine whether a ship object is missing required fields.
 * @param {object} ship - Ship specification.
 * @returns {boolean} True if ship is malformed.
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
 * Check if a ship lacks a starting coordinate.
 * @param {object} ship - Ship specification.
 * @returns {boolean} True if start is missing.
 */
function isMissingStart(ship) {
  return !ship.start;
}

/**
 * Validate the start coordinates of a ship.
 * @param {object} ship - Ship specification.
 * @returns {boolean} True if coordinates are invalid.
 */
function isInvalidStartCoordinates(ship) {
  return typeof ship.start.x !== 'number' || typeof ship.start.y !== 'number';
}

/**
 * Check if a ship has a numeric length.
 * @param {object} ship - Ship specification.
 * @returns {boolean} True if length is invalid.
 */
function isInvalidLength(ship) {
  return typeof ship.length !== 'number';
}

/**
 * Validate a ship's direction property.
 * @param {object} ship - Ship specification.
 * @returns {boolean} True if direction is not 'H' or 'V'.
 */
function isInvalidDirection(ship) {
  return ship.direction !== 'H' && ship.direction !== 'V';
}

/**
 * Determine if a coordinate falls outside the board dimensions.
 * @param {{x:number,y:number}} coord - Board coordinate.
 * @param {{width:number,height:number}} dimensions - Board dimensions.
 * @returns {boolean} True if out of bounds.
 */
function isOutOfBounds(coord, dimensions) {
  return (
    isNegativeCoordinate(coord) ||
    isCoordinateExceedsDimensions(coord, dimensions)
  );
}

/**
 * Check for negative coordinate values.
 * @param {{x:number,y:number}} coord - Coordinate to check.
 * @returns {boolean} True if either x or y is negative.
 */
function isNegativeCoordinate(coord) {
  const { x, y } = coord;
  return x < 0 || y < 0;
}

/**
 * Check if a coordinate exceeds the board dimensions.
 * @param {{x:number,y:number}} coord - Coordinate to check.
 * @param {{width:number,height:number}} dimensions - Board dimensions.
 * @returns {boolean} True if coordinate is outside bounds.
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
/**
 * Render a fleet board from a JSON string description.
 * @param {string} inputString - JSON encoded fleet description.
 * @param {object} dom - DOM abstraction with createElement and setTextContent.
 * @returns {HTMLElement} <pre> element representing the board or a <p> error element.
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
 * Validate a parsed fleet and render it or an error element.
 * @param {object} fleet - Parsed fleet object.
 * @param {object} dom - DOM abstraction.
 * @returns {HTMLElement} Rendered fleet board or error message element.
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
 * Render a fleet board assuming the fleet is valid.
 * @param {object} fleet - Fleet data.
 * @param {object} dom - DOM abstraction.
 * @returns {HTMLElement} Preformatted board element.
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
