/**
 * Project a solver snapshot into readable measurements for one cell.
 * Hydraulic head follows the solver's normalized convention: water volume
 * plus row depth, where positive vertical direction points down.
 * @param {import('./chronoflow.js').FluidState} fluid Current solver snapshot.
 * @param {number} cell Zero-based cell index.
 * @returns {{cell: number, row: number, depth: number, hydraulicHead: number, velocityX: number, velocityY: number, solid: boolean}} Selected-cell measurements.
 */
export function getCellReadout(fluid, cell) {
  if (
    !Number.isSafeInteger(cell) ||
    cell < 0 ||
    cell >= fluid.width * fluid.height
  ) {
    throw new RangeError('Inspected cell must be inside the fluid grid.');
  }
  const row = Math.floor(cell / fluid.width);
  return {
    cell: cell + 1,
    row,
    depth: fluid.volume[cell],
    hydraulicHead: fluid.volume[cell] + row,
    velocityX: fluid.velocityX[cell],
    velocityY: fluid.velocityY[cell],
    solid: fluid.solids[cell],
  };
}
