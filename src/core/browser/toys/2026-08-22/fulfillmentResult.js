import { normalizeCoordinate } from '../2026-08-18/registryUtils.js';

/**
 * Serialize a structured failure result for a fulfillment toy.
 * @param {unknown} error Caught failure.
 * @param {'valid'|'feasible'} key Result status key.
 * @returns {string} Failure JSON.
 */
export function fulfillmentFailure(error, key = 'valid') {
  const message = error instanceof Error ? error.message : String(error);
  return JSON.stringify({ [key]: false, reason: message, error: message });
}

/**
 * Execute a JSON fulfillment calculation with its standardized failure shape.
 * @param {string} input JSON request.
 * @param {'valid'|'feasible'} key Result validity key.
 * @param {(request: Record<string, any>) => string} calculate Calculation.
 * @param {(error: unknown, key: 'valid'|'feasible') => string} [serializeFailure] Caller-specific failure envelope.
 * @returns {string} JSON result.
 */
export function fulfillmentBoundary(
  input,
  key,
  calculate,
  serializeFailure = fulfillmentFailure
) {
  try {
    return calculate(JSON.parse(input));
  } catch (error) {
    return serializeFailure(error, key);
  }
}

/**
 * Preserve the original proposal-only error envelope without normalizing thrown values.
 * @param {unknown} error Original thrown value.
 * @returns {string} Legacy valid/error JSON response.
 */
export function fulfillmentProposalFailure(error) {
  return JSON.stringify({
    valid: false,
    error: /** @type {{message?: unknown}} */ (error).message,
  });
}

/**
 * Execute a proposal with its legacy valid/error serialization contract.
 * @param {string} input Serialized proposal request.
 * @param {(request: Record<string, any>) => string} calculate Proposal builder.
 * @returns {string} Serialized proposal or original failure envelope.
 */
export function fulfillmentProposalBoundary(input, calculate) {
  return fulfillmentBoundary(
    input,
    'valid',
    calculate,
    fulfillmentProposalFailure
  );
}

/**
 * Serialize the common fulfillment sequence while retaining caller-owned fields.
 * @param {Record<string, any>} spacePoint Warehouse spatial record.
 * @param {{points: Record<string, any>[], segments: Record<string, any>[], sequence: Record<string, any>[]}} records Authored sequence records.
 * @param {string} segmentId Existing possession segment identity.
 * @param {Record<string, any>} [fields] Caller-specific leading result fields.
 * @returns {string} Complete sequence response JSON.
 */
export function fulfillmentSequenceResponse(
  spacePoint,
  records,
  segmentId,
  fields = {}
) {
  const { points, segments, sequence } = records;
  return JSON.stringify({
    ...fields,
    spacePoints: [spacePoint],
    points,
    segments,
    sequence,
    possessionContext: { segmentId },
  });
}

/**
 * Determine whether a value contains nonblank text.
 * @param {unknown} value Candidate value.
 * @returns {boolean} Whether the value is nonblank.
 */
