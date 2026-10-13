import { authenticatePurchaseRequest } from './authentication-core.js';

/**
 * Create an authenticated, read-only purchase status handler.
 * @param {{ verifyIdToken: (token: string) => Promise<{ uid?: string }>, getPurchaseByCheckoutSession: (id: string) => Promise<(Record<string, unknown> & {uid?: string, status?: string, purchaseId?: string, packageId?: string, creditsIssued?: number, apiKeyUuid: string})|null>, getBalance: (uuid: string) => Promise<number|null> }} deps Status dependencies.
 * @returns {(request: { sessionId?: unknown, authorization?: unknown }) => Promise<{ status: number, body: object }>} Status handler.
 */
export function createPurchaseStatusHandler(deps) {
  return async function handlePurchaseStatus(request) {
    if (typeof request.sessionId !== 'string' || !request.sessionId)
      return { status: 400, body: { error: 'invalid_session' } };
    const result = await authenticatePurchaseRequest({
      authorization: request.authorization,
      parseToken: resolveBearerToken,
      verifyIdToken: deps.verifyIdToken,
      purchaseId: request.sessionId,
      loadPurchase: deps.getPurchaseByCheckoutSession,
    });
    if ('response' in result) return result.response;
    const { purchase } = result;
    /** @type {Record<string, unknown>} */
    const body = {
      status: purchase.status,
      purchaseId: purchase.purchaseId,
      packageId: purchase.packageId,
      creditsIssued: purchase.creditsIssued,
    };
    if (purchase.status === 'paid')
      body.credit = await deps.getBalance(purchase.apiKeyUuid);
    return { status: 200, body };
  };
}

/**
 * Extract a bearer token without accepting arbitrary authorization values.
 * @param {unknown} authorization Authorization header.
 * @returns {string} Token or empty string.
 */
function resolveBearerToken(authorization) {
  if (typeof authorization !== 'string') return '';
  return authorization.replace(/^Bearer\s+/i, '');
}
