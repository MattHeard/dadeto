/**
 * Parse the canonical public GCS registry URL.
 * @param {string} registryUrl Candidate registry URL.
 * @returns {URL} Stable HTTPS storage.googleapis.com object URL.
 */
export function parseFunctionEndpointRegistryUrl(registryUrl) {
  let endpoint;
  try {
    endpoint = new URL(registryUrl);
  } catch {
    throw new Error(
      'FUNCTION_ENDPOINT_REGISTRY_URL must be a stable HTTPS GCS registry URL.'
    );
  }

  const pathSegments = endpoint.pathname.split('/').filter(Boolean);
  if (
    endpoint.protocol !== 'https:' ||
    endpoint.hostname !== 'storage.googleapis.com' ||
    endpoint.username !== '' ||
    endpoint.password !== '' ||
    endpoint.search !== '' ||
    endpoint.hash !== '' ||
    pathSegments.length !== 2 ||
    pathSegments[0].trim() === '' ||
    pathSegments[1] !== 'function-endpoints.json'
  ) {
    throw new Error(
      'FUNCTION_ENDPOINT_REGISTRY_URL must be an HTTPS storage.googleapis.com bucket/function-endpoints.json URL.'
    );
  }
  return endpoint;
}
