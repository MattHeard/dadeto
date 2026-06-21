import { ensureString, isNonNullObject } from './commonCore.js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_ALLOWED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'payment_intent.succeeded',
  'charge.refunded',
  'charge.dispute.created',
]);

/**
 * @typedef {{
 *   id: string,
 *   type: string,
 *   data?: { object?: Record<string, unknown> },
 *   livemode?: boolean,
 *   created?: number,
 *   api_version?: string,
 *   request?: { id?: string | null, idempotency_key?: string | null } | null,
 * }} PaymentEvent
 */

/**
 * @typedef {{
 *   rawBody?: string | Buffer,
 *   body?: unknown,
 *   headers?: Record<string, string | string[] | undefined>,
 * }} PaymentWebhookRequest
 */

/**
 * @typedef {{
 *   status: number,
 *   body: string | Record<string, unknown>,
 *   headers?: Record<string, string>,
 * }} PaymentWebhookResponse
 */

/**
 * @typedef {{
 *   fetchCredit: (uuid: string) => Promise<number | null>,
 *   applyCreditEvent: (uuid: string, event: { type: 'credit_added' | 'credit_deducted', eventId: string, amount: number }) => Promise<PaymentWebhookResponse>,
 *   resolveApiKeyUuid: (event: PaymentEvent) => Promise<string | null> | string | null,
 *   isDuplicateEvent?: (eventId: string) => Promise<boolean> | boolean,
 *   markProcessedEvent?: (event: PaymentEvent, uuid: string) => Promise<void> | void,
 *   logger?: { error: (value: unknown) => void, info: (value: unknown) => void, warn: (value: unknown) => void },
 *   allowedEventTypes?: Set<string>,
 *   getAmountFromEvent?: (event: PaymentEvent) => number,
 *   getPaymentEvent?: (request: unknown) => Promise<PaymentEvent>,
 * }} PaymentWebhookDependencies
 */

/**
 * Create a payment webhook handler that translates successful payment events into credit ledger events.
 * @param {PaymentWebhookDependencies} deps Webhook dependencies.
 * @returns {(request?: unknown) => Promise<PaymentWebhookResponse>} Request handler.
 */
export function createPaymentWebhookHandler(deps) {
  const resolved = resolvePaymentWebhookDependencies(deps);
  return async function handlePaymentWebhook(request = {}) {
    const event = await resolved.getPaymentEvent(request);
    if (!resolved.allowedEventTypes.has(event.type)) {
      return { status: 200, body: { ignored: true, type: event.type } };
    }

    if (await resolved.isDuplicateEvent(event.id)) {
      return { status: 200, body: { duplicate: true, eventId: event.id } };
    }

    const uuid = await resolved.resolveApiKeyUuid(event);
    if (!uuid) {
      return { status: 400, body: 'Missing api key mapping' };
    }

    const amount = resolved.getAmountFromEvent(event);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 400, body: 'Missing or invalid credit amount' };
    }

    const creditEvent = buildCreditEvent(event, amount);
    const response = await resolved.applyCreditEvent(uuid, creditEvent);
    await resolved.markProcessedEvent(event, uuid);
    return response;
  };
}

/**
 * Resolve and validate webhook dependencies.
 * @param {PaymentWebhookDependencies | undefined} deps Dependencies.
 * @returns {{
 *   fetchCredit: (uuid: string) => Promise<number | null>,
 *   applyCreditEvent: (uuid: string, event: { type: 'credit_added' | 'credit_deducted', eventId: string, amount: number }) => Promise<PaymentWebhookResponse>,
 *   resolveApiKeyUuid: (event: PaymentEvent) => Promise<string | null>,
 *   isDuplicateEvent: (eventId: string) => Promise<boolean>,
 *   markProcessedEvent: (event: PaymentEvent, uuid: string) => Promise<void>,
 *   logger: { error: (value: unknown) => void, info: (value: unknown) => void, warn: (value: unknown) => void },
 *   allowedEventTypes: Set<string>,
 *   getAmountFromEvent: (event: PaymentEvent) => number,
 *   getPaymentEvent: (request: unknown) => Promise<PaymentEvent>,
 * }} Runtime webhook dependencies.
 */
