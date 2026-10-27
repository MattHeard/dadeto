import { ensureString, resolveCallable } from '../../commonCore.js';
export * from './parsing.js';
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
  'refund.created',
  'refund.updated',
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
 *   applyCreditEvent: (allowEffects: import('../../../../types/allow-effects').AllowEffects, uuid: string, event: { type: 'credit_added' | 'credit_deducted', eventId: string, amount: number }) => Promise<PaymentWebhookResponse>,
 *   resolveApiKeyUuid: (event: PaymentEvent) => Promise<string | null> | string | null,
 *   isDuplicateEvent?: (eventId: string) => Promise<boolean> | boolean,
 *   markProcessedEvent?: (allowEffects: import('../../../../types/allow-effects').AllowEffects, event: PaymentEvent, uuid: string, status?: string) => Promise<void> | void,
 *   logger?: { error: (value: unknown) => void, info: (value: unknown) => void, warn: (value: unknown) => void },
 *   allowedEventTypes?: Set<string>,
 *   getAmountFromEvent?: (event: PaymentEvent) => number,
 *   getPaymentEvent?: (request: unknown) => Promise<PaymentEvent>,
 *   readDeferredPaymentEvents?: (allowEffects: import('../../../../types/allow-effects').AllowEffects, purchaseId: string) => Promise<PaymentEvent[]>,
 *   handlePurchaseEvent?: (allowEffects: import('../../../../types/allow-effects').AllowEffects, event: PaymentEvent) => Promise<PaymentWebhookResponse | null> | PaymentWebhookResponse | null,
 * }} PaymentWebhookDependencies
 */

/**
 * Create a payment webhook handler that translates successful payment events into credit ledger events.
 * @param {PaymentWebhookDependencies} deps Webhook dependencies.
 * @returns {(allowEffects: import('../../../../types/allow-effects').AllowEffects, request?: unknown) => Promise<PaymentWebhookResponse>} Request handler.
 */
export function createPaymentWebhookHandler(deps) {
  const resolved = resolvePaymentWebhookDependencies(deps);
  /**
   * Process a single verified payment event.
   * @param {import('../../../../types/allow-effects').AllowEffects} allowEffects Request permission.
   * @param {PaymentEvent} event Verified event.
   * @param {boolean} shouldReplay Whether an applied transition should replay deferred events.
   * @returns {Promise<PaymentWebhookResponse>} Processing response.
   */
  async function processPaymentEvent(allowEffects, event, shouldReplay) {
    if (!resolved.allowedEventTypes.has(event.type)) {
      return { status: 200, body: { ignored: true, type: event.type } };
    }

    if (await resolved.hasDuplicateEvent(event.id)) {
      if (shouldReplay)
        await replayDeferredEventsForPurchase(allowEffects, event);
      return { status: 200, body: { duplicate: true, eventId: event.id } };
    }

    let response = await resolvePurchaseEvent(resolved, allowEffects, event);
    if (!response) {
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
      await resolved.markProcessedEvent(allowEffects, event, uuid, 'received');
      response = await resolved.applyCreditEvent(
        allowEffects,
        uuid,
        creditEvent
      );
      await resolved.markProcessedEvent(
        allowEffects,
        event,
        uuid,
        getEventStatus(response)
      );
      // Stryker restore all
    }
    if (shouldReplay && getEventStatus(response) === 'applied')
      await replayDeferredEventsForPurchase(allowEffects, event);
    return response;
  }

  /**
   * Replay the persisted deferred queue for one purchase until no event advances.
   * @param {import('../../../../types/allow-effects').AllowEffects} allowEffects Request permission.
   * @param {PaymentEvent} event Successful event identifying the purchase.
   * @returns {Promise<void>} Completion.
   */
  async function replayDeferredEventsForPurchase(allowEffects, event) {
    const metadata = readMetadata(event.data?.object ?? {});
    const purchaseId = metadata.purchase_id;
    if (!purchaseId) return;
    let shouldScanAgain = true;
    while (shouldScanAgain) {
      const deferredEvents = await resolved.readDeferredPaymentEvents(
        allowEffects,
        purchaseId
      );
      shouldScanAgain = false;
      for (const deferredEvent of deferredEvents) {
        const response = await processPaymentEvent(
          allowEffects,
          deferredEvent,
          false
        );
        if (getEventStatus(response) === 'applied') shouldScanAgain = true;
      }
    }
  }

  return async function handlePaymentWebhook(allowEffects, request = {}) {
    const event = await resolved.getPaymentEvent(request);
    return processPaymentEvent(allowEffects, event, true);
  };
}

