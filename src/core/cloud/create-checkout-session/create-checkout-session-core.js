const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @typedef {{ packageId: string }} CheckoutBody
 */
/**
 * @typedef {{ method?: string, headers?: Record<string, string | undefined>, body?: Record<string, unknown> & { packageId?: string } }} CheckoutRequest
 */
/**
 * @typedef {{ status: number, body: object }} CheckoutResponse
 */
/**
 * @typedef {{
 * verifyIdToken: (token: string) => Promise<{ uid?: string }>,
 * resolveApiKeyUuidForUid: (uid: string) => Promise<{ apiKeyUuid?: string } | null>,
 * resolveBillingCustomer: (uid: string) => Promise<{ stripeCustomerId?: string } | null>,
 * createBillingCustomer: (options: object) => Promise<{ stripeCustomerId: string }>,
 * saveCustomerMappings: (uid: string, customerId: string, apiKeyUuid: string) => Promise<unknown>,
 * getCreditPackage: (packageId: string) => Promise<{ active?: boolean, stripePriceId?: string, credits?: number } | null>,
 * createStripeCheckoutSession: (options: object, options2: object) => Promise<{ id: string, url: string, expires_at: number }>,
 * publicBillingOrigin?: string,
 * resolveIdempotency?: (uid: string, key: string, packageId: string) => Promise<{ conflict?: boolean, session?: object } | null>,
 * saveIdempotency?: (uid: string, key: string, value: object) => Promise<unknown>,
 * logger?: { error?: (...args: unknown[]) => void }
 * }} CheckoutDependencies
 */

/**
 * Build an error response.
 * @param {number} status HTTP response status.
 * @param {string} code Stable application error code.
 * @param {string} message Human-readable error message.
 * @returns {{ status: number, body: { error: { code: string, message: string } } }} Error response.
 */
function error(status, code, message) {
  return { status, body: { error: { code, message } } };
}

/**
 * Read the authorization header from a request.
 * @param {CheckoutRequest} request Incoming request.
 * @returns {string} Authorization header value, or an empty string.
 */
function authorization(request) {
  const value =
    request.headers?.authorization ?? request.headers?.Authorization;
  if (typeof value === 'string') {
    return value;
  }
  return '';
}

/**
 * Convert a Stripe failure into an application error response.
 * @param {{ type?: string, code?: string } | undefined} cause Stripe failure.
 * @returns {{ status: number, body: { error: { code: string, message: string } } }} Error response.
 */
function stripeError(cause) {
  if (cause?.type === 'StripeAuthenticationError')
    return error(
      502,
      'payment_provider_unavailable',
      'The payment provider is unavailable.'
    );
  if (cause?.type === 'StripeRateLimitError')
    return error(429, 'rate_limited', 'Too many purchase attempts.');
  if (cause?.code === 'idempotency_key_in_use')
    return idempotencyConflictError();
  return error(
    502,
    'payment_provider_unavailable',
    'The payment provider is unavailable.'
  );
}

/** @returns {CheckoutResponse} Idempotency conflict response. */
function idempotencyConflictError() {
  return error(
    409,
    'idempotency_conflict',
    'This purchase attempt was already used with different parameters.'
  );
}

/**
 * Validate and narrow a credit package.
 * @param {Awaited<ReturnType<CheckoutDependencies['getCreditPackage']>>} creditPackage Package to validate.
 * @returns {{ stripePriceId: string, credits: number } | null} Valid package details.
 */
function validCreditPackage(creditPackage) {
  if (
    !creditPackage?.active ||
    typeof creditPackage.stripePriceId !== 'string' ||
    typeof creditPackage.credits !== 'number' ||
    !Number.isInteger(creditPackage.credits) ||
    creditPackage.credits <= 0
  ) {
    return null;
  }
  return {
    stripePriceId: creditPackage.stripePriceId,
    credits: creditPackage.credits,
  };
}

/**
 * Validate request fields and verify its bearer token.
 * @param {CheckoutRequest} request Incoming checkout request.
 * @param {CheckoutDependencies['verifyIdToken']} verifyIdToken Token verifier.
 * @returns {Promise<{ auth: string, key: string, packageId: string, uid: string } | CheckoutResponse>} Validated request or error.
 */
