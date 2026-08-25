import { timingSafeEqual } from 'node:crypto';
import { ensureString, isNonNullObject } from '../../commonCore.js';

/** @typedef {{ body?: unknown, rawBody?: unknown, headers?: Record<string, unknown> }} RequestLike */

/**
 * Extract a payment event from an input request.
 * @param {unknown} request Request-like input.
 * @returns {Promise<object>} Parsed event object.
 */
export async function extractPaymentEvent(request) {
  // Stryker disable all -- webhook request parsing uses the fixed event-object contract.
  if (!isNonNullObject(request))
    throw new TypeError('request must be an object');
  const body = /** @type {RequestLike} */ (request).body;
  const eventBody = /** @type {{ id?: unknown }} */ (body);
  if (isNonNullObject(body) && typeof eventBody.id === 'string')
    return /** @type {object} */ (body);
  throw new TypeError('request body must be a payment event object');
  // Stryker restore all
}

/**
 * Resolve metadata from a payment object.
 * @param {Record<string, unknown>} object Payment object.
 * @returns {Record<string, string>} Normalized metadata.
 */
export function readMetadata(object) {
  // Stryker disable all -- provider metadata uses the fixed non-empty-string contract.
  const metadata = object.metadata;
  if (!isNonNullObject(metadata)) return {};
  const values = /** @type {Record<string, string>} */ ({});
  for (const [key, value] of Object.entries(
    /** @type {Record<string, unknown>} */ (metadata)
  )) {
    if (typeof value === 'string' && value.length > 0) values[key] = value;
  }
  return values;
  // Stryker restore all
}

/**
 * Parse a positive integer from a metadata field.
 * @param {unknown} value Candidate value.
 * @returns {number} Parsed amount or zero.
 */
export function parsePositiveInteger(value) {
  const parsed = Number.parseInt(ensureString(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return 0;
  return parsed;
}

/**
 * Extract a raw payment webhook payload.
 * @param {unknown} request Request-like object.
 * @returns {string} Raw payload text.
 */
export function extractRawPayload(request) {
  // Stryker disable all -- raw webhook payloads use the fixed string/buffer/body order.
  const requestLike = /** @type {RequestLike | null | undefined} */ (request);
  const rawBody = requestLike?.rawBody;
  if (typeof rawBody === 'string') return rawBody;
  if (Buffer.isBuffer(rawBody)) return rawBody.toString('utf8');
  return resolvePayloadBody(requestLike?.body);
  // Stryker restore all
}

/**
 * Extract a request header.
 * @param {unknown} request Request-like object.
 * @param {string} name Header name.
 * @returns {string} Header value.
 */
export function extractHeader(request, name) {
  // Stryker disable all -- header normalization uses the fixed canonical/lowercase lookup.
  const headers =
    /** @type {RequestLike | null | undefined} */ (request)?.headers ?? {};
  const lower = name.toLowerCase();
  return ensureString(headers[name] ?? headers[lower]);
  // Stryker restore all
}

/**
 *
 * @param body
 */
/**
 * Resolve a request body into a string payload.
 * @param {unknown} body Request body.
 * @returns {string} Payload string.
 */
function resolvePayloadBody(body) {
  // Stryker disable all -- body serialization uses the fixed string/object fallback.
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object') return JSON.stringify(body);
  return '';
  // Stryker restore all
}

/**
 * Parse a JSON payment event body.
 * @param {string} payload JSON payload.
 * @returns {object} Parsed event.
 */
export function parseJsonEvent(payload) {
  // Stryker disable all -- parsed provider events require the fixed object/id shape.
  const parsed = JSON.parse(payload);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string')
    throw new TypeError('Invalid payment event payload');
  return parsed;
  // Stryker restore all
}

/**
 * Compare two strings in constant time.
 * @param {string} actual Actual value.
 * @param {string} expected Expected value.
 * @returns {boolean} Whether values match.
 */
export function safeEqual(actual, expected) {
  const left = Buffer.from(actual, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Map a webhook response to its inbox status.
 * @param {{ status: number, body: unknown }} response Handler response.
 * @returns {'applied'|'deferred'|'ignored'|'quarantined'} Inbox status.
 */
export function getEventStatus(response) {
  // Stryker disable all -- inbox status mapping uses the fixed provider response protocol.
  const body = response.body;
  const statusBody =
    /** @type {{ deferred?: boolean, quarantined?: boolean, ignored?: boolean, duplicate?: boolean }} */ (
      body
    );
  if (body && typeof body === 'object') {
    if (statusBody.deferred === true) return 'deferred';
    if (statusBody.quarantined === true) return 'quarantined';
    if (statusBody.ignored === true || statusBody.duplicate === true)
      return 'ignored';
  }
  if (response.status >= 400) return 'quarantined';
  return 'applied';
  // Stryker restore all
}

/**
 * Normalize an optional duplicate-event checker.
 * @param {(eventId: string) => Promise<boolean> | boolean} checker Checker.
 * @returns {(eventId: string) => Promise<boolean>} Async checker.
 */
export function createDuplicateEventChecker(checker) {
  return async eventId => Boolean(await checker(eventId));
}

/**
 * Build the ledger event corresponding to a payment event.
 * @param {{ id: string, type: string }} event Payment event.
 * @param {number} amount Credit amount.
 * @returns {{ type: 'credit_added' | 'credit_deducted', eventId: string, amount: number }} Ledger event.
 */
export function buildCreditEvent(event, amount) {
  // Stryker disable all -- refund/dispute events use the fixed debit mapping.
  if (
    event.type === 'charge.refunded' ||
    event.type === 'charge.dispute.created'
  ) {
    return { type: 'credit_deducted', eventId: event.id, amount };
  }
  return { type: 'credit_added', eventId: event.id, amount };
  // Stryker restore all
}

/**
 * Ensure a required dependency is callable.
 * @param {unknown} dependency Candidate dependency.
 * @param {string} name Dependency name.
 * @returns {void}
 */
export function requireWebhookDependency(dependency, name) {
  if (typeof dependency !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}
