/**
 * Parse and verify a bearer token using the caller's header policy.
 * @param {unknown} authorization Authorization header.
 * @param {(authorization: unknown) => string} parseToken Header parser.
 * @param {(token: string) => Promise<{uid?: string}>} verifyIdToken Token verifier.
 * @returns {Promise<{uid?: string}|null>} Claims or null when verification fails.
 */
export async function readVerifiedBearerClaims(
  authorization,
  parseToken,
  verifyIdToken
) {
  const token = parseToken(authorization);
  if (!token) return null;
  try {
    return await verifyIdToken(token);
  } catch {
    return null;
  }
}

/**
 * Authenticate a caller and load a purchase owned by that caller.
 * @param {{authorization: unknown, parseToken: (authorization: unknown) => string, verifyIdToken: (token: string) => Promise<{uid?: string}>, purchaseId: string, loadPurchase: (purchaseId: string) => Promise<(Record<string, any> & {uid?: string})|null>}} input Request dependencies and purchase identity.
 * @returns {Promise<{status: 401|404, response: {status: number, body: Record<string, unknown>}}|{status: 200, claims: {uid?: string}, purchase: Record<string, any>}>} Ownership result.
 */
export async function authenticatePurchaseRequest(input) {
  const claims = await readVerifiedBearerClaims(
    input.authorization,
    input.parseToken,
    input.verifyIdToken
  );
  if (!claims)
    return {
      status: 401,
      response: {
        status: 401,
        body: { error: 'authentication_required' },
      },
    };
  const purchase = await input.loadPurchase(input.purchaseId);
  if (!purchase || purchase.uid !== claims.uid)
    return {
      status: 404,
      response: {
        status: 404,
        body: { error: 'purchase_not_found' },
      },
    };
  return { status: 200, claims, purchase };
}
