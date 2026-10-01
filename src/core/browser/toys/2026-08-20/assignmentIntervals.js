/**
 * @param {Map<string, Record<string, unknown>>} segments Segment records.
 * @param {Map<string, Record<string, unknown>>} points Point records.
 * @param {string} segmentId Segment identifier.
 * @returns {{startTime: number, endTime: number}} Temporal interval.
 */
export function resolveInterval(segments, points, segmentId) {
  const segment = segments.get(segmentId);
  if (!segment) throw new Error(`Unknown segment: ${segmentId}`);
  const start = points.get(String(segment.startPointId));
  const end = points.get(String(segment.endPointId));
  if (!start || !end)
    throw new Error(`Segment ${segmentId} references an unknown point.`);
  const startTime = Date.parse(String(start.timestamp));
  const endTime = Date.parse(String(end.timestamp));
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  ) {
    throw new Error(
      `Segment ${segmentId} must have an ordered valid time interval.`
    );
  }
  return { startTime, endTime };
}

/**
 * Touching endpoints are allowed; only positive-duration intersection conflicts.
 * @param {{startTime: number, endTime: number}} first First interval.
 * @param {{startTime: number, endTime: number}} second Second interval.
 * @returns {boolean} Whether intervals overlap in time.
 */
export function overlaps(first, second) {
  return (
    Math.max(first.startTime, second.startTime) <
    Math.min(first.endTime, second.endTime)
  );
}