function resolvePaymentWebhookDependencies(deps) {
  const typedDeps = /** @type {Partial<PaymentWebhookDependencies>} */ (
    deps ?? {}
  );
  const {
    fetchCredit,
    applyCreditEvent,
    resolveApiKeyUuid,
    isDuplicateEvent = async () => false,
    markProcessedEvent = async () => {},
    logger = console,
    allowedEventTypes = DEFAULT_ALLOWED_EVENT_TYPES,
    getAmountFromEvent = defaultGetAmountFromEvent,
    getPaymentEvent = async request => extractPaymentEvent(request),
  } = typedDeps;

  assertWebhookDependency(fetchCredit, 'fetchCredit');
  assertWebhookDependency(applyCreditEvent, 'applyCreditEvent');
  assertWebhookDependency(resolveApiKeyUuid, 'resolveApiKeyUuid');

  return {
    fetchCredit: toCallable(fetchCredit),
    applyCreditEvent: toCallable(applyCreditEvent),
    resolveApiKeyUuid: async event => toCallable(resolveApiKeyUuid)(event),
    isDuplicateEvent: async eventId =>
      Boolean(
        await /** @type {(eventId: string) => Promise<boolean> | boolean} */ (
          isDuplicateEvent
        )(eventId)
      ),
    markProcessedEvent: async (event, uuid) =>
      /** @type {(event: PaymentEvent, uuid: string) => Promise<void> | void} */ (
        markProcessedEvent
      )(event, uuid),
    logger,
    allowedEventTypes,
    getAmountFromEvent,
    getPaymentEvent: async request => getPaymentEvent(request),
  };
}

/**
 * Coerce a dependency into a callable value.
 * @template {(...args: Array<any>) => any} T
 * @param {T | undefined} dependency Dependency to wrap.
 * @returns {T} Callable dependency.
 */
function toCallable(dependency) {
  return /** @type {T} */ (dependency);
}

/**
 * Derive the credit event type from the payment event.
 * @param {PaymentEvent} event Payment event payload.
 * @param {number} amount Amount to apply.
 * @returns {{ type: 'credit_added' | 'credit_deducted', eventId: string, amount: number }} Ledger event.
 */
function buildCreditEvent(event, amount) {
  if (
    event.type === 'charge.refunded' ||
    event.type === 'charge.dispute.created'
  ) {
    return { type: 'credit_deducted', eventId: event.id, amount };
  }

  return { type: 'credit_added', eventId: event.id, amount };
}

/**
 * Resolve the amount from a payment event.
 * @param {PaymentEvent} event Payment event payload.
 * @returns {number} Credit amount.
 */
export function defaultGetAmountFromEvent(event) {
  const object = event.data?.object ?? {};
  const metadata = readMetadata(object);
  return parsePositiveInteger(
    metadata.credit_amount ??
      metadata.creditAmount ??
      metadata.credits ??
      metadata.units
  );
}

/**
 * Extract a payment event from an input request.
 * @param {unknown} request Request-like input.
 * @returns {Promise<PaymentEvent>} Parsed event object.
 */
export async function extractPaymentEvent(request) {
  if (!isNonNullObject(request)) {
    throw new TypeError('request must be an object');
  }

  const typed = /** @type {PaymentWebhookRequest} */ (request);
  const body = /** @type {PaymentEvent | unknown} */ (typed.body);
  if (isNonNullObject(body)) {
    const event = /** @type {{ id?: unknown }} */ (body);
    if (typeof event.id === 'string') {
      return /** @type {PaymentEvent} */ (body);
    }
  }

  throw new TypeError('request body must be a payment event object');
}

/**
 * Resolve metadata from a payment object.
 * @param {Record<string, unknown>} object Payment object.
 * @returns {Record<string, string>} Normalized metadata.
 */
export function readMetadata(object) {
  const metadata = /** @type {unknown} */ (object.metadata);
  if (!isNonNullObject(metadata)) {
    return {};
  }

  /** @type {Record<string, string>} */
  const values = {};
  for (const [key, value] of Object.entries(
    /** @type {Record<string, unknown>} */ (metadata)
  )) {
    if (typeof value === 'string' && value.length > 0) {
      values[key] = value;
    }
  }

  return values;
}

/**
 * Parse a positive integer from a metadata field.
 * @param {unknown} value Candidate value.
 * @returns {number} Parsed amount or zero.
 */
