import { createEffectHttpBoundary } from '../allow-effects.js';

/**
 * Compose the pure purchase status handler with permission-aware HTTP output.
 * @param {(request: {sessionId?: unknown, authorization?: unknown}) => Promise<{status: number, body: object}>} handleStatus Pure purchase status operation.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, response: import('../../../types/native-http').NativeHttpResponse, result: {status: number, body: unknown, format: 'json' | 'text'}) => unknown} sendResponse Permission-aware response adapter.
 * @returns {(request: import('../../../types/native-http').NativeHttpRequest, response: import('../../../types/native-http').NativeHttpResponse) => Promise<void>} Public HTTP handler.
 */
export function createPurchaseStatusHttpHandler(handleStatus, sendResponse) {
  return createEffectHttpBoundary(async (permission, req, res) => {
    if (req.method !== 'GET') {
      sendResponse(permission, res, {
        status: 405,
        body: 'Method not allowed',
        format: 'text',
      });
      return;
    }

    const result = await handleStatus({
      sessionId: req.query?.session_id,
      authorization: req.get?.('authorization') ?? req.headers?.authorization,
    });
    sendResponse(permission, res, { ...result, format: 'json' });
  });
}
