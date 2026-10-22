import { heightAtScale } from './spatial.js';

/** @typedef {{min: {x: number, y: number}, max: {x: number, y: number}}} ThreefoldPhysicalBounds */
/** @typedef {{id: string, bounds: ThreefoldPhysicalBounds, parentId?: string, overlapGroupId?: string}} ThreefoldGridEntity */
/** @typedef {{x: number, y: number, width: number, height: number}} ThreefoldCellBounds */
/** @typedef {{id: string, cellBounds: ThreefoldCellBounds}} ThreefoldProjectedEntity */
/** @typedef {{id: string, cellBounds: ThreefoldCellBounds, parentId?: string, overlapGroupId?: string, placement: 'placed'|'unresolved'|'overflow'}} ThreefoldLayoutEntity */
/** @typedef {{scale: number, entities: ThreefoldLayoutEntity[], containments: Array<{parentId: string, childId: string, cellBounds: ThreefoldCellBounds}>, intentionalOverlaps: Array<{groupId: string, entityIds: [string, string], cellBounds: ThreefoldCellBounds}>, conflicts: Array<{type: 'unresolved-overlap', entityIds: [string, string], cellBounds: ThreefoldCellBounds}>, relationshipIssues: Array<{type: 'child-not-contained', parentId: string, childId: string}>, overflow: Array<{entityId: string, cellBounds: ThreefoldCellBounds}>}} ThreefoldSceneLayout */

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

/**
 * Project and classify a scene without moving, hiding, or merging its canonical
 * entities. Unrelated footprints that collide become explicit unresolved
 * conflicts. Only authored containment and shared overlap-group identities
 * permit an overlap. A supplied viewport reports every footprint not wholly
 * contained by its integer-cell bounds as overflow.
 * @param {ThreefoldGridEntity[]} entities Canonical entities in any input order.
 * @param {number} scale Requested THREEFOLD scale from -4 through +4.
 * @param {ThreefoldCellBounds} [viewport] Optional finite logical-cell capacity.
 * @returns {ThreefoldSceneLayout} Stable layout, relationships, conflicts, and overflow.
 */
export function layoutScene(entities, scale, viewport) {
  if (!Array.isArray(entities))
    throw new TypeError('Logical-grid scene entities must be an array.');
  if (viewport !== undefined) assertCellBounds(viewport, 'viewport');

  const projected = entities.map(entity => ({
    source: entity,
    ...projectEntity(entity, scale),
  }));
  projected.sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  );
  const byId = new Map();
  for (const entity of projected) {
    if (byId.has(entity.id))
      throw new RangeError(`Duplicate logical-grid entity: ${entity.id}`);
    byId.set(entity.id, entity);
  }

  validateRelationships(projected, byId);

  const containments = /** @type {ThreefoldSceneLayout['containments']} */ ([]);
  const intentionalOverlaps =
    /** @type {ThreefoldSceneLayout['intentionalOverlaps']} */ ([]);
  const conflicts = /** @type {ThreefoldSceneLayout['conflicts']} */ ([]);
  const relationshipIssues =
    /** @type {ThreefoldSceneLayout['relationshipIssues']} */ ([]);
  const overflow = [];
  const unresolvedIds = new Set();
  const overflowIds = new Set();

  for (const child of projected) {
    if (child.source.parentId === undefined) continue;
    const parent = byId.get(child.source.parentId);
    if (containsCellBounds(parent.cellBounds, child.cellBounds))
      containments.push({
        parentId: parent.id,
        childId: child.id,
        cellBounds: child.cellBounds,
      });
    else {
      relationshipIssues.push({
        type: 'child-not-contained',
        parentId: parent.id,
        childId: child.id,
      });
      unresolvedIds.add(parent.id);
      unresolvedIds.add(child.id);
    }
  }

  const overlaps = classifyOverlaps(projected);
  intentionalOverlaps.push(...overlaps.intentionalOverlaps);
  conflicts.push(...overlaps.conflicts);
  overlaps.unresolvedIds.forEach(id => unresolvedIds.add(id));

  if (viewport !== undefined) {
    for (const entity of projected) {
      if (containsCellBounds(viewport, entity.cellBounds)) continue;
      overflow.push({ entityId: entity.id, cellBounds: entity.cellBounds });
      overflowIds.add(entity.id);
    }
  }

  return {
    scale,
    entities: projected.map(entity => ({
      id: entity.id,
      cellBounds: entity.cellBounds,
      ...(entity.source.parentId === undefined
        ? {}
        : { parentId: entity.source.parentId }),
      ...(entity.source.overlapGroupId === undefined
        ? {}
        : { overlapGroupId: entity.source.overlapGroupId }),
      placement: overflowIds.has(entity.id)
        ? 'overflow'
        : unresolvedIds.has(entity.id)
          ? 'unresolved'
          : 'placed',
    })),
    containments,
    intentionalOverlaps,
    conflicts,
    relationshipIssues,
    overflow,
  };
}

