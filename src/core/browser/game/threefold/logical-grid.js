import { heightAtScale } from './spatial.js';

/** @typedef {{min: {x: number, y: number}, max: {x: number, y: number}}} ThreefoldPhysicalBounds */
/** @typedef {{id: string, bounds: ThreefoldPhysicalBounds}} ThreefoldGridEntity */
/** @typedef {{x: number, y: number, width: number, height: number}} ThreefoldCellBounds */
/** @typedef {{id: string, cellBounds: ThreefoldCellBounds}} ThreefoldProjectedEntity */

/**
 * Project one canonical physical footprint into integer cells at a requested
 * scale. World origin (0, 0) is the logical-grid origin. Each physical edge is
 * snapped to its nearest grid line; exact half-cell ties go toward positive
 * infinity. A footprint that quantizes to zero cells occupies one cell. The
 * projection is presentation data and never changes the supplied entity.
 * @param {ThreefoldGridEntity} entity Canonical world-space object.
 * @param {number} scale Requested THREEFOLD scale from -4 through +4.
 * @returns {ThreefoldProjectedEntity} Stable integer-cell footprint.
 */
export function projectEntity(entity, scale) {
  if (!entity || typeof entity !== 'object' || Array.isArray(entity))
    throw new TypeError('A logical-grid entity is required.');
  if (typeof entity.id !== 'string' || entity.id.length === 0)
    throw new TypeError('A logical-grid entity requires a stable identifier.');
  const bounds = entity.bounds;
  if (!bounds || typeof bounds !== 'object')
    throw new TypeError('A logical-grid entity requires physical bounds.');

  const coordinates = [
    bounds.min?.x,
    bounds.min?.y,
    bounds.max?.x,
    bounds.max?.y,
  ];
  if (!coordinates.every(Number.isFinite))
    throw new RangeError('Logical-grid bounds must be finite.');
  const [minX, minY, maxX, maxY] = /** @type {number[]} */ (coordinates);
  if (maxX <= minX || maxY <= minY)
    throw new RangeError('Logical-grid bounds must have positive area.');

  const cellSizeMeters = heightAtScale(scale);
  const left = snapGridLine(minX / cellSizeMeters);
  const top = snapGridLine(minY / cellSizeMeters);
  const right = snapGridLine(maxX / cellSizeMeters);
  const bottom = snapGridLine(maxY / cellSizeMeters);

  return {
    id: entity.id,
    cellBounds: {
      x: left,
      y: top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    },
  };
}

/**
 * Snap a scale-relative coordinate to the closest integer grid line.
 * `floor(value + 0.5)` makes exact ties resolve toward positive infinity.
 * @param {number} value Coordinate measured in logical cells.
 * @returns {number} Integer grid line.
 */
function snapGridLine(value) {
  return Math.floor(value + 0.5);
}
