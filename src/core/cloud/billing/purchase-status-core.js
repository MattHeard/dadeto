// @ts-nocheck -- authentication and persistence are injected boundaries.
/**
 * Create an authenticated, read-only purchase status handler.
 * @param {{ verifyIdToken: (token: string) => Promise<{ uid?: string }>, getPurchaseByCheckoutSession: (id: string) => Promise<Record<string, unknown>|null>, getBalance: (uuid: string) => Promise<number|null> }} deps Status dependencies.
 * @returns {(request: { sessionId?: unknown, authorization?: unknown }) => Promise<{ status: number, body: object }>} Status handler.
 */
export function createPurchaseStatusHandler(deps) {
  return async function handlePurchaseStatus(request) {
    if (typeof request.sessionId !== 'string' || !request.sessionId)
      return { status: 400, body: { error: 'invalid_session' } };
    const token = resolveBearerToken(request.authorization);
    if (!token)
      return { status: 401, body: { error: 'authentication_required' } };
    let claims;
    try {
      claims = await deps.verifyIdToken(token);
    } catch {
      return { status: 401, body: { error: 'authentication_required' } };
    }
    const purchase = await deps.getPurchaseByCheckoutSession(request.sessionId);
    if (!purchase || purchase.uid !== claims.uid)
      return { status: 404, body: { error: 'purchase_not_found' } };
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