async function validateCheckoutRequest(request, verifyIdToken) {
  const methodError = validateMethod(request);
  if (methodError) return methodError;
  const auth = readAuth(request);
  if (typeof auth !== 'string') return auth;
  const key = readKey(request);
  if (typeof key !== 'string') return key;
  const bodyError = validateBody(request);
  if (bodyError) return bodyError;
  let token;
  try {
    token = await verifyIdToken(auth.slice(7).trim());
  } catch {
    return error(
      401,
      'invalid_token',
      'The authentication token is invalid or expired.'
    );
  }
  if (!token?.uid)
    return error(401, 'invalid_token', 'The authentication token is invalid.');
  return { auth, key, packageId: request.body.packageId, uid: token.uid };
}

/**
 * Validate the HTTP method.
 * @param {CheckoutRequest} request Request.
 * @returns {CheckoutResponse | null} Error if invalid.
 */
function validateMethod(request) {
  if (request.method && request.method !== 'POST')
    return error(405, 'method_not_allowed', 'Only POST is allowed.');
  return null;
}

/**
 * Read and validate authorization.
 * @param {CheckoutRequest} request Request.
 * @returns {string | CheckoutResponse} Auth or error.
 */
function readAuth(request) {
  const auth = authorization(request);
  if (!auth)
    return error(401, 'authentication_required', 'Authentication is required.');
  if (!/^Bearer\s+\S+$/.test(auth))
    return error(401, 'invalid_token', 'The authentication token is invalid.');
  return auth;
}

/**
 * Read and validate the idempotency key.
 * @param {CheckoutRequest} request Request.
 * @returns {string | CheckoutResponse} Key or error.
 */
function readKey(request) {
  const key =
    request.headers?.['idempotency-key'] ??
    request.headers?.['Idempotency-Key'];
  if (typeof key !== 'string' || !UUID.test(key))
    return error(
      400,
      'invalid_idempotency_key',
      'A valid idempotency key is required.'
    );
  return key;
}

/**
 * Validate the checkout body.
 * @param {CheckoutRequest} request Request.
 * @returns {CheckoutResponse | null} Error if invalid.
 */
function validateBody(request) {
  if (
    !request.body ||
    typeof request.body !== 'object' ||
    Array.isArray(request.body)
  )
    return error(400, 'invalid_request', 'A JSON request body is required.');
  if (
    Object.keys(request.body).length !== 1 ||
    typeof request.body.packageId !== 'string'
  )
    return error(400, 'invalid_request', 'A packageId is required.');
  return null;
}

/**
 * Resolve an idempotent checkout result.
 * @param {CheckoutDependencies['resolveIdempotency']} resolveIdempotency Resolver.
 * @param {string} uid User identifier.
 * @param {string} key Idempotency key.
 * @param {string} packageId Package identifier.
 * @returns {Promise<CheckoutResponse | null>} Existing result or no result.
 */
async function resolveExisting(resolveIdempotency, uid, key, packageId) {
  const existing = await resolveIdempotency?.(uid, key, packageId);
  if (existing?.conflict) return idempotencyConflictError();
  if (existing?.session) return { status: 201, body: existing.session };
  return null;
}

/**
 * Resolve or create a billing customer.
 * @param {{ resolveBillingCustomer: CheckoutDependencies['resolveBillingCustomer'], createBillingCustomer: CheckoutDependencies['createBillingCustomer'], saveCustomerMappings: CheckoutDependencies['saveCustomerMappings'], uid: string, apiKeyUuid: string }} input Customer inputs.
 * @returns {Promise<{ stripeCustomerId: string }>} Billing customer.
 */
async function resolveCustomer({
  resolveBillingCustomer,
  createBillingCustomer,
  saveCustomerMappings,
  uid,
  apiKeyUuid,
}) {
  let customer = await resolveBillingCustomer(uid);
  if (customer?.stripeCustomerId) return customer;
  customer = await createBillingCustomer({
    metadata: { ['firebase_uid']: uid, ['api_key_uuid']: apiKeyUuid },
    idempotencyKey: `billing-customer:${uid}`,
  });
  if (!customer.stripeCustomerId) throw new Error('Customer ID missing');
  await saveCustomerMappings(uid, customer.stripeCustomerId, apiKeyUuid);
  return customer;
}

/**
 * Check that an owned key and billing origin are available.
 * @param {CheckoutDependencies['resolveApiKeyUuidForUid']} resolveApiKeyUuidForUid Key resolver.
 * @param {string | undefined} publicBillingOrigin Billing origin.
 * @param {string} uid User identifier.
 * @returns {Promise<{ apiKeyUuid: string } | CheckoutResponse>} Ownership or error.
 */
