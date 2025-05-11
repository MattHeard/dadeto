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
  const rowClues = Array(height).fill(0);
  const colClues = Array(width).fill(0);
  ships.forEach(ship => {
    getShipCells(ship).forEach(([x, y]) => {
      incrementClues(x, y, width, height, rowClues, colClues);
    });
  });
  return JSON.stringify({ rowClues, colClues });
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


function incrementClues(x, y, width, height, rowClues, colClues) {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    rowClues[y] += 1;
    colClues[x] += 1;
  }
}

function parseFleet(input) {
  let fleet;
  try {
    fleet = JSON.parse(input);
  } catch {
    return { error: 'Invalid input JSON' };
  }
  const { width, height, ships } = fleet;
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Array.isArray(ships)
  ) {
    return { error: 'Invalid fleet structure' };
  }
  return fleet;
}

export { generateClues };