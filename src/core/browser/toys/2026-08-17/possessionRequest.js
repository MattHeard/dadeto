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

function normalizeRequest(value, errors) {
  const sku = text(value.sku);
  if (!sku) errors.push('sku must be a non-empty string');

  return {
    sku,
    deliveryLocation: normalizeLocation(value.deliveryLocation, 'deliveryLocation', errors),
    deliveryTime: normalizeTime(value.deliveryTime, 'deliveryTime', errors),
    pickupLocation: normalizeLocation(value.pickupLocation, 'pickupLocation', errors),
    pickupTime: normalizeTime(value.pickupTime, 'pickupTime', errors),
  };
}

function normalizeLocation(value, name, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${name} must contain numeric lat and lon`);
    return { lat: null, lon: null };
  }

  const lat = number(value.lat);
  const lon = number(value.lon);
  if (lat === null || lat < -90 || lat > 90) {
    errors.push(`${name}.lat must be between -90 and 90`);
  }
  if (lon === null || lon < -180 || lon > 180) {
    errors.push(`${name}.lon must be between -180 and 180`);
  }
  return {
    lat: lat === null ? null : roundCoordinate(lat),
    lon: lon === null ? null : roundCoordinate(lon),
  };
}

function normalizeTime(value, name, errors) {
  const source = text(value);
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})Z$/.exec(source);
  if (!match || Number.isNaN(Date.parse(`${match[1]}:00Z`))) {
    errors.push(`${name} must be a valid UTC minute like 2026-08-21T18:00Z`);
    return null;
  }
  return `${match[1]}Z`;
}

function number(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
