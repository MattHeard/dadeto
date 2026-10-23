import { heightAtScale } from './spatial.js';

/** @typedef {{min: {x: number, y: number}, max: {x: number, y: number}}} ThreefoldPhysicalBounds */
/** @typedef {{id: string, bounds: ThreefoldPhysicalBounds, parentId?: string, overlapGroupId?: string, hierarchy?: {parentId?: string, expandAtScale?: number}}} ThreefoldGridEntity */
/** @typedef {{id: string, parentId?: string, expandAtScale?: number}} ThreefoldHierarchyEntity */
/** @typedef {{id: string, proxyId: string|null, reason: 'expanded'|'proxied'}} ThreefoldHiddenHierarchyEntity */
/** @typedef {{id: string, childIds: string[]}} ThreefoldHierarchyProxy */
/** @typedef {{scale: number, visibleEntityIds: string[], hiddenEntities: ThreefoldHiddenHierarchyEntity[], proxies: ThreefoldHierarchyProxy[]}} ThreefoldHierarchyExposure */
/** @typedef {{x: number, y: number, width: number, height: number}} ThreefoldCellBounds */
/** @typedef {{id: string, cellBounds: ThreefoldCellBounds}} ThreefoldProjectedEntity */
/** @typedef {{id: string, cellBounds: ThreefoldCellBounds, parentId?: string, overlapGroupId?: string, placement: 'placed'|'unresolved'|'overflow'}} ThreefoldLayoutEntity */
/** @typedef {{scale: number, entities: ThreefoldLayoutEntity[], containments: Array<{parentId: string, childId: string, cellBounds: ThreefoldCellBounds}>, intentionalOverlaps: Array<{groupId: string, entityIds: [string, string], cellBounds: ThreefoldCellBounds}>, conflicts: Array<{type: 'unresolved-overlap', entityIds: [string, string], cellBounds: ThreefoldCellBounds}>, relationshipIssues: Array<{type: 'child-not-contained', parentId: string, childId: string}>, overflow: Array<{entityId: string, cellBounds: ThreefoldCellBounds}>}} ThreefoldSceneLayout */
/** @typedef {ThreefoldSceneLayout & {hierarchy: ThreefoldHierarchyExposure}} ThreefoldResolvedSceneLayout */

/**
 * Expose authored hierarchy nodes at one scale without changing the world.
 * A composite with children is visible while the requested scale is greater
 * than its authored `expandAtScale`; at that threshold and finer scales the
 * composite is hidden and its children are considered recursively. Hidden
 * descendants of a visible composite map to that composite as their proxy.
 * @param {ThreefoldHierarchyEntity[]} entities Authored identities and parent links.
 * @param {number} scale Requested THREEFOLD scale from -4 through +4.
 * @returns {ThreefoldHierarchyExposure} Deterministic visible identities and proxy mapping.
 */