export function parsePositiveInteger(value) {
  const text = ensureString(value);
  const parsed = Number.parseInt(text, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

/**
 * Create a webhook resolver that reads the api key UUID from payment metadata or mapped customer rows.
 * @param {{
 *   findApiKeyUuidByCustomerId?: (customerId: string) => Promise<string | null> | string | null,
 * }} deps Lookup dependencies.
 * @returns {(event: PaymentEvent) => Promise<string | null>} Resolver that maps payment events to API key UUIDs.
 */
export function createResolveApiKeyUuid(deps = {}) {
  const { findApiKeyUuidByCustomerId = async () => null } = deps;
  return async event => {
    const object = event.data?.object ?? {};
    const metadata = readMetadata(object);
    const direct = firstNonEmptyString([
      metadata.api_key_uuid,
      metadata.apiKeyUuid,
      metadata.uuid,
      metadata.customer_uuid,
      metadata.customerUuid,
      ensureString(object.client_reference_id),
    ]);
    if (direct) {
      return direct;
    }

    const customerId = firstNonEmptyString([
      ensureString(object.customer),
      ensureString(object.customer_id),
    ]);
    if (!customerId) {
      return null;
    }

    return findApiKeyUuidByCustomerId(customerId);
  };
}

/**
 * Read the first non-empty string in a list.
 * @param {Array<unknown>} values Candidate values.
 * @returns {string} First usable string.
 */
export function firstNonEmptyString(values) {
  for (const value of values) {
    const text = ensureString(value);
    if (text) {
      return text;
    }
  }

  return '';
}

/**
 * Extract a raw payment webhook payload from a request-like object.
 * @param {unknown} request Request-like input.
 * @returns {string} Raw payload text when available.
 */
export function extractRawPayload(request) {
  const typed = /** @type {PaymentWebhookRequest | null | undefined} */ (
    request
  );
  const rawBody = typed?.rawBody;
  if (typeof rawBody === 'string') {
    return rawBody;
  }

  if (Buffer.isBuffer(rawBody)) {
    return rawBody.toString('utf8');
  }

  return resolvePayloadBody(typed?.body);
}

/**
 * Extract a header value from a request-like object.
 * @param {unknown} request Request-like input.
 * @param {string} name Header name.
 * @returns {string} Header value or an empty string.
 */
export function extractHeader(request, name) {
  const typed = /** @type {PaymentWebhookRequest | null | undefined} */ (
    request
  );
  const headers = typed?.headers ?? {};
  const lower = name.toLowerCase();
  const value = headers[name] ?? headers[lower];
  return ensureString(value);
}

/**
 * Resolve a request body into a string payload.
 * @param {unknown} body Request body.
 * @returns {string} Payload string.
 */
function resolvePayloadBody(body) {
  if (typeof body === 'string') {
    return body;
  }

  if (body && typeof body === 'object') {
    return JSON.stringify(body);
  }

  return '';
}

/**
 * Parse a JSON payment event body.
 * @param {string} payload JSON payload.
 * @returns {PaymentEvent} Parsed event.
 */
export function parseJsonEvent(payload) {
  const parsed = JSON.parse(payload);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string') {
    throw new TypeError('Invalid payment event payload');
  }

  return parsed;
}

/**
 * Verify a payment webhook signature.
 * @param {string} payload Raw payload.
 * @param {string} signature Signature header.
 * @param {string} secret Webhook secret.
 * @returns {boolean} True when signature matches.
 */
export function verifyPaymentSignature(payload, signature, secret) {
  const parts = Object.fromEntries(
    signature.split(',').map(part => {
      const [key, value] = part.split('=');
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const actual = createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return safeEqual(actual, expected);
}

/**
 * Compare two strings in constant time when lengths match.
 * @param {string} actual Actual value.
 * @param {string} expected Expected value.
 * @returns {boolean} True when the values match.
 */
export function safeEqual(actual, expected) {
  const left = Buffer.from(actual, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

/**
 * Ensure a required dependency is callable.
 * @param {unknown} dependency Candidate dependency.
 * @param {string} name Dependency name.
 * @returns {void}
 */
function assertWebhookDependency(dependency, name) {
  if (typeof dependency !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}