/**
 * Validate authored relationship identifiers after every entity is indexed.
 * @param {Array<{id: string, source: ThreefoldGridEntity, cellBounds: ThreefoldCellBounds}>} projected Indexed scene entities.
 * @param {Map<string, {id: string, source: ThreefoldGridEntity, cellBounds: ThreefoldCellBounds}>} byId Identity lookup.
 */
function validateRelationships(projected, byId) {
  for (const entity of projected) {
    const { parentId, overlapGroupId } = entity.source;
    if (parentId !== undefined) {
      if (typeof parentId !== 'string' || parentId.length === 0)
        throw new TypeError(
          'A logical-grid parent requires a stable identifier.'
        );
      if (parentId === entity.id || !byId.has(parentId))
        throw new RangeError(`Logical-grid parent is unavailable: ${parentId}`);
    }
    if (
      overlapGroupId !== undefined &&
      (typeof overlapGroupId !== 'string' || overlapGroupId.length === 0)
    )
      throw new TypeError('An overlap group requires a stable identifier.');
  }
}

/**
 * Classify each intersecting pair as authored overlap or unresolved conflict.
 * @param {Array<{id: string, source: ThreefoldGridEntity, cellBounds: ThreefoldCellBounds}>} projected Sorted scene entities.
 * @returns {{intentionalOverlaps: Array<{groupId: string, entityIds: [string, string], cellBounds: ThreefoldCellBounds}>, conflicts: Array<{type: 'unresolved-overlap', entityIds: [string, string], cellBounds: ThreefoldCellBounds}>, unresolvedIds: Set<string>}} Pair classifications.
 */
function classifyOverlaps(projected) {
  const intentionalOverlaps =
    /** @type {ThreefoldSceneLayout['intentionalOverlaps']} */ ([]);
  const conflicts = /** @type {ThreefoldSceneLayout['conflicts']} */ ([]);
  const unresolvedIds = new Set();
  for (let leftIndex = 0; leftIndex < projected.length; leftIndex += 1) {
    const left = projected[leftIndex];
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < projected.length;
      rightIndex += 1
    ) {
      const right = projected[rightIndex];
      const sharedCells = intersectCellBounds(
        left.cellBounds,
        right.cellBounds
      );
      if (!sharedCells) continue;
      if (
        left.source.parentId === right.id ||
        right.source.parentId === left.id
      )
        continue;
      if (
        left.source.overlapGroupId !== undefined &&
        left.source.overlapGroupId === right.source.overlapGroupId
      ) {
        intentionalOverlaps.push({
          groupId: left.source.overlapGroupId,
          entityIds: [left.id, right.id],
          cellBounds: sharedCells,
        });
        continue;
      }
      conflicts.push({
        type: 'unresolved-overlap',
        entityIds: [left.id, right.id],
        cellBounds: sharedCells,
      });
      unresolvedIds.add(left.id);
      unresolvedIds.add(right.id);
    }
  }
  return { intentionalOverlaps, conflicts, unresolvedIds };
}

/**
 * Validate one positive integer-cell rectangle.
 * @param {ThreefoldCellBounds} bounds Candidate cell rectangle.
 * @param {string} label Error context.
 */
function assertCellBounds(bounds, label) {
  if (!bounds || typeof bounds !== 'object')
    throw new TypeError(`Logical-grid ${label} is required.`);
  if (
    !Number.isInteger(bounds.x) ||
    !Number.isInteger(bounds.y) ||
    !Number.isInteger(bounds.width) ||
    !Number.isInteger(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  )
    throw new RangeError(
      `Logical-grid ${label} must use positive integer cells.`
    );
}

/**
 * Return whether a cell rectangle fully contains another one.
 * @param {ThreefoldCellBounds} outer Candidate containing rectangle.
 * @param {ThreefoldCellBounds} inner Candidate contained rectangle.
 * @returns {boolean} Whether every inner cell lies in the outer rectangle.
 */
function containsCellBounds(outer, inner) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/**
 * Find the shared cells of two integer rectangles.
 * @param {ThreefoldCellBounds} left First rectangle.
 * @param {ThreefoldCellBounds} right Second rectangle.
 * @returns {ThreefoldCellBounds|null} Shared rectangle or null when disjoint.
 */
function intersectCellBounds(left, right) {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const maxX = Math.min(left.x + left.width, right.x + right.width);
  const maxY = Math.min(left.y + left.height, right.y + right.height);
  if (maxX <= x || maxY <= y) return null;
  return { x, y, width: maxX - x, height: maxY - y };
}
