// Toy: Spacetime Segment Registry
// (input, env) -> string

import { trimmedStringOrEmpty } from '../../validation.js';
import { buildRegistry } from '../2026-08-18/registryUtils.js';

/**
 * Normalize ordered segments that reference SPAC1 points.
 * @param {string} input JSON payload containing `segments`.
 * @returns {string} Deterministic spacetime-segment registry.
 */
export const spacetimeSegmentRegistry = input =>
  buildRegistry(input, {
    collectionKey: 'segments',
    countKey: 'segmentCount',
    sourceKey: 'segments',
    normalize: normalizeSegment,
    sortKey: segment => segment.segmentId,
  });

/**
 * @param {unknown} value Candidate segment.
 * @returns {{segmentId: string, startPointId: string, endPointId: string}|null} Normalized segment.
 */
function normalizeSegment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const segment = /** @type {Record<string, unknown>} */ (value);
  const segmentId = trimmedStringOrEmpty(segment.segmentId);
  const startPointId = trimmedStringOrEmpty(segment.startPointId);
  const endPointId = trimmedStringOrEmpty(segment.endPointId);
  if (!segmentId || !startPointId || !endPointId) return null;
  return { segmentId, startPointId, endPointId };
}

export { normalizeSegment };
