// Toy: Spacetime World Line
// (input, env) -> string
import { runToyRequest } from '../formatToyError.js';
import { isJsonObject } from './spacetimeInput.js';
import { normalizeSegment } from './spacetimeSegmentRegistry.js';

/**
 * Assemble every supplied segment into one contiguous ordered world line.
 * @param {string} input JSON payload containing segments and endpoint IDs.
 * @returns {string} Ordered world line or a structured validation error.
 */
export function spacetimeWorldLine(input) {
  return runToyRequest(input, parseInput, orderWorldLine);
}

/**
 * Assemble validated segments without owning serialization or error presentation.
 * @param {ReturnType<typeof parseInput>} request World-line endpoints and segments.
 * @returns {Record<string, unknown>} Contiguous ordered world line.
 */
function orderWorldLine(request) {
  const byStart = new Map();
  request.segments.forEach(segment => {
    if (!segment.segmentId || !segment.startPointId || !segment.endPointId) {
      throw new Error(
        'Every segment requires segmentId, startPointId, and endPointId.'
      );
    }
    if (byStart.has(segment.startPointId)) {
      throw new Error('World line contains branching segments.');
    }
    byStart.set(segment.startPointId, segment);
  });
  const ordered = [];
  const used = new Set();
  let pointId = request.startPointId;
  let iterations = 0;
  while (
    pointId !== request.endPointId &&
    iterations++ >= 0 &&
    iterations <= request.segments.length
  ) {
    const segment = byStart.get(pointId);
    if (!segment || used.has(segment.segmentId))
      throw new Error('Segments do not form a complete world line.');
    used.add(segment.segmentId);
    ordered.push(segment);
    pointId = segment.endPointId;
  }
  if (pointId !== request.endPointId || used.size !== request.segments.length)
    throw new Error('World line contains unused or disconnected segments.');
  return {
    startPointId: request.startPointId,
    endPointId: request.endPointId,
    segments: ordered,
  };
}

/**
 * @param {string} input Raw JSON input.
 * @returns {{segments: Array<Record<string, string>>, startPointId: string, endPointId: string}} Parsed request.
 */
function parseInput(input) {
  const parsed = JSON.parse(input || '{}');
  if (!isJsonObject(parsed)) throw new Error('Input must be a JSON object.');
  const startPointId = String(parsed.startPointId ?? '').trim();
  const endPointId = String(parsed.endPointId ?? '').trim();
  if (!Array.isArray(parsed.segments) || !startPointId || !endPointId)
    throw new Error('segments, startPointId, and endPointId are required.');
  return {
    segments: parsed.segments.map(segment => {
      const normalized = normalizeSegment(segment);
      if (!normalized)
        throw new Error(
          'Every segment requires segmentId, startPointId, and endPointId.'
        );
      return normalized;
    }),
    startPointId,
    endPointId,
  };
}

export { isJsonObject, parseInput };