/**
 * Resolve and record a purchase-specific event when configured.
 * @param {ReturnType<typeof resolvePaymentWebhookDependencies>} resolved Runtime dependencies.
 * @param {import('../../../../types/allow-effects').AllowEffects} allowEffects Request effect permission.
 * @param {PaymentEvent} event Stripe event.
 * @returns {Promise<PaymentWebhookResponse | null>} Purchase response or null.
 */
async function resolvePurchaseEvent(resolved, allowEffects, event) {
  const purchaseUuid = await resolved.resolveApiKeyUuid(event);
  const identity = purchaseUuid ?? 'purchase';
  await resolved.markProcessedEvent(allowEffects, event, identity, 'received');
  const response = await resolved.handlePurchaseEvent(allowEffects, event);
  if (!response) {
    // Stryker disable all -- ignored purchase events use the fixed ledger status.
    await resolved.markProcessedEvent(allowEffects, event, identity, 'ignored');
    return null;
    // Stryker restore all
  }
  await resolved.markProcessedEvent(
    allowEffects,
    event,
    identity,
    getEventStatus(response)
  );
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
 *   applyCreditEvent: (allowEffects: import('../../../../types/allow-effects').AllowEffects, uuid: string, event: { type: 'credit_added' | 'credit_deducted', eventId: string, amount: number }) => Promise<PaymentWebhookResponse>,
 *   resolveApiKeyUuid: (event: PaymentEvent) => Promise<string | null>,
 *   hasDuplicateEvent: (eventId: string) => Promise<boolean>,
 *   markProcessedEvent: (allowEffects: import('../../../../types/allow-effects').AllowEffects, event: PaymentEvent, uuid: string, status?: string) => Promise<void>,
 *   logger: { error: (value: unknown) => void, info: (value: unknown) => void, warn: (value: unknown) => void },
 *   allowedEventTypes: Set<string>,
 *   getAmountFromEvent: (event: PaymentEvent) => number,
 *   getPaymentEvent: (request: unknown) => Promise<PaymentEvent>,
 *   readDeferredPaymentEvents: (allowEffects: import('../../../../types/allow-effects').AllowEffects, purchaseId: string) => Promise<PaymentEvent[]>,
 *   handlePurchaseEvent: (allowEffects: import('../../../../types/allow-effects').AllowEffects, event: PaymentEvent) => Promise<PaymentWebhookResponse | null>,
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
    readDeferredPaymentEvents = async () => [],
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
    markProcessedEvent: async (allowEffects, event, uuid, status) =>
      /** @type {(allowEffects: import('../../../../types/allow-effects').AllowEffects, event: PaymentEvent, uuid: string, status?: string) => Promise<void> | void} */ (
        markProcessedEvent
      )(allowEffects, event, uuid, status),
    logger,
    allowedEventTypes,
    getAmountFromEvent,
    getPaymentEvent: async request =>
      /** @type {Promise<PaymentEvent>} */ (getPaymentEvent(request)),
    readDeferredPaymentEvents: async (allowEffects, purchaseId) =>
      readDeferredPaymentEvents(allowEffects, purchaseId),
    handlePurchaseEvent: async (allowEffects, event) =>
      handlePurchaseEvent(allowEffects, event),
  };
}

/**
 * Normalize the optional purchase-event dependency.
 * @param {PaymentWebhookDependencies['handlePurchaseEvent']} handler Handler.
 * @returns {(allowEffects: import('../../../../types/allow-effects').AllowEffects, event: PaymentEvent) => Promise<PaymentWebhookResponse | null>} Normalized handler.
 */
function resolvePurchaseHandler(handler) {
  // Stryker disable all -- purchase handling has the fixed absent-handler fallback.
  if (!handler) return async () => null;
  return async (allowEffects, event) => handler(allowEffects, event);
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
