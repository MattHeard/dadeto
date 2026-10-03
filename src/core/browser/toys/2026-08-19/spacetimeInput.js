// Shared input predicates for the spacetime toys.
import { resolvePointRecords } from '../2026-08-22/spacePointResolution.js';
import { runToyCalculation } from '../formatToyError.js';
export { normalizeTrimmedString as normalizeSegmentId } from '../../validation.js';

/**
 * Determine whether a value is a non-array object.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} Whether the value is a JSON object.
 */
export function isJsonObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Parse a measurement request and resolve its coordinate references.
 * @param {string} input JSON request without an implicit empty-input fallback.
 * @returns {{points: Array<Record<string, any>>, segment: {startPointId: string, endPointId: string}}} Normalized measurement records.
 */
export function parseSegmentMeasurementInput(input) {
  const parsed = JSON.parse(input);
  if (!isJsonObject(parsed)) throw new Error('Input must be a JSON object.');
  if (!Array.isArray(parsed.points) || !parsed.segment) {
    throw new Error('points and segment are required.');
  }
  return {
    points: resolvePointRecords(parsed.points, parsed.spacePoints || []),
    segment: parsed.segment,
  };
}

/**
 * Resolve segment endpoints and serialize a caller-specific measurement.
 * @param {string} input Serialized request.
 * @param {(input: string) => ReturnType<typeof parseSegmentMeasurementInput>} parse Caller-specific parser policy.
 * @param {(start: Record<string, any>, end: Record<string, any>) => string} measure Measurement formatter.
 * @param {string} unit Result unit.
 * @returns {string} Serialized value/unit or original error message.
 */
export function measureSpacetimeSegment(input, parse, measure, unit) {
  return runToyCalculation(() => {
    const { points, segment } = parse(input);
    const byId = new Map(points.map(point => [point.pointId, point]));
    const start = byId.get(segment.startPointId);
    const end = byId.get(segment.endPointId);
    if (!start || !end) throw new Error('Segment references an unknown point.');
    return JSON.stringify({ value: measure(start, end), unit });
  }, 0);
}
