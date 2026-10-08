/**
 * Create the shared rectangle payload used by browser canvas presenters.
 * @param {{x: number, y: number, width: number, height: number, fill: string}} shape Rectangle bounds and fill.
 * @returns {Record<string, unknown>} Rectangle shape payload.
 */
export function createRectShape(shape) {
  return createRectShapeFromBounds(
    [shape.x, shape.y, shape.width, shape.height],
    shape.fill
  );
}

/**
 * Create a rectangle payload from positional bounds.
 * @param {[number, number, number, number]} bounds Rectangle x, y, width, and height.
 * @param {string} fill Rectangle color.
 * @returns {Record<string, unknown>} Rectangle shape payload.
 */
export function createRectShapeFromBounds([x, y, width, height], fill) {
  return {
    type: 'rect',
    x,
    y,
    width,
    height,
    fill,
  };
}
