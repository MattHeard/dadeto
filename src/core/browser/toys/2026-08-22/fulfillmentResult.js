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
 * @returns {string} JSON result.
 */
export function fulfillmentBoundary(input, key, calculate) {
  try {
    return calculate(JSON.parse(input));
  } catch (error) {
    return fulfillmentFailure(error, key);
  }
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
 * @param {unknown} value Candidate number.
 * @returns {boolean} Non-negative finite number.
 */
export function fulfillmentFiniteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * @param {number} value Epoch milliseconds.
 * @returns {boolean} Minute-aligned timestamp.
 */
export function fulfillmentMinuteAligned(value) {
  return Number.isFinite(value) && value % (60 * 1000) === 0;
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
