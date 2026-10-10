/** @type {Parameters<typeof import('../../render-contents-core.js').createRenderContents>[0]['setHttpResponseHeader']} */
export function setSimulatorHttpResponseHeader(
  permission,
  response,
  name,
  value
) {
  void permission;
  response.set(name, value);
}

/** @type {Parameters<typeof import('../../render-contents-core.js').createRenderContents>[0]['sendHttpResponse']} */
export function sendSimulatorHttpResponse(permission, response, result) {
  void permission;
  const target = response.status(result.status);
  target[result.method](result.body);
}

/** @type {(permission: import('../../../../types/allow-effects').AllowEffects, message: string, error?: unknown) => void} */
export function logSimulatorRenderContentsError(permission, message, error) {
  void permission;
  console.error?.(message, error);
}
