import {
  isJsonObject,
  parseSegmentMeasurementInput,
  measureSpacetimeSegment,
} from './spacetimeInput.js';

/**
 * Calculate UTC duration for a SPAC2 segment.
 * @param {string} input JSON payload containing points and a segment.
 * @returns {string} Object containing string value and unit fields.
 */
export function spacetimeSegmentDuration(input) {
  return measureSpacetimeSegment(input, parseInput, durationSeconds, 'seconds');
}

/**
 * Format a valid ordered UTC interval in seconds.
 * @param {Record<string, any>} start Start point.
 * @param {Record<string, any>} end End point.
 * @returns {string} Duration in seconds.
 */
function durationSeconds(start, end) {
  const startTime = Date.parse(start.timestamp);
  const endTime = Date.parse(end.timestamp);
  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  ) {
    throw new Error('Segment must have an ordered valid UTC interval.');
  }
  return String((endTime - startTime) / 1000);
}

/**
 * Parse the duration request with its legacy empty-input policy.
 * @param {string} input Raw JSON input.
 * @returns {{points: Array<{pointId: string, timestamp: string}>, segment: {startPointId: string, endPointId: string}}} Parsed payload.
 */
function parseInput(input) {
  return /** @type {{points: Array<{pointId: string, timestamp: string}>, segment: {startPointId: string, endPointId: string}}} */ (
    parseSegmentMeasurementInput(input || '{}')
  );
}

export { isJsonObject, parseInput };
