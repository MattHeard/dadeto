import { createEffectHttpBoundary } from '../allow-effects.js';

/**
 * Compose public offers data with a permission-aware HTTP boundary.
 * @param {() => Promise<{status: number, body: object}>} handleOffers Pure offers handler.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, response: import('../../../types/native-http').NativeHttpResponse, result: {status: number, body: unknown, format: 'json' | 'text'}) => unknown} sendResponse Permission-aware response adapter.
 * @returns {(request: import('../../../types/native-http').NativeHttpRequest, response: import('../../../types/native-http').NativeHttpResponse) => Promise<void>} Public HTTP handler.
 */
export function createPublicBillingOffersHttpHandler(
  handleOffers,
  sendResponse
) {
  return createEffectHttpBoundary(async (permission, req, res) => {
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
