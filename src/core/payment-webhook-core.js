import { ensureString, isNonNullObject } from './commonCore.js';

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
function resolvePaymentWebhookDependencies(deps = {}) {
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
  } = deps;

  assertWebhookDependency(fetchCredit, 'fetchCredit');
  assertWebhookDependency(applyCreditEvent, 'applyCreditEvent');
  assertWebhookDependency(resolveApiKeyUuid, 'resolveApiKeyUuid');

  return {
    fetchCredit,
    applyCreditEvent,
    resolveApiKeyUuid: async event => resolveApiKeyUuid(event),
    isDuplicateEvent: async eventId => Boolean(await isDuplicateEvent(eventId)),
    markProcessedEvent: async (event, uuid) => markProcessedEvent(event, uuid),
    logger,
    allowedEventTypes,
    getAmountFromEvent,
    getPaymentEvent: async request => getPaymentEvent(request),
  };
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

  const typed = /** @type {{ body?: unknown }} */ (request);
  if (isNonNullObject(typed.body) && typeof typed.body.id === 'string') {
    return /** @type {PaymentEvent} */ (typed.body);
  }

  throw new TypeError('request body must be a payment event object');
}

/**
 * Resolve metadata from a payment object.
 * @param {Record<string, unknown>} object Payment object.
 * @returns {Record<string, string>} Normalized metadata.
 */
export function readMetadata(object) {
  const metadata = object.metadata;
  if (!isNonNullObject(metadata)) {
    return {};
  }

  /** @type {Record<string, string>} */
  const values = {};
  for (const [key, value] of Object.entries(metadata)) {
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