async function resolveCheckoutOwnership(
  resolveApiKeyUuidForUid,
  publicBillingOrigin,
  uid
) {
  const ownership = await resolveApiKeyUuidForUid(uid);
  if (!ownership?.apiKeyUuid)
    return error(
      403,
      'api_key_unavailable',
      'No eligible API key is available.'
    );
  if (typeof publicBillingOrigin !== 'string' || !publicBillingOrigin)
    return error(500, 'configuration_error', 'Billing is not configured.');
  return ownership;
}

/**
 * Create and persist a Stripe checkout session.
 * @param {CheckoutDependencies} deps Checkout dependencies.
 * @param {{ key: string, packageId: string, uid: string }} input Validated request.
 * @param {{ stripePriceId: string, credits: number }} creditPackage Package details.
 * @param {string} apiKeyUuid Owned API key identifier.
 * @returns {Promise<CheckoutResponse>} Checkout result.
 */
async function createCheckoutResult(
  deps,
  { key, packageId, uid },
  creditPackage,
  apiKeyUuid
) {
  const {
    resolveBillingCustomer,
    createBillingCustomer,
    saveCustomerMappings,
    createStripeCheckoutSession,
    publicBillingOrigin,
    saveIdempotency,
    logger = { error() {} },
  } = deps;
  try {
    const customer = await resolveCustomer({
      resolveBillingCustomer,
      createBillingCustomer,
      saveCustomerMappings,
      uid,
      apiKeyUuid,
    });
    const session = await createStripeCheckoutSession(
      {
        mode: 'payment',
        customer: customer.stripeCustomerId,
        ['line_items']: [{ price: creditPackage.stripePriceId, quantity: 1 }],
        ['client_reference_id']: apiKeyUuid,
        metadata: {
          ['api_key_uuid']: apiKeyUuid,
          ['credit_package_id']: packageId,
          ['credit_amount']: String(creditPackage.credits),
        },
        ['payment_intent_data']: {
          metadata: {
            ['api_key_uuid']: apiKeyUuid,
            ['credit_package_id']: packageId,
            ['credit_amount']: String(creditPackage.credits),
          },
        },
        ['success_url']: `${publicBillingOrigin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        ['cancel_url']: `${publicBillingOrigin}/billing`,
      },
      { idempotencyKey: `checkout-session:${uid}:${key}` }
    );
    const result = {
      checkoutSessionId: session.id,
      url: session.url,
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
    };
    await saveIdempotency?.(uid, key, { packageId, session: result });
    return { status: 201, body: result };
  } catch (cause) {
    logger.error?.('checkout session creation failed', { type: cause?.type });
    return stripeError(cause);
  }
}

/**
 * Create the checkout-session handler.
 * @param {CheckoutDependencies} deps Handler dependencies.
 * @returns {(request?: CheckoutRequest) => Promise<CheckoutResponse>} Checkout request handler.
 */
export function createCheckoutSessionHandler(deps) {
  const {
    verifyIdToken,
    resolveApiKeyUuidForUid,
    getCreditPackage,
    publicBillingOrigin,
    resolveIdempotency,
  } = deps;
  return async function handle(request = {}) {
    const validated = await validateCheckoutRequest(request, verifyIdToken);
    if ('status' in validated) return validated;
    const { key, packageId, uid } = validated;
    const creditPackage = validCreditPackage(await getCreditPackage(packageId));
    if (!creditPackage)
      return error(
        400,
        'invalid_package',
        'The selected credit package is unavailable.'
      );
    const existing = await resolveExisting(
      resolveIdempotency,
      uid,
      key,
      packageId
    );
    if (existing) return existing;
    const ownership = await resolveCheckoutOwnership(
      resolveApiKeyUuidForUid,
      publicBillingOrigin,
      uid
    );
    if ('status' in ownership) return ownership;
    return createCheckoutResult(
      deps,
      { key, packageId, uid },
      creditPackage,
      ownership.apiKeyUuid
    );
  };
}

/**
 * Create the Express adapter for the checkout-session handler.
 * @param {CheckoutDependencies} deps Handler dependencies.
 * @returns {(req: CheckoutRequest, res: { set?: (name: string, value: string) => void, status: (status: number) => { json: (body: unknown) => void } }) => Promise<void>} Express handler.
 */
export function createCheckoutSessionExpressHandle(deps) {
  const handle = createCheckoutSessionHandler(deps);
  return async (req, res) => {
    const result = await handle(req);
    res.set?.('Cache-Control', 'no-store');
    if (result.status === 405) res.set?.('Allow', 'POST');
    res.status(result.status).json(result.body);
  };
}
