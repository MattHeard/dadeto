import { createEffectHttpBoundary } from '../allow-effects.js';

/**
 * Compose the public offers query and authenticated refund command boundary.
 * @param {() => Promise<{status: number, body: object}>} handleOffers Pure offers handler.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, response: import('../../../types/native-http').NativeHttpResponse, result: {status: number, body: unknown, format: 'json' | 'text'}) => unknown} sendResponse Permission-aware response adapter.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, request: {authorization?: unknown, purchaseId?: unknown, idempotencyKey?: unknown}) => Promise<{status: number, body: unknown}>} [handleRefund] Authenticated refund handler.
 * @returns {(request: import('../../../types/native-http').NativeHttpRequest, response: import('../../../types/native-http').NativeHttpResponse) => Promise<void>} Public HTTP handler.
 */
export function createBillingHttpHandler(
  handleOffers,
  sendResponse,
  handleRefund = null
) {
  return createEffectHttpBoundary(async (permission, req, res) => {
    if (req.method === 'POST' && handleRefund) {
      const requestBody =
        req.body && typeof req.body === 'object'
          ? /** @type {Record<string, unknown>} */ (req.body)
          : {};
      const result = await handleRefund(permission, {
        authorization:
          req.get?.('authorization') ?? req.headers?.authorization,
        purchaseId: requestBody.purchaseId,
        idempotencyKey:
          req.get?.('idempotency-key') ?? req.headers?.['idempotency-key'],
      });
      sendResponse(permission, res, { ...result, format: 'json' });
      return;
    }
    if (req.method !== 'GET') {
      sendResponse(permission, res, {
        status: 405,
        body: 'Method not allowed',
        format: 'text',
      });
      return;
    }

    const result = await handleOffers();
    sendResponse(permission, res, { ...result, format: 'json' });
  });
}