export function fulfillmentNonblank(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

/**
 * Require nonblank text without coercing identifiers from other scalar types.
 * @param {unknown} value Candidate identifier.
 * @returns {boolean} Whether the value is nonblank text.
 */
export function fulfillmentNonblankString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value Candidate number.
 * @returns {boolean} Non-negative finite number.
 */
export function fulfillmentFiniteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Require a finite numeric coordinate within inclusive bounds.
 * @param {unknown} value Candidate number.
 * @param {number} minimum Inclusive lower bound.
 * @param {number} maximum Inclusive upper bound.
 * @returns {boolean} Whether the numeric value is in range.
 */
export function fulfillmentNumberWithin(value, minimum, maximum) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

/**
 * @param {number} value Epoch milliseconds.
 * @returns {boolean} Minute-aligned timestamp.
 */
export function fulfillmentMinuteAligned(value) {
  return Number.isFinite(value) && value % (60 * 1000) === 0;
}

/**
 * Create a referenced point at the proposal's minute precision.
 * @param {string} pointId Point identifier.
 * @param {string} spacePointId Spatial identifier.
 * @param {number} timestamp Epoch milliseconds.
 * @returns {{pointId: string, spacePointId: string, timestamp: string}} Point record.
 */
export function fulfillmentPoint(pointId, spacePointId, timestamp) {
  return {
    pointId,
    spacePointId,
    timestamp: `${new Date(timestamp).toISOString().slice(0, 16)}Z`,
  };
}

/**
 * Create a segment referencing existing endpoints.
 * @param {string} segmentId Segment identifier.
 * @param {string} startPointId Start identifier.
 * @param {string} endPointId End identifier.
 * @returns {{segmentId: string, startPointId: string, endPointId: string}} Segment record.
 */
export function fulfillmentSegment(segmentId, startPointId, endPointId) {
  return { segmentId, startPointId, endPointId };
}

/**
 * Build the inspection/cleaning tail shared by both fulfillment plans.
 * @param {{points: Record<string, string>, segments: Record<string, string>}} ids Generated identifiers.
 * @param {string} pickupReturnPointId Warehouse arrival point.
 * @returns {Array<{segmentId: string, startPointId: string, endPointId: string}>} Ordered recovery segments.
 */
export function fulfillmentRecoverySegments(ids, pickupReturnPointId) {
  return [
    fulfillmentSegment(
      ids.segments.inspection,
      pickupReturnPointId,
      ids.points.inspectionComplete
    ),
    fulfillmentSegment(
      ids.segments.cleaning,
      ids.points.inspectionComplete,
      ids.points.cleaningComplete
    ),
  ];
}

/**
 * Normalize warehouse coordinates while preserving caller-selected spatial IDs.
 * @param {Record<string, any>} warehouse Warehouse record.
 * @param {string} [spacePointId] Spatial identifier override.
 * @returns {{spacePointId: string, latitude: unknown, longitude: unknown}} Warehouse space point.
 */
export function fulfillmentWarehouseSpacePoint(
  warehouse,
  spacePointId = warehouse.spacePointId
) {
  return {
    spacePointId,
    latitude: normalizeCoordinate(warehouse.latitude, -90, 90),
    longitude: normalizeCoordinate(warehouse.longitude, -180, 180),
  };
}

/**
 * Prepare the common configuration after resolving possession references.
 * @param {Record<string, any>} request Proposal request.
 * @returns {{context: ReturnType<typeof fulfillmentPossessionContext>, warehouse: Record<string, any>, travel: Record<string, any>, configuration: Record<string, any>, ids: Record<string, any>}} Proposal configuration and context.
 */
export function fulfillmentConfiguredProposal(request) {
  return {
    context: fulfillmentPossessionContext(request),
    warehouse: request.warehouse,
    travel: request.travelDurations,
    configuration: request.configuration,
    ids: request.generatedIds,
  };
}

/**
 * Resolve required possession endpoints and their segment reference contract.
 * @param {Record<string, any>} request Proposal request.
 * @returns {{segment: Record<string, any>, startPoint: Record<string, any>, endPoint: Record<string, any>}} Complete possession context.
 */
export function fulfillmentPossessionContext(request) {
  const context = request?.possessionContext;
  const segment = context?.segment;
  const startPoint = context?.startPoint;
  const endPoint = context?.endPoint;
  if (!segment || !startPoint || !endPoint)
    throw new Error(
      'A possession segment and both endpoint points are required.'
    );
  if (
    segment.startPointId !== startPoint.pointId ||
    segment.endPointId !== endPoint.pointId
  )
    throw new Error(
      'Possession segment endpoint references must match its points.'
    );
  return { segment, startPoint, endPoint };
}

/**
 * Reject generated identifiers colliding with each other or possession records.
 * @param {unknown[]} generated Generated identifiers.
 * @param {{segment: Record<string, any>, startPoint: Record<string, any>, endPoint: Record<string, any>}} context Existing possession records.
 * @returns {void} Throws on an identifier collision.
 */
export function fulfillmentDistinctIds(generated, context) {
  const ids = [
    ...generated,
    context.segment.segmentId,
    context.startPoint.pointId,
    context.endPoint.pointId,
  ];
  if (new Set(ids).size !== ids.length) {
    throw new Error(
      'Generated IDs must be unique and distinct from possession IDs.'
    );
  }
}

/**
 * @param {Record<string, any>} request Request containing requestedSku/assets.
 * @param {(asset: Record<string, any>) => string} evaluate Asset evaluator.
 * @returns {string} Feasibility JSON.
 */
export function fulfillmentFindMatchingAsset(request, evaluate) {
  if (
    !fulfillmentNonblank(request?.requestedSku) ||
    !Array.isArray(request.assets)
  )
    throw new Error('A requested SKU and asset list are required.');
  const candidates = request.assets
    .filter(
      asset =>
        asset?.sku === request.requestedSku &&
        fulfillmentNonblank(asset.assetId)
    )
    .sort((left, right) =>
      String(left.assetId).localeCompare(String(right.assetId))
    );
  for (const asset of candidates) {
    if (JSON.parse(evaluate(asset)).feasible === true)
      return JSON.stringify({ feasible: true });
  }
  return JSON.stringify({ feasible: false });
}

/**
 * @param {string} input JSON request.
 * @param {(asset: Record<string, any>, request: Record<string, any>) => string} evaluate Asset evaluator.
 * @returns {string} Feasibility JSON.
 */
export function fulfillmentSkuBoundary(input, evaluate) {
  return fulfillmentBoundary(input, 'feasible', request =>
    fulfillmentFindMatchingAsset(request, asset => evaluate(asset, request))
  );
}

/**
 * Run an existing-asset SKU evaluator with the canonical asset request shape.
 * @param {string} input JSON request.
 * @param {(request: string) => string} evaluate Asset feasibility evaluator.
 * @returns {string} Feasibility JSON.
 */
export function fulfillmentSkuAssetBoundary(input, evaluate) {
  return fulfillmentSkuBoundary(input, (asset, request) =>
    evaluate(fulfillmentAssetRequest(asset, request))
  );
}

/**
 * Resolve a point with coordinates from its referenced space point.
 * @param {Record<string, any>} point Point record.
 * @param {Array<Record<string, any>>} spacePoints Space-point records.
 * @returns {Record<string, any>} Coordinate-bearing point.
 */
export function fulfillmentResolvePoint(point, spacePoints) {
  const spacePoint = spacePoints.find(
    candidate => candidate.spacePointId === point.spacePointId
  );
  if (!spacePoint)
    throw new Error(`Unknown space point: ${point.spacePointId}`);
  return {
    ...point,
    latitude: spacePoint.latitude,
    longitude: spacePoint.longitude,
  };
}

/**
 * Merge records by an identifier and reject conflicting duplicates.
 * @param {Array<Record<string, any>>} records Records to merge.
 * @param {string} field Identifier field.
 * @returns {Array<Record<string, any>>} Deduplicated records.
 */
export function fulfillmentMergeById(records, field) {
  const byId = new Map();
  records.forEach(record => {
    if (!record || !fulfillmentNonblank(record[field]))
      throw new Error(`Invalid ${field}.`);
    const id = String(record[field]);
    const existing = byId.get(id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(record))
      throw new Error(`Conflicting ${field}: ${id}`);
    byId.set(id, { ...record, [field]: id });
  });
  return [...byId.values()];
}

/**
 * Run a shared existing-asset feasibility boundary.
 * @param {string} input JSON request.
 * @param {(proposal: Record<string, any>) => Array<Record<string, any>>} selectSegments Segment selector.
 * @param {(context: {points: Array<Record<string, any>>, existing: Array<Record<string, any>>, candidates: Array<Record<string, any>>, entry: Record<string, any>, spacePoints: Array<Record<string, any>>}) => Record<string, any>} evaluate World-line evaluator.
 * @returns {string} Feasibility JSON.
 */
export function fulfillmentExistingAssetBoundary(
  input,
  selectSegments,
  evaluate
) {
  return fulfillmentBoundary(input, 'feasible', request => {
    const asset = request?.asset;
    const proposal = request?.proposal;
    if (!fulfillmentNonblank(asset?.assetId))
      throw new Error('A valid asset is required.');
    if (!fulfillmentNonblank(asset?.stockInPoint?.pointId))
      throw new Error('A stock-in point is required.');
    const candidates = selectSegments(proposal);
    const points = fulfillmentMergeById(
      [
        ...(request.points || []),
        ...(proposal.points || []),
        asset.stockInPoint,
      ],
      'pointId'
    );
    const spacePoints = fulfillmentMergeById(
      [...(request.spacePoints || []), ...(proposal.spacePoints || [])],
      'spacePointId'
    );
    const entry = fulfillmentResolvePoint(asset.stockInPoint, spacePoints);
    return JSON.stringify(
      evaluate({
        points,
        existing: asset.existingSegments || [],
        candidates,
        entry,
        spacePoints,
      })
    );
  });
}

/**
 * Serialize the common asset-feasibility request shape.
 * @param {Record<string, any>} asset Selected asset.
 * @param {Record<string, any>} request Original SKU request.
 * @returns {string} Asset feasibility request JSON.
 */
export function fulfillmentAssetRequest(asset, request) {
  return JSON.stringify({
    asset,
    proposal: request.proposal,
    points: request.points,
    spacePoints: request.spacePoints,
  });
}

/**
 * Adapt prepared asset context to the shared world-line evaluator signature.
 * @param {string} input JSON request.
 * @param {(proposal: Record<string, any>) => Array<Record<string, any>>} selectSegments Authored operation selection.
 * @param {(...args: any[]) => Record<string, any>} evaluate Single or sequence world-line evaluator.
 * @param {(candidates: Array<Record<string, any>>) => any} [selectCandidates] Evaluator-specific candidate projection.
 * @returns {string} Feasibility JSON using the existing boundary contract.
 */
export function fulfillmentAssetWorldLineBoundary(
  input,
  selectSegments,
  evaluate,
  selectCandidates = candidates => candidates
) {
  return fulfillmentExistingAssetBoundary(input, selectSegments, context =>
    evaluate(
      context.points,
      context.existing,
      selectCandidates(context.candidates),
      context.entry,
      undefined,
      context.spacePoints
    )
  );
}
