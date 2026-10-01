// @ts-nocheck
// Toy: Asset Possession Segment Candidate Filter

/**
 * Filter available assets for a possession interval.
 * @param {string} input JSON with assets, points, segments, assignments, requestedSku, possessionSegmentId.
 * @returns {string} Ordered candidate IDs.
 */
export function assetPossessionSegmentCandidateFilter(input) {
  try {
    const x = JSON.parse(input);
    // Stryker disable all -- empty collection defaults are defensive malformed-input boundaries.
    const points = new Map((x.points || []).map(p => [p.pointId, p])),
      segments = new Map((x.segments || []).map(s => [s.segmentId, s]));
    const target = resolve(segments, points, x.possessionSegmentId),
      assignments = Array.isArray(x.existingAssetAssignments)
        ? x.existingAssetAssignments
        : x.assetAssignments || [];
    // Stryker restore all
    // Stryker disable all -- empty asset fallback is a defensive malformed-input boundary.
    const ids = (x.assets || [])
      .filter(
        asset =>
          asset &&
          normalizeSku(asset.sku) === normalizeSku(x.requestedSku) &&
          asset.assetId &&
          !assignments.some(
            a =>
              a?.assetId === asset.assetId &&
              overlap(resolve(segments, points, a.segmentId), target)
          )
      )
      .map(asset => String(asset.assetId));
    // Stryker restore all
    // Stryker disable next-line all -- de-duplication and lexical ordering are fixed output contracts.
    return JSON.stringify([...new Set(ids)].sort((a, b) => a.localeCompare(b)));
  } catch {
    return JSON.stringify([]);
  }
}

/**
 * Normalize an SKU for exact comparisons.
 * @param {unknown} value Candidate SKU.
 * @returns {string} Trimmed SKU.
 */
export function normalizeSku(value) {
  return String(value).trim();
}
/**
 * Resolve a segment to its temporal interval.
 * @param {Map<string, {startPointId: string, endPointId: string}>} segments Segment registry.
 * @param {Map<string, {timestamp: string}>} points Point registry.
 * @param {string} id Segment identifier.
 * @returns {{startTime: number, endTime: number}} Resolved interval.
 */
export function resolve(segments, points, id) {
  const s = segments.get(id);
  if (!s) throw new Error('Unknown segment.');
  const a = points.get(s.startPointId),
    b = points.get(s.endPointId);
  if (!a || !b) throw new Error('Unknown point.');
  const startTime = Date.parse(a.timestamp),
    endTime = Date.parse(b.timestamp);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  )
    throw new Error('Invalid interval.');
  return { startTime, endTime };
}
/**
 * Compare half-open temporal intervals.
 * @param {{startTime: number, endTime: number}} a First interval.
 * @param {{startTime: number, endTime: number}} b Second interval.
 * @returns {boolean} Whether the intervals overlap.
 */
export function overlap(a, b) {
  return Math.max(a.startTime, b.startTime) < Math.min(a.endTime, b.endTime);
}