export function exposeHierarchy(entities, scale) {
  heightAtScale(scale);
  if (!Array.isArray(entities))
    throw new TypeError('Logical-grid hierarchy entities must be an array.');

  const byId = new Map();
  const childrenById = new Map();
  for (const entity of entities) {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity))
      throw new TypeError('A hierarchy entity is required.');
    if (typeof entity.id !== 'string' || entity.id.length === 0)
      throw new TypeError('A hierarchy entity requires a stable identifier.');
    if (byId.has(entity.id))
      throw new RangeError(`Duplicate hierarchy entity: ${entity.id}`);
    if (
      entity.parentId !== undefined &&
      (typeof entity.parentId !== 'string' || entity.parentId.length === 0)
    )
      throw new TypeError('A hierarchy parent requires a stable identifier.');
    if (entity.expandAtScale !== undefined) {
      if (!Number.isInteger(entity.expandAtScale))
        throw new RangeError(
          'A hierarchy expansion threshold must be an integer scale.'
        );
      heightAtScale(entity.expandAtScale);
    }
    byId.set(entity.id, entity);
    childrenById.set(entity.id, []);
  }

  for (const entity of entities) {
    if (entity.parentId === undefined) continue;
    if (entity.parentId === entity.id || !byId.has(entity.parentId))
      throw new RangeError(
        `Hierarchy parent is unavailable: ${entity.parentId}`
      );
    childrenById.get(entity.parentId).push(entity.id);
  }
  for (const children of childrenById.values()) children.sort(compareIds);

  for (const entity of entities) {
    const children = childrenById.get(entity.id);
    if (children.length > 0 && entity.expandAtScale === undefined)
      throw new TypeError(
        `Hierarchy composite requires an expansion threshold: ${entity.id}`
      );
    if (children.length === 0 && entity.expandAtScale !== undefined)
      throw new TypeError(
        `Hierarchy leaf cannot have an expansion threshold: ${entity.id}`
      );
  }

  assertHierarchyAcyclic(byId, childrenById);

  const visibleEntityIds = /** @type {string[]} */ ([]);
  const hiddenEntities = /** @type {ThreefoldHiddenHierarchyEntity[]} */ ([]);
  const proxies = /** @type {ThreefoldHierarchyProxy[]} */ ([]);
  /**
   * @param {string} id Current hierarchy identity.
   * @param {string|undefined} proxyId Visible composite representing this subtree.
   */
  const exposeNode = (id, proxyId) => {
    if (proxyId !== undefined) {
      hiddenEntities.push({ id, proxyId, reason: 'proxied' });
      for (const childId of childrenById.get(id)) exposeNode(childId, proxyId);
      return;
    }

    const children = /** @type {string[]} */ (childrenById.get(id));
    if (children.length === 0) {
      visibleEntityIds.push(id);
      return;
    }
    const entity = /** @type {ThreefoldHierarchyEntity} */ (byId.get(id));
    const expansionThreshold = /** @type {number} */ (entity.expandAtScale);
    if (scale > expansionThreshold) {
      visibleEntityIds.push(id);
      proxies.push({
        id,
        childIds: collectHierarchyDescendants(id, childrenById),
      });
      for (const childId of children) exposeNode(childId, id);
      return;
    }

    hiddenEntities.push({ id, proxyId: null, reason: 'expanded' });
    for (const childId of children) exposeNode(childId, undefined);
  };
  const roots = [...byId.values()]
    .filter(entity => entity.parentId === undefined)
    .map(entity => entity.id)
    .sort(compareIds);

  for (const id of roots) exposeNode(id, undefined);

  return {
    scale,
    visibleEntityIds: visibleEntityIds.sort(compareIds),
    hiddenEntities: hiddenEntities.sort((left, right) =>
      compareIds(left.id, right.id)
    ),
    proxies: proxies.sort((left, right) => compareIds(left.id, right.id)),
  };
}

/**
 * Resolve one exposed hierarchy target into the identities a scale-specific
 * group action may affect. Hidden targets are unavailable at that scale.
 * @param {ThreefoldHierarchyEntity[]} entities Authored identities and parent links.
 * @param {number} scale Current player interaction scale.
 * @param {string} targetId Identity selected by the current-scale interaction.
 * @returns {{targetId: string, affectedEntityIds: string[]}|null} Stable target and authored descendants, or null when hidden.
 */
export function resolveHierarchyActionTarget(entities, scale, targetId) {
  if (typeof targetId !== 'string' || targetId.length === 0) return null;
  const exposure = exposeHierarchy(entities, scale);
  if (!exposure.visibleEntityIds.includes(targetId)) return null;
  const proxy = exposure.proxies.find(entity => entity.id === targetId);
  return {
    targetId,
    affectedEntityIds: [targetId, ...(proxy?.childIds ?? [])].sort(compareIds),
  };
}

/**
 * Create a pure reducer for a visible scale-specific hierarchy action. Each
 * stable target identity receives one reducer step in deterministic order.
 * @template State
 * @param {ThreefoldHierarchyEntity[]} entities Authored identities and parent links.
 * @param {number} scale Current player interaction scale.
 * @param {string} targetId Identity selected by the current-scale interaction.
 * @param {(currentState: State, affectedEntityId: string) => State} reduceEffect Pure per-identity state reducer.
 * @returns {(state: State) => {state: State, affectedEntityIds: string[]}} Reducer with the affected identities captured.
 */
