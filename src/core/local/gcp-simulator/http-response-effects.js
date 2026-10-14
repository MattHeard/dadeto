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

/**
 * Create local response effects for the object-minute search handler.
 * @param {{json: (body: unknown) => unknown, status: (code: number) => {json: (body: unknown) => unknown}, setHeader?: (name: string, value: string) => unknown}} response Local HTTP response.
 * @returns {{setHeader: (permission: import('../../../../types/allow-effects').AllowEffects, name: string, value: string) => unknown, setStatus: (permission: import('../../../../types/allow-effects').AllowEffects, status: number) => unknown, sendJson: (permission: import('../../../../types/allow-effects').AllowEffects, body: unknown, status?: number) => unknown}} Permission-first response effects.
 */
export function createSimulatorSearchHttpResponseEffectAdapters(response) {
  return {
    setHeader(permission, name, value) {
      void permission;
      return response.setHeader?.(name, value);
    },
    setStatus(permission, status) {
      void permission;
      return response.status(status);
    },
    sendJson(permission, body, status) {
      void permission;
      const target = status === undefined ? response : response.status(status);
      return target.json(body);
    },
  };
}

/** @type {(permission: import('../../../../types/allow-effects').AllowEffects, message: string, error?: unknown, logger?: {error?: (...args: unknown[]) => void}) => void} */
export function logSimulatorRenderContentsError(
  permission,
  message,
  error,
  logger
) {
  void permission;
  logger?.error?.(message, error);
}

/**
 * Create the renderer's permission-aware error logger for a supplied console.
 * @param {{error?: (...args: unknown[]) => void}} logger Error logger.
 * @returns {(permission: import('../../../../types/allow-effects').AllowEffects, message: string, error?: unknown) => void} Permission-aware logger.
 */
export function createSimulatorRenderContentsErrorLogger(logger) {
  return (permission, message, error) =>
    logSimulatorRenderContentsError(permission, message, error, logger);
}
