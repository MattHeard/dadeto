// Toy: Possession Request
// (input, env) -> string

import { parseJsonObjectOrDefault } from '../../parseJsonObjectOrDefault.js';

/**
 * Normalize and validate the customer context for an object-minute rental.
 * @param {string} input JSON payload containing a possession request.
 * @returns {string} Deterministic validation result.
 */
export function possessionRequest(input) {
  const parsed = parseJsonObjectOrDefault(input);
  const errors = [];
  const request = normalizeRequest(parsed, errors);

  if (errors.length > 0) {
    return JSON.stringify({ valid: false, errors }, null, 2);
  }

  return JSON.stringify({ valid: true, request }, null, 2);
}

/**
 * Normalize the request fields and collect validation errors.
 * @param {Record<string, unknown>} value Parsed request.
 * @param {string[]} errors Mutable validation error list.
 * @returns {{ sku: string, deliveryLocation: { lat: number | null, lon: number | null }, deliveryTime: string | null, pickupLocation: { lat: number | null, lon: number | null }, pickupTime: string | null }} Normalized request.
 */
function normalizeRequest(value, errors) {
  const sku = text(value.sku);
  if (!sku) errors.push('sku must be a non-empty string');

  return {
    sku,
    deliveryLocation: normalizeLocation(
      value.deliveryLocation,
      'deliveryLocation',
      errors
    ),
    deliveryTime: normalizeTime(value.deliveryTime, 'deliveryTime', errors),
    pickupLocation: normalizeLocation(
      value.pickupLocation,
      'pickupLocation',
      errors
    ),
    pickupTime: normalizeTime(value.pickupTime, 'pickupTime', errors),
  };
}

/**
 * Normalize a latitude/longitude pair and record invalid values.
 * @param {unknown} value Candidate location.
 * @param {string} name Location field name.
 * @param {string[]} errors Mutable validation error list.
 * @returns {{ lat: number | null, lon: number | null }} Normalized coordinates.
 */
function normalizeLocation(value, name, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${name} must contain numeric lat and lon`);
    return { lat: null, lon: null };
  }

  const lat = number(value.lat);
  const lon = number(value.lon);
  if (!isWithinRange(lat, -90, 90)) {
    errors.push(`${name}.lat must be between -90 and 90`);
  }
  if (!isWithinRange(lon, -180, 180)) {
    errors.push(`${name}.lon must be between -180 and 180`);
  }
  return {
    lat: lat === null ? null : roundCoordinate(lat),
    lon: lon === null ? null : roundCoordinate(lon),
  };
}

/**
 * Check whether a numeric coordinate is within its inclusive bounds.
 * @param {number | null} value Coordinate value.
 * @param {number} minimum Inclusive lower bound.
 * @param {number} maximum Inclusive upper bound.
 * @returns {boolean} Whether the coordinate is valid.
 */
function isWithinRange(value, minimum, maximum) {
  return value !== null && value >= minimum && value <= maximum;
}

/**
 * Normalize a UTC minute value.
 * @param {unknown} value Candidate time.
 * @param {string} name Time field name.
 * @param {string[]} errors Mutable validation error list.
 * @returns {string | null} Normalized UTC minute or null.
 */
function normalizeTime(value, name, errors) {
  const source = text(value);
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})Z$/.exec(source);
  if (!match || Number.isNaN(Date.parse(`${match[1]}:00Z`))) {
    errors.push(`${name} must be a valid UTC minute like 2026-08-21T18:00Z`);
    return null;
  }
  return `${match[1]}Z`;
}

/**
 * Accept a finite number.
 * @param {unknown} value Candidate number.
 * @returns {number | null} Finite number or null.
 */
function number(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

/**
 * Round a coordinate to six decimal places.
 * @param {number} value Coordinate value.
 * @returns {number} Rounded coordinate.
 */
function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

/**
 * Trim a string value.
 * @param {unknown} value Candidate text.
 * @returns {string} Trimmed text or an empty string.
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
