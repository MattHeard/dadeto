/*
 * Battleship Solitaire – Row/Column-Clue Generator
 * -----------------------------------------------
 * Toy signature:  generateClues(input: string): string
 *   input : JSON string of a { width, height, ships } object
 * Returns a JSON string of { rowClues: number[], colClues: number[] }  or { error }
 */

function generateClues(input) {
  const fleet = parseFleet(input);
  if (fleet.error) {return JSON.stringify({ error: fleet.error });}
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

function getShipCells(ship) {
  if (ship.direction === 'H') {return getHorizontalCells(ship);}
  return getVerticalCells(ship);
}

function getHorizontalCells(ship) {
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push([ship.start.x + i, ship.start.y]);
  }
  return cells;
}

function getVerticalCells(ship) {
  const cells = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push([ship.start.x, ship.start.y + i]);
  }
  return cells;
}


function incrementClues(position, board, clues) {
  if (isValidCell(position, board)) {
    const { x, y } = position;
    clues.row[y] += 1;
    clues.col[x] += 1;
  }
}

function isValidCell({ x, y }, board) {
  return isValidX(x, board) && isValidY(y, board);
}

function isValidX(x, board) {
  return x >= 0 && x < board.width;
}

function isValidY(y, board) {
  return y >= 0 && y < board.height;
}

function parseFleet(input) {
  let fleet;
  try {
    fleet = JSON.parse(input);
  } catch {
    return { error: 'Invalid input JSON' };
  }
  if (!isValidFleet(fleet)) {
    return { error: 'Invalid fleet structure' };
  }
  return fleet;
}

function isValidFleet(fleet) {
  return (
    typeof fleet?.width === 'number' &&
    typeof fleet?.height === 'number' &&
    Array.isArray(fleet?.ships)
  );
}

export { generateClues };