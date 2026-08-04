const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function error(status, code, message) {
  return { status, body: { error: { code, message } } };
}

function authorization(request) {
  const value = request.headers?.authorization ?? request.headers?.Authorization;
  return typeof value === 'string' ? value : '';
}

function stripeError(cause) {
  if (cause?.type === 'StripeAuthenticationError') return error(502, 'payment_provider_unavailable', 'The payment provider is unavailable.');
  if (cause?.type === 'StripeRateLimitError') return error(429, 'rate_limited', 'Too many purchase attempts.');
  if (cause?.code === 'idempotency_key_in_use') return error(409, 'idempotency_conflict', 'This purchase attempt was already used with different parameters.');
  return error(502, 'payment_provider_unavailable', 'The payment provider is unavailable.');
}

/** @param {object} deps */
export function createCheckoutSessionHandler(deps) {
  const {
    verifyIdToken, resolveApiKeyUuidForUid, resolveBillingCustomer,
    createBillingCustomer, saveCustomerMappings, getCreditPackage,
    createStripeCheckoutSession, publicBillingOrigin, now = () => new Date(),
    resolveIdempotency, saveIdempotency, logger = { error() {} },
  } = deps;
  return async function handle(request = {}) {
    if (request.method && request.method !== 'POST') return error(405, 'method_not_allowed', 'Only POST is allowed.');
    const auth = authorization(request);
    if (!auth) return error(401, 'authentication_required', 'Authentication is required.');
    if (!/^Bearer\s+\S+$/.test(auth)) return error(401, 'invalid_token', 'The authentication token is invalid.');
    const key = request.headers?.['idempotency-key'] ?? request.headers?.['Idempotency-Key'];
    if (typeof key !== 'string' || !UUID.test(key)) return error(400, 'invalid_idempotency_key', 'A valid idempotency key is required.');
    if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) return error(400, 'invalid_request', 'A JSON request body is required.');
    if (Object.keys(request.body).length !== 1 || typeof request.body.packageId !== 'string') return error(400, 'invalid_request', 'A packageId is required.');
    let token;
    try { token = await verifyIdToken(auth.slice(7).trim()); } catch { return error(401, 'invalid_token', 'The authentication token is invalid or expired.'); }
    if (!token?.uid) return error(401, 'invalid_token', 'The authentication token is invalid.');
    const uid = token.uid;
    const creditPackage = await getCreditPackage(request.body.packageId);
    if (!creditPackage?.active || typeof creditPackage.stripePriceId !== 'string' || !Number.isInteger(creditPackage.credits) || creditPackage.credits <= 0) return error(400, 'invalid_package', 'The selected credit package is unavailable.');
    const existing = await resolveIdempotency?.(uid, key, request.body.packageId);
    if (existing?.conflict) return error(409, 'idempotency_conflict', 'This purchase attempt was already used with different parameters.');
    if (existing?.session) return { status: 201, body: existing.session };
    const ownership = await resolveApiKeyUuidForUid(uid);
    if (!ownership?.apiKeyUuid) return error(403, 'api_key_unavailable', 'No eligible API key is available.');
    if (typeof publicBillingOrigin !== 'string' || !publicBillingOrigin) return error(500, 'configuration_error', 'Billing is not configured.');
    try {
      let customer = await resolveBillingCustomer(uid);
      if (!customer?.stripeCustomerId) {
        customer = await createBillingCustomer({ metadata: { firebase_uid: uid, api_key_uuid: ownership.apiKeyUuid }, idempotencyKey: `billing-customer:${uid}` });
        await saveCustomerMappings(uid, customer.stripeCustomerId, ownership.apiKeyUuid);
      }
      const session = await createStripeCheckoutSession({ mode: 'payment', customer: customer.stripeCustomerId, line_items: [{ price: creditPackage.stripePriceId, quantity: 1 }], client_reference_id: ownership.apiKeyUuid, metadata: { api_key_uuid: ownership.apiKeyUuid, credit_package_id: request.body.packageId, credit_amount: String(creditPackage.credits) }, payment_intent_data: { metadata: { api_key_uuid: ownership.apiKeyUuid, credit_package_id: request.body.packageId, credit_amount: String(creditPackage.credits) } }, success_url: `${publicBillingOrigin}/billing/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${publicBillingOrigin}/billing` }, { idempotencyKey: `checkout-session:${uid}:${key}` });
      const result = { checkoutSessionId: session.id, url: session.url, expiresAt: new Date(session.expires_at * 1000).toISOString() };
      await saveIdempotency?.(uid, key, { packageId: request.body.packageId, session: result });
      return { status: 201, body: result };
    } catch (cause) { logger.error?.('checkout session creation failed', { type: cause?.type }); return stripeError(cause); }
  };
}

export function createCheckoutSessionExpressHandle(deps) {
  const handle = createCheckoutSessionHandler(deps);
  return async (req, res) => {
    const result = await handle(req);
    res.set?.('Cache-Control', 'no-store');
    if (result.status === 405) res.set?.('Allow', 'POST');
    res.status(result.status).json(result.body);
  };
}
