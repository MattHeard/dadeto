// Toy: Asset Possession Segment Candidate Filter

/** @param {string} input JSON with assets, points, segments, assignments, requestedSku, possessionSegmentId. @returns {string} Ordered candidate IDs. */
export function assetPossessionSegmentCandidateFilter(input) {
  try {
    const x = JSON.parse(input || '{}'),
      points = new Map((x.points || []).map(p => [p.pointId, p])),
      segments = new Map((x.segments || []).map(s => [s.segmentId, s]));
    const target = resolve(segments, points, x.possessionSegmentId),
      assignments = Array.isArray(x.existingAssetAssignments)
        ? x.existingAssetAssignments
        : x.assetAssignments || [];
    const ids = (x.assets || [])
      .filter(
        asset =>
          asset &&
          String(asset.sku).trim() === String(x.requestedSku).trim() &&
          asset.assetId &&
          !assignments.some(
            a =>
              a?.assetId === asset.assetId &&
              overlap(resolve(segments, points, a.segmentId), target)
          )
      )
      .map(asset => String(asset.assetId));
    return JSON.stringify([...new Set(ids)].sort((a, b) => a.localeCompare(b)));
  } catch {
    return JSON.stringify([]);
  }
}
/**
 *
 * @param segments
 * @param points
 * @param id
 */
function resolve(segments, points, id) {
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
 *
 * @param a
 * @param b
 */
function overlap(a, b) {
  return Math.max(a.startTime, b.startTime) < Math.min(a.endTime, b.endTime);
}
