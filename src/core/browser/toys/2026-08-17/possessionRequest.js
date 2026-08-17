// Toy: Possession Request
// (input, env) -> string

/**
 * Normalize and validate the customer context for an object-minute rental.
 * @param {string} input JSON payload containing a possession request.
 * @returns {string} Deterministic validation result.
 */
export function possessionRequest(input) {
  const parsed = parseInput(input);
  const errors = [];
  const request = normalizeRequest(parsed, errors);

  if (errors.length > 0) {
    return JSON.stringify({ valid: false, errors }, null, 2);
  }

  return JSON.stringify({ valid: true, request }, null, 2);
}

/**
 * Parse a JSON request payload.
 * @param {string} input JSON payload.
 * @returns {Record<string, any>} Parsed object or an empty object.
 */
function parseInput(input) {
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/**
 * Normalize the request fields and collect validation errors.
 * @param {Record<string, any>} value Parsed request.
 * @param {string[]} errors Validation error collection.
 * @returns {Record<string, any>} Normalized request.
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
 * Normalize and validate a geographic location.
 * @param {any} value Candidate location.
 * @param {string} name Location field name.
 * @param {string[]} errors Validation error collection.
 * @returns {{lat: number|null, lon: number|null}} Normalized coordinates.
 */
function normalizeLocation(value, name, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${name} must contain numeric lat and lon`);
    return { lat: null, lon: null };
  }

  const lat = normalizeCoordinate(value.lat, `${name}.lat`, [-90, 90], errors);
  const lon = normalizeCoordinate(
    value.lon,
    `${name}.lon`,
    [-180, 180],
    errors
  );
  return {
    lat,
    lon,
  };
}

/**
 * Normalize and validate one coordinate.
 * @param {any} value Candidate coordinate.
 * @param {string} name Coordinate field name.
 * @param {[number, number]} bounds Inclusive lower and upper bounds.
 * @param {string[]} errors Validation error collection.
 * @returns {number|null} Rounded coordinate or null when invalid.
 */
function normalizeCoordinate(value, name, bounds, errors) {
  const coordinate = number(value);
  const [minimum, maximum] = bounds;
  if (coordinate === null || coordinate < minimum || coordinate > maximum) {
    errors.push(`${name} must be between ${minimum} and ${maximum}`);
    return null;
  }
  return roundCoordinate(coordinate);
}

/**
 * Normalize a UTC minute timestamp.
 * @param {any} value Candidate timestamp.
 * @param {string} name Timestamp field name.
 * @param {string[]} errors Validation error collection.
 * @returns {string|null} Normalized timestamp or null when invalid.
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
 * Return a finite numeric value.
 * @param {any} value Candidate value.
 * @returns {number|null} Finite number or null.
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
 * @param {any} value Candidate value.
 * @returns {string} Trimmed string or an empty string.
 */
function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
