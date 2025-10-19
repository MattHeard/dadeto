/**
 * Parse the static config fetch response, enforcing a successful status.
 * @param {Response} response - Fetch response for the config.json request.
 * @returns {Promise<Record<string, unknown>>} Parsed configuration payload.
 */
export async function parseStaticConfigResponse(response) {
  if (!response.ok) {
    throw new Error(`Failed to load static config: ${response.status}`);
  }

  return response.json();
}
