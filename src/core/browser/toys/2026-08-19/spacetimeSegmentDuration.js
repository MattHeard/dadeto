// Toy: Spacetime Segment Duration
// (input, env) -> string

/**
 * Calculate UTC duration for a SPAC2 segment.
 * @param {string} input JSON payload containing points and a segment.
 * @returns {string} Object containing string value and unit fields.
 */
export function spacetimeSegmentDuration(input) {
  try {
    const { points, segment } = parseInput(input);
    const byId = new Map(points.map(point => [point.pointId, point]));
    const start = byId.get(segment.startPointId);
    const end = byId.get(segment.endPointId);
    if (!start || !end) throw new Error('Segment references an unknown point.');
    const startTime = Date.parse(start.timestamp);
    const endTime = Date.parse(end.timestamp);
    if (
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      endTime < startTime
    ) {
      throw new Error('Segment must have an ordered valid UTC interval.');
    }
    return JSON.stringify({
      value: String((endTime - startTime) / 1000),
      unit: 'seconds',
    });
  } catch (error) {
    return JSON.stringify({
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * @param {string} input Raw JSON input.
 * @returns {{points: Array<Record<string, unknown>>, segment: Record<string, unknown>}} Parsed payload.
 */
function parseInput(input) {
  const parsed = JSON.parse(input || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Input must be a JSON object.');
  }
  if (!Array.isArray(parsed.points) || !parsed.segment) {
    throw new Error('points and segment are required.');
  }
  return { points: parsed.points, segment: parsed.segment };
}