export function createHierarchyActionReducer(
  entities,
  scale,
  targetId,
  reduceEffect
) {
  if (typeof reduceEffect !== 'function')
    throw new TypeError('A hierarchy action requires a state reducer.');
  const target = resolveHierarchyActionTarget(entities, scale, targetId);
  const affectedEntityIds = target ? target.affectedEntityIds : [];
  return state => {
    let nextState = state;
    for (const entityId of affectedEntityIds)
      nextState = reduceEffect(nextState, entityId);
    return { state: nextState, affectedEntityIds };
  };
}

/**
 * Resolve one immutable scene into visible hierarchy identities and integer-cell
 * geometry. Semantic hierarchy stays separate from geometric containment.
 * @param {ThreefoldGridEntity[]} entities Canonical scene entities.
 * @param {number} scale Requested THREEFOLD scale from -4 through +4.
 * @param {ThreefoldCellBounds} [viewport] Optional finite logical-cell capacity.
 * @returns {ThreefoldResolvedSceneLayout} Visible cells plus hierarchy and packing diagnostics.
 */
export function resolveSceneLayout(entities, scale, viewport) {
  if (!Array.isArray(entities))
    throw new TypeError('Logical-grid scene entities must be an array.');

  const hierarchyEntities = entities.map(entity => {
    if (!entity || typeof entity !== 'object' || Array.isArray(entity))
      throw new TypeError('A logical-grid entity is required.');
    const hierarchy = entity.hierarchy;
    if (
      hierarchy !== undefined &&
      (!hierarchy || typeof hierarchy !== 'object' || Array.isArray(hierarchy))
    )
      throw new TypeError('A logical-grid hierarchy node must be an object.');
    return { id: entity.id, ...hierarchy };
  });
  const hierarchy = exposeHierarchy(hierarchyEntities, scale);
  const visibleEntityIds = new Set(hierarchy.visibleEntityIds);
  const visibleEntities = entities.filter(entity =>
    visibleEntityIds.has(entity.id)
  );
  return {
    ...layoutScene(visibleEntities, scale, viewport),
    hierarchy,
  };
}

/**
 * Validate the complete parent graph before producing any exposure result.
 * @param {Map<string, ThreefoldHierarchyEntity>} byId Authored identity lookup.
 * @param {Map<string, string[]>} childrenById Authored child relationships.
 */
function assertHierarchyAcyclic(byId, childrenById) {
  const active = new Set();
  const visited = new Set();
  for (const id of [...byId.keys()].sort(compareIds))
    visitHierarchyNode(id, childrenById, active, visited);
}

/**
 * Visit one hierarchy branch and reject parent cycles.
 * @param {string} id Current stable identity.
 * @param {Map<string, string[]>} childrenById Authored child relationships.
 * @param {Set<string>} active Current depth-first path.
 * @param {Set<string>} visited Completed identities.
 */
function visitHierarchyNode(id, childrenById, active, visited) {
  if (active.has(id))
    throw new RangeError(`Hierarchy contains a cycle at ${id}.`);
  if (visited.has(id)) return;
  active.add(id);
  for (const childId of /** @type {string[]} */ (childrenById.get(id)))
    visitHierarchyNode(childId, childrenById, active, visited);
  active.delete(id);
  visited.add(id);
}

/**
 * Collect every descendant of an authored composite in stable identity order.
 * @param {string} id Composite identity.
 * @param {Map<string, string[]>} childrenById Authored child relationships.
 * @returns {string[]} Sorted descendants excluding the composite itself.
 */
function collectHierarchyDescendants(id, childrenById) {
  return /** @type {string[]} */ (childrenById.get(id))
    .flatMap(childId => [
      childId,
      ...collectHierarchyDescendants(childId, childrenById),
    ])
    .sort(compareIds);
}

/**
 * Compare stable identifiers without locale-dependent ordering.
 * @param {string} left First identity.
 * @param {string} right Second identity.
 * @returns {number} Lexical ordering result.
 */
