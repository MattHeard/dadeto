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
