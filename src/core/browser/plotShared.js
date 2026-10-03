import { parseJsonOrNull } from '../commonCore.js';

/**
 * Append independent open segments and stroke the complete path once.
 * @param {Pick<CanvasRenderingContext2D, 'moveTo' | 'lineTo' | 'stroke'>} context Drawing context.
 * @param {Iterable<[number, number, number, number]>} segments Lazy endpoint tuples.
 * @returns {void}
 */
export function strokeSegments(context, segments) {
  strokeOpenPaths(context, segmentPaths(segments));
}

/**
 * Convert independent segments to paths without projecting ahead.
 * @param {Iterable<[number, number, number, number]>} segments Endpoints.
 * @yields {Array<[number, number]>} One open path.
 * @returns {Iterable<Array<[number, number]>>} Lazy paths.
 */
function* segmentPaths(segments) {
  for (const [x1, y1, x2, y2] of segments) {
    yield [
      [x1, y1],
      [x2, y2],
    ];
  }
}

/**
 * Append continuous subpaths and stroke them once without closing any path.
 * @param {Pick<CanvasRenderingContext2D, 'moveTo' | 'lineTo' | 'stroke'>} context Drawing context.
 * @param {Iterable<Iterable<[number, number]>>} paths Lazy point sequences.
 * @returns {void}
 */
export function strokeOpenPaths(context, paths) {
  for (const points of paths) {
    let started = false;
    for (const [x, y] of points) {
      if (started) context.lineTo(x, y);
      else context.moveTo(x, y);
      started = true;
    }
  }
  context.stroke();
}

/**
 * Return the value when it is a finite number; otherwise use the fallback.
 * @param {unknown} value Candidate value.
 * @param {number} fallback Fallback number.
 * @returns {number} Normalized number.
 */
export function numberOr(value, fallback) {
  return valueOrFallback(value, fallback, candidate =>
    Number.isFinite(candidate)
  );
}

/**
 * Return the value when it is a non-empty string; otherwise use the fallback.
 * @param {unknown} value Candidate value.
 * @param {string} fallback Fallback string.
 * @returns {string} Normalized string.
 */
export function stringOr(value, fallback) {
  return valueOrFallback(value, fallback, candidate => {
    if (typeof candidate === 'string') return candidate.length > 0;
    return false;
  });
}

/**
 * Return the candidate when it passes the predicate; otherwise use the fallback.
 * @template T
 * @param {unknown} candidate Candidate value.
 * @param {T} fallback Fallback value.
 * @param {(candidate: unknown) => boolean} isValid Predicate for the candidate.
 * @returns {T} Normalized value.
 */
function valueOrFallback(candidate, fallback, isValid) {
  if (!isValid(candidate)) {
    return fallback;
  }
  return /** @type {T} */ (candidate);
}

/**
 * Parse a JSON string into a plain object payload or null.
 * @template T
 * @param {string} inputString JSON input.
 * @param {(payload: Record<string, unknown>) => T} mapPayload Payload mapper.
 * @returns {T | null} Parsed and mapped payload or null.
 */
export function parseObjectPayload(inputString, mapPayload) {
  const parsed = parseJsonOrNull(inputString);
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  return mapPayload(/** @type {Record<string, unknown>} */ (parsed));
}
