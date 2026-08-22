// Toy: Spacetime World Line
// (input, env) -> string
// jscpd:ignore-start

import { formatToyError } from '../formatToyError.js';

/**
 * Assemble every supplied segment into one contiguous ordered world line.
 * @param {string} input JSON payload containing segments and endpoint IDs.
 * @returns {string} Ordered world line or a structured validation error.
 */
export function spacetimeWorldLine(input) {
  try {
    const request = parseInput(input);
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
    return JSON.stringify(
      {
        startPointId: request.startPointId,
        endPointId: request.endPointId,
        segments: ordered,
      },
      null,
      2
    );
  } catch (error) {
    return formatToyError(
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * @param {string} input Raw JSON input.
 * @returns {{segments: Array<Record<string, string>>, startPointId: string, endPointId: string}} Parsed request.
 */
function parseInput(input) {
  const parsed = JSON.parse(input || '{}');
  if (!isJsonObject(parsed))
    throw new Error('Input must be a JSON object.');
  const startPointId = String(parsed.startPointId ?? '').trim();
  const endPointId = String(parsed.endPointId ?? '').trim();
  if (!Array.isArray(parsed.segments) || !startPointId || !endPointId)
    throw new Error('segments, startPointId, and endPointId are required.');
  return { segments: parsed.segments, startPointId, endPointId };
}

function isJsonObject(value) {
  if (value === null) return false;
  if (typeof value !== 'object') return false;
  return !Array.isArray(value);
}

export { isJsonObject, parseInput };
// jscpd:ignore-end
