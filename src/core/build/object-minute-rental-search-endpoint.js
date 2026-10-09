export const LOCAL_OBJECT_MINUTE_RENTAL_SEARCH_ENDPOINT =
  '/__sim/object-minute-rental-search';

/**
 * Apply the deployment-selected endpoint to the static rental search page.
 * @param {{html: string, target: 'local'|'production', productionEndpoint?: string}} options Page and environment configuration.
 * @returns {string} Page markup with one concrete endpoint.
 */
export function renderObjectMinuteRentalSearchEndpoint({
  html,
  target,
  productionEndpoint,
}) {
  if (target !== 'local' && target !== 'production') {
    throw new Error(`Unsupported rental search build target: ${target}`);
  }
  const matches = html.match(/data-search-endpoint="[^"]*"/g) ?? [];
  if (matches.length !== 1) {
    throw new Error('Expected exactly one rental search endpoint placeholder.');
  }

  const endpoint =
    target === 'local'
      ? LOCAL_OBJECT_MINUTE_RENTAL_SEARCH_ENDPOINT
      : requireProductionEndpoint(productionEndpoint);
  return html.replace(
    matches[0],
    `data-search-endpoint="${escapeAttribute(endpoint)}"`
  );
}

/**
 * Validate an externally deployed endpoint before embedding it in static HTML.
 * @param {string|undefined} endpoint Candidate URL.
 * @returns {string} Valid HTTPS URL.
 */
function requireProductionEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || !endpoint.trim()) {
    throw new Error('Production rental search endpoint is required.');
  }
  const normalized = endpoint.trim();
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Production rental search endpoint must be an HTTPS URL.');
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Production rental search endpoint must be an HTTPS URL.');
  }
  return normalized;
}

/**
 * Escape a URL for an HTML attribute.
 * @param {string} value Attribute content.
 * @returns {string} Escaped content.
 */
function escapeAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}
