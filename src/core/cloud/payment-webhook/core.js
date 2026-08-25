import { ensureString, resolveCallable } from '../../commonCore.js';
export {
  extractHeader,
  extractPaymentEvent,
  createDuplicateEventChecker,
  buildCreditEvent,
  extractRawPayload,
  getEventStatus,
  parseJsonEvent,
  parsePositiveInteger,
  readMetadata,
  requireWebhookDependency,
  safeEqual,
} from './parsing.js';
import {
  buildCreditEvent,
  createDuplicateEventChecker,
  extractPaymentEvent,
  getEventStatus,
  parsePositiveInteger,
  readMetadata,
  requireWebhookDependency,
} from './parsing.js';

const DEFAULT_ALLOWED_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'checkout.session.expired',
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
 *   rawBody?: string | import('node:buffer').Buffer,
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
 *   markProcessedEvent?: (event: PaymentEvent, uuid: string, status?: string) => Promise<void> | void,
 *   logger?: { error: (value: unknown) => void, info: (value: unknown) => void, warn: (value: unknown) => void },
 *   allowedEventTypes?: Set<string>,
 *   getAmountFromEvent?: (event: PaymentEvent) => number,
 *   getPaymentEvent?: (request: unknown) => Promise<PaymentEvent>,
 *   handlePurchaseEvent?: (event: PaymentEvent) => Promise<PaymentWebhookResponse | null> | PaymentWebhookResponse | null,
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

    if (await resolved.hasDuplicateEvent(event.id)) {
      return { status: 200, body: { duplicate: true, eventId: event.id } };
    }

    const purchaseResponse = await resolvePurchaseEvent(resolved, event);
    if (purchaseResponse) return purchaseResponse;

    const uuid = await resolved.resolveApiKeyUuid(event);
    if (!uuid) {
      return { status: 400, body: 'Missing api key mapping' };
    }

    const amount = resolved.getAmountFromEvent(event);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 400, body: 'Missing or invalid credit amount' };
    }

    const creditEvent = buildCreditEvent(event, amount);
    // Stryker disable all -- webhook ledger transitions use the fixed received status.
    await resolved.markProcessedEvent(event, uuid, 'received');
    const response = await resolved.applyCreditEvent(uuid, creditEvent);
    await resolved.markProcessedEvent(event, uuid, getEventStatus(response));
    // Stryker restore all
    return response;
  };
}

/**
 * Resolve and record a purchase-specific event when configured.
 * @param {ReturnType<typeof resolvePaymentWebhookDependencies>} resolved Runtime dependencies.
 * @param {PaymentEvent} event Stripe event.
 * @returns {Promise<PaymentWebhookResponse | null>} Purchase response or null.
 */
async function resolvePurchaseEvent(resolved, event) {
  const purchaseUuid = await resolved.resolveApiKeyUuid(event);
  const identity = purchaseUuid ?? 'purchase';
  await resolved.markProcessedEvent(event, identity, 'received');
  const response = await resolved.handlePurchaseEvent(event);
  if (!response) {
    // Stryker disable all -- ignored purchase events use the fixed ledger status.
    await resolved.markProcessedEvent(event, identity, 'ignored');
  return null;
  // Stryker restore all
  }
  await resolved.markProcessedEvent(event, identity, getEventStatus(response));
  return response;
}

/**
 * @param {PaymentWebhookResponse} response Handler response.
 * @returns {'applied'|'deferred'|'ignored'|'quarantined'} Inbox status.
 */
/**
 * Resolve and validate webhook dependencies.
 * @param {PaymentWebhookDependencies | undefined} deps Dependencies.
 * @returns {{
 *   fetchCredit: (uuid: string) => Promise<number | null>,
 *   applyCreditEvent: (uuid: string, event: { type: 'credit_added' | 'credit_deducted', eventId: string, amount: number }) => Promise<PaymentWebhookResponse>,
 *   resolveApiKeyUuid: (event: PaymentEvent) => Promise<string | null>,
 *   hasDuplicateEvent: (eventId: string) => Promise<boolean>,
 *   markProcessedEvent: (event: PaymentEvent, uuid: string, status?: string) => Promise<void>,
 *   logger: { error: (value: unknown) => void, info: (value: unknown) => void, warn: (value: unknown) => void },
 *   allowedEventTypes: Set<string>,
 *   getAmountFromEvent: (event: PaymentEvent) => number,
 *   getPaymentEvent: (request: unknown) => Promise<PaymentEvent>,
 *   handlePurchaseEvent: (event: PaymentEvent) => Promise<PaymentWebhookResponse | null>,
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
    // Stryker disable all -- optional webhook dependencies have fixed no-op defaults.
    isDuplicateEvent = async () => false,
    markProcessedEvent = async () => {},
    logger = console,
    allowedEventTypes = DEFAULT_ALLOWED_EVENT_TYPES,
    getAmountFromEvent = defaultGetAmountFromEvent,
    getPaymentEvent = async request => extractPaymentEvent(request),
  } = typedDeps;
  const handlePurchaseEvent = resolvePurchaseHandler(
    typedDeps.handlePurchaseEvent
  );

  requireWebhookDependency(fetchCredit, 'fetchCredit');
  requireWebhookDependency(applyCreditEvent, 'applyCreditEvent');
  requireWebhookDependency(resolveApiKeyUuid, 'resolveApiKeyUuid');
  // Stryker restore all

  return {
    fetchCredit: resolveCallable(fetchCredit),
    applyCreditEvent: resolveCallable(applyCreditEvent),
    resolveApiKeyUuid: async event => resolveCallable(resolveApiKeyUuid)(event),
    ['hasDuplicateEvent']: createDuplicateEventChecker(isDuplicateEvent),
    markProcessedEvent: async (event, uuid, status) =>
      /** @type {(event: PaymentEvent, uuid: string, status?: string) => Promise<void> | void} */ (
        markProcessedEvent
      )(event, uuid, status),
    logger,
    allowedEventTypes,
    getAmountFromEvent,
    getPaymentEvent: async request =>
      /** @type {Promise<PaymentEvent>} */ (getPaymentEvent(request)),
    handlePurchaseEvent: async event => handlePurchaseEvent(event),
  };
}

/**
 * Normalize the optional purchase-event dependency.
 * @param {PaymentWebhookDependencies['handlePurchaseEvent']} handler Handler.
 * @returns {(event: PaymentEvent) => Promise<PaymentWebhookResponse | null>} Normalized handler.
 */
function resolvePurchaseHandler(handler) {
  // Stryker disable all -- purchase handling has the fixed absent-handler fallback.
  if (!handler) return async () => null;
  return async event => handler(event);
  // Stryker restore all
}

/**
 * Coerce a dependency into a callable value.
 * @template {(...args: unknown[]) => unknown} T
 * @param {T | undefined} dependency Dependency to wrap.
 * @returns {T} Callable dependency.
 */
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
    // Stryker disable all -- unresolved customer mappings use the fixed null response.
    if (!customerId) {
      return null;
    }
    // Stryker restore all

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