function compareIds(left, right) {
  return Number(left > right) - Number(left < right);
}

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
  const unresolvedIds = new Set();

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

  const overflowIds = new Set();
  const overflow =
    viewport === undefined
      ? []
      : collectViewportOverflow(projected, viewport, overflowIds);

  return {
    scale,
    entities: projected.map(entity =>
      createLayoutEntity(entity, entity.cellBounds, unresolvedIds, overflowIds)
    ),
    containments,
    intentionalOverlaps,
    conflicts,
    relationshipIssues,
    overflow,
  };
}

/**
 * Resolve projected collisions inside a finite viewport without changing the
 * canonical scene. Authored containments, intentional overlap groups, and
 * invalid parent relationships stay at their projected positions; unrelated
 * entities keep their projected position when free, otherwise they take the
 * nearest free viewport rectangle by Manhattan distance, then row and column.
 * @param {ThreefoldGridEntity[]} entities Canonical entities in any input order.
 * @param {number} scale Requested THREEFOLD scale from -4 through +4.
 * @param {ThreefoldCellBounds} viewport Finite integer-cell layout capacity.
 * @returns {ThreefoldResolvedSceneLayout} Stable packed positions and remaining overflow/conflicts.
 */
export function packSceneLayout(entities, scale, viewport) {
  assertCellBounds(viewport, 'viewport');
  const initial = resolveSceneLayout(entities, scale, viewport);
  const sourceById = new Map(entities.map(entity => [entity.id, entity]));
  const relationshipIds = new Set([
    ...initial.containments.flatMap(({ parentId, childId }) => [
      parentId,
      childId,
    ]),
    ...initial.intentionalOverlaps.flatMap(({ entityIds }) => entityIds),
    ...initial.relationshipIssues.flatMap(({ parentId, childId }) => [
      parentId,
      childId,
    ]),
  ]);
  const entries = initial.entities.map(entity => ({
    ...entity,
    source: /** @type {ThreefoldGridEntity} */ (sourceById.get(entity.id)),
  }));
  const ordered = [
    ...entries.filter(entity => relationshipIds.has(entity.id)),
    ...entries.filter(entity => !relationshipIds.has(entity.id)),
  ];
  const placed = [];
  const positions = new Map();
  const overflowIds = new Set();

  for (const entity of ordered) {
    const /** @type {ThreefoldCellBounds|null} */ candidate =
        relationshipIds.has(entity.id)
          ? containsCellBounds(viewport, entity.cellBounds)
            ? entity.cellBounds
            : null
          : findPackedPosition(entity, placed, viewport);
    if (candidate === null) {
      overflowIds.add(entity.id);
      positions.set(entity.id, entity.cellBounds);
      placed.push({
        ...entity,
        cellBounds: entity.cellBounds,
        source: entity.source,
      });
      continue;
    }
    positions.set(entity.id, candidate);
    placed.push({ ...entity, cellBounds: candidate, source: entity.source });
  }

  const projected = placed.map(entity => ({
    id: entity.id,
    source: entity.source,
    cellBounds: entity.cellBounds,
  }));
  const overlaps = classifyOverlaps(projected);
  const unresolvedIds = new Set(overlaps.unresolvedIds);
  initial.relationshipIssues.forEach(({ parentId, childId }) => {
    unresolvedIds.add(parentId);
    unresolvedIds.add(childId);
  });
  const conflicts = overlaps.conflicts;

  const overflow = collectViewportOverflow(placed, viewport, overflowIds);

  return {
    scale,
    entities: entries.map(entity =>
      createLayoutEntity(
        entity,
        positions.get(entity.id),
        unresolvedIds,
        overflowIds
      )
    ),
    containments: initial.containments,
    intentionalOverlaps: overlaps.intentionalOverlaps,
    conflicts,
    relationshipIssues: initial.relationshipIssues,
    overflow,
    hierarchy: initial.hierarchy,
  };
}

