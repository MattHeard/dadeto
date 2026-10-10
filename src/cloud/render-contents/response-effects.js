/** @type {(permission: import('../../../types/allow-effects').AllowEffects, response: import('../../../types/native-http').NativeHttpResponse & {set: (name: string, value: string) => unknown}, name: string, value: string) => void} */
export function setHttpResponseHeader(permission, response, name, value) {
  void permission;
  response.set(name, value);
}

/** @type {(permission: import('../../../types/allow-effects').AllowEffects, response: import('../../../types/native-http').NativeHttpResponse, result: {status: number, body: unknown, method: 'send'|'json'}) => void} */
export function sendHttpResponse(permission, response, result) {
  void permission;
  const target = response.status(result.status);
  target[result.method](result.body);
}

/** @type {(permission: import('../../../types/allow-effects').AllowEffects, message: string, error?: unknown) => void} */
export function logRenderContentsError(permission, message, error) {
  void permission;
  console.error?.(message, error);
}