/**
 * Build the shared public layout record for a projected entity.
 * @param {{id: string, parentId?: string, overlapGroupId?: string, source: ThreefoldGridEntity}} entity Stable identity and authored relationship fields.
 * @param {ThreefoldCellBounds} cellBounds Final display rectangle.
 * @param {Set<string>} unresolvedIds Identities in unresolved relationships or conflicts.
 * @param {Set<string>} overflowIds Identities outside or beyond viewport capacity.
 * @returns {ThreefoldLayoutEntity} Public layout entity.
 */
function createLayoutEntity(entity, cellBounds, unresolvedIds, overflowIds) {
  const parentId = entity.parentId ?? entity.source.parentId;
  const overlapGroupId = entity.overlapGroupId ?? entity.source.overlapGroupId;
  return {
    id: entity.id,
    cellBounds,
    ...(parentId === undefined ? {} : { parentId }),
    ...(overlapGroupId === undefined ? {} : { overlapGroupId }),
    placement: overflowIds.has(entity.id)
      ? 'overflow'
      : unresolvedIds.has(entity.id)
        ? 'unresolved'
        : 'placed',
  };
}

/**
 * Collect entities that overflow the viewport or could not fit its capacity.
 * @param {Array<{id: string, cellBounds: ThreefoldCellBounds}>} entities Candidate final display records.
 * @param {ThreefoldCellBounds} viewport Finite integer-cell capacity.
 * @param {Set<string>} overflowIds Explicit capacity failures to preserve.
 * @returns {Array<{entityId: string, cellBounds: ThreefoldCellBounds}>} Stable overflow records.
 */
function collectViewportOverflow(entities, viewport, overflowIds) {
  const overflow = [];
  for (const entity of entities) {
    if (
      !overflowIds.has(entity.id) &&
      containsCellBounds(viewport, entity.cellBounds)
    )
      continue;
    overflow.push({ entityId: entity.id, cellBounds: entity.cellBounds });
    overflowIds.add(entity.id);
  }
  return overflow;
}

/**
 * Find the nearest free integer-cell rectangle inside a viewport.
 * @param {{id: string, cellBounds: ThreefoldCellBounds, source: ThreefoldGridEntity}} entity Candidate entity.
 * @param {Array<{id: string, cellBounds: ThreefoldCellBounds, source: ThreefoldGridEntity}>} placed Already reserved entities.
 * @param {ThreefoldCellBounds} viewport Finite packing capacity.
 * @returns {ThreefoldCellBounds|null} Candidate position, or null when capacity is exhausted.
 */
function findPackedPosition(entity, placed, viewport) {
  const maxX = viewport.x + viewport.width - entity.cellBounds.width;
  const maxY = viewport.y + viewport.height - entity.cellBounds.height;
  if (maxX < viewport.x || maxY < viewport.y) return null;

  const candidates = [];
  for (let y = viewport.y; y <= maxY; y += 1)
    for (let x = viewport.x; x <= maxX; x += 1)
      candidates.push({
        x,
        y,
        distance:
          Math.abs(x - entity.cellBounds.x) + Math.abs(y - entity.cellBounds.y),
      });
  candidates.sort(
    (left, right) =>
      left.distance - right.distance || left.y - right.y || left.x - right.x
  );

  for (const candidate of candidates) {
    const bounds = {
      ...entity.cellBounds,
      x: candidate.x,
      y: candidate.y,
    };
    if (placed.some(other => hasUnpermittedOverlap(entity, bounds, other)))
      continue;
    return bounds;
  }
  return null;
}

/**
 * Check whether a candidate conflicts with a reserved display footprint.
 * Authored relationships are held fixed, so only explicit overlap groups can
 * share cells during placement.
 * @param {{id: string, source: ThreefoldGridEntity}} entity Candidate entity.
 * @param {ThreefoldCellBounds} bounds Candidate display rectangle.
 * @param {{id: string, source: ThreefoldGridEntity, cellBounds: ThreefoldCellBounds}} other Reserved entity.
 * @returns {boolean} True when the overlap is not authored.
 */
function hasUnpermittedOverlap(entity, bounds, other) {
  if (!intersectCellBounds(bounds, other.cellBounds)) return false;
  if (
    entity.source.overlapGroupId !== undefined &&
    entity.source.overlapGroupId === other.source.overlapGroupId
  )
    return false;
  return true;
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
