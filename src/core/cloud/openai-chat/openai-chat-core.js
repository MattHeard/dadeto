/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
import * as operationBilling from '../billing/operation-billing-core.js';

export const OPENAI_CHAT_MODEL = 'gpt-6-luna';
export const OPENAI_CHAT_OPERATION = 'openai-chat-gpt-6-luna-v1';
export const OPENAI_CHAT_OPERATION_COST_EUR_MICROS = 2_000;
export const OPENAI_CHAT_MAX_INPUT_BYTES = 4096;
export const OPENAI_CHAT_MAX_OUTPUT_TOKENS = 256;
export const OPENAI_CHAT_MAX_OUTPUT_BYTES = 8192;
export const OPENAI_CHAT_MAX_MESSAGES = 12;
export const OPENAI_CHAT_RATE_LIMIT = 5;
export const OPENAI_CHAT_RATE_WINDOW_MS = 60_000;
const CHAT_API_URL = 'https://api.openai.com/v1/responses';
const SYSTEM_MESSAGE = 'Answer helpfully and concisely.';
const PRICING_UNAVAILABLE = response(503, 'pricing_unavailable');

/**
 * Validate and bound a client conversation. The model, system prompt, tools,
 * and output limit are server-owned.
 * @param {unknown} body Request body.
 * @returns {{messages: Array<{role: 'user'|'assistant', content: string}>}|null} Normalized conversation.
 */
export function normalizeOpenAIChatRequest(body) {
  if (!isRecord(body) || Object.keys(body).some(key => key !== 'messages'))
    return null;
  if (!Array.isArray(body.messages) || body.messages.length === 0) return null;
  if (body.messages.length > OPENAI_CHAT_MAX_MESSAGES) return null;

  let inputBytes = 0;
  const messages = [];
  for (const candidate of body.messages) {
    if (!isRecord(candidate)) return null;
    if (Object.keys(candidate).some(key => key !== 'role' && key !== 'content'))
      return null;
    if (candidate.role !== 'user' && candidate.role !== 'assistant')
      return null;
    if (typeof candidate.content !== 'string') return null;
    const content = candidate.content.trim();
    if (!content) return null;
    inputBytes += byteLength(content);
    if (inputBytes > OPENAI_CHAT_MAX_INPUT_BYTES) return null;
    messages.push({ role: candidate.role, content });
  }
  if (messages.at(-1)?.role !== 'user') return null;
  return { messages };
}

/**
 * Create the pure handler for one billable OpenAI chat request.
 * @param {{enabled: boolean, providerReady: boolean, auth: {verifyIdToken: (token: string) => Promise<{uid?: string}>}, billing: {getCurrentPricingSnapshot: () => Promise<object|null>, reserveOperation: (allowEffects: AllowEffects, input: object) => Promise<{status: number, body: Record<string, unknown>}>, resolveOperation: (allowEffects: AllowEffects, input: object) => Promise<{status: number, body: Record<string, unknown>}>}, resolveBillingIdentity: (allowEffects: AllowEffects, uid: string) => Promise<string|null>, limitRequest: (allowEffects: AllowEffects, uid: string) => Promise<{allowed: boolean, retryAfterSeconds?: number}>, readResult: (allowEffects: AllowEffects, billingUuid: string, operationAttemptId: string) => Promise<{requestHash: string, reply: string}|null>, saveResult: (allowEffects: AllowEffects, billingUuid: string, operationAttemptId: string, result: {requestHash: string, reply: string}) => Promise<void>, hashRequest: (body: object) => string, callModel: (allowEffects: AllowEffects, messages: Array<{role: string, content: string}>) => Promise<string>}} deps Dependencies.
 * @returns {(allowEffects: AllowEffects, request: object) => Promise<{status: number, body: unknown}>} Request handler.
 */
export function createOpenAIChatHandler(deps) {
  return async function handleOpenAIChat(allowEffects, request = {}) {
    if (!deps.enabled || !deps.providerReady)
      return response(503, 'chat_unavailable');
    const identity = await verifyIdentity(deps, request);
    if ('response' in identity) return identity.response;
    return handleAuthenticatedChat(deps, allowEffects, request, identity.uid);
  };
}

/**
 * Verify a Firebase bearer token.
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {unknown} request Incoming request.
 * @returns {Promise<{uid: string}|{response: {status: number, body: unknown}}>} Verified identity or response.
 */
async function verifyIdentity(deps, request) {
  const token = readBearerToken(request);
  if (!token) return { response: response(401, 'unauthorized') };
  try {
    const identity = await deps.auth.verifyIdToken(token);
    return typeof identity?.uid === 'string' && identity.uid
      ? { uid: identity.uid }
      : { response: response(401, 'unauthorized') };
  } catch {
    return { response: response(401, 'unauthorized') };
  }
}

/**
 * Validate and process a request after Firebase authentication.
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {Record<string, any>} request Incoming request.
 * @param {string} uid Authenticated user ID.
 * @returns {Promise<{status: number, body: unknown}>} Request result.
 */
async function handleAuthenticatedChat(deps, allowEffects, request, uid) {
  if (requestBytesTooLarge(request)) return response(413, 'request_too_large');
  const conversation = normalizeOpenAIChatRequest(request.body);
  if (!conversation) return response(400, 'invalid_request');
  const idempotencyKey = readIdempotencyKey(request);
  if (!idempotencyKey) return response(400, 'idempotency_key_required');

  const billingUuid = await resolveIdentity(deps, allowEffects, uid);
  if (billingUuid.response) return billingUuid.response;
  const context = {
    uid,
    billingUuid: billingUuid.value,
    operationAttemptId: `${OPENAI_CHAT_OPERATION}:${idempotencyKey}`,
    requestHash: deps.hashRequest(conversation),
    messages: conversation.messages,
  };
  const prior = await readPriorResult(deps, allowEffects, context);
  if (prior.response) return prior.response;
  if (prior.result)
    return settleStoredResult(deps, allowEffects, context, prior.result);
  const rateResponse = await enforceRateLimit(deps, allowEffects, uid);
  if (rateResponse) return rateResponse;
  return reserveAndExecute(deps, allowEffects, context);
}

/**
 * Resolve the billing identity owned by an authenticated user.
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {string} uid Authenticated user ID.
 * @returns {Promise<{value?: string, response?: {status: number, body: unknown}}>} Billing identity or failure.
 */
async function resolveIdentity(deps, allowEffects, uid) {
  try {
    const value = await deps.resolveBillingIdentity(allowEffects, uid);
    return value
      ? { value }
      : { response: response(409, 'billing_identity_unavailable') };
  } catch {
    return { response: response(503, 'billing_identity_unavailable') };
  }
}

/**
 * Apply the per-user request limit.
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {string} uid Authenticated user ID.
 * @returns {Promise<{status: number, body: unknown}|null>} Rate failure or null.
 */
async function enforceRateLimit(deps, allowEffects, uid) {
  let rate;
  try {
    rate = await deps.limitRequest(allowEffects, uid);
  } catch {
    return response(503, 'rate_limit_unavailable');
  }
  return rate.allowed
    ? null
    : {
        status: 429,
        body: {
          error: 'rate_limited',
          retryAfterSeconds: rate.retryAfterSeconds ?? 60,
        },
      };
}

/**
 * Reserve credits and dispatch only the first request for an idempotency key.
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {Record<string, any>} context Request and billing identity.
 * @returns {Promise<{status: number, body: unknown}>} Reserved operation result.
 */
async function reserveAndExecute(deps, allowEffects, context) {
  const pricing = await readPricing(deps);
  if (pricing.response) return pricing.response;
  let reservation;
  try {
    reservation = await deps.billing.reserveOperation(allowEffects, {
      uuid: context.billingUuid,
      eventId: `${context.operationAttemptId}:reserve`,
      operationType: OPENAI_CHAT_OPERATION,
      operationAttemptId: context.operationAttemptId,
      pricingSnapshot: pricing.value,
    });
  } catch {
    return response(503, 'reservation_outcome_unknown');
  }
  if (reservation.status !== 200) return reservation;
  if (reservation.body.duplicate === true) {
    const prior = await readPriorResult(deps, allowEffects, context);
    if (prior.response) return prior.response;
    return prior.result
      ? settleStoredResult(deps, allowEffects, context, prior.result)
      : response(409, 'operation_pending');
  }
  if (!operationBilling.isOperationReservationConfirmed(reservation))
    return response(503, 'reservation_outcome_unknown');
  return executeReservedChat(deps, allowEffects, context);
}

/**
 * Read a current pricing snapshot that includes the chat operation.
 * @param {Record<string, any>} deps Handler dependencies.
 * @returns {Promise<{value?: object, response?: {status: number, body: unknown}}>} Pricing snapshot or stable error.
 */
async function readPricing(deps) {
  let value;
  try {
    value = await deps.billing.getCurrentPricingSnapshot();
  } catch {
    return { response: PRICING_UNAVAILABLE };
  }
  const candidate = /** @type {{operations?: unknown}|null} */ (value);
  const operations = isRecord(candidate?.operations)
    ? candidate.operations
    : {};
  const operation = operations[OPENAI_CHAT_OPERATION];
  if (
    value &&
    isRecord(operation) &&
    operation.costEurMicros === OPENAI_CHAT_OPERATION_COST_EUR_MICROS
  )
    return { value };
  return { response: PRICING_UNAVAILABLE };
}

/**
 * Run the provider once after a confirmed reservation and persist its reply.
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {Record<string, any>} context Request and billing identity.
 * @returns {Promise<{status: number, body: unknown}>} Provider and settlement response.
 */
async function executeReservedChat(deps, allowEffects, context) {
  let reply;
  try {
    reply = await deps.callModel(allowEffects, context.messages);
  } catch {
    await markAmbiguous(deps, allowEffects, context);
    return response(502, 'provider_unavailable');
  }
  if (!isValidReply(reply)) {
    await markAmbiguous(deps, allowEffects, context);
    return response(502, 'provider_unavailable');
  }
  const stored = { requestHash: context.requestHash, reply: reply.trim() };
  try {
    await deps.saveResult(
      allowEffects,
      context.billingUuid,
      context.operationAttemptId,
      stored
    );
  } catch {
    await markAmbiguous(deps, allowEffects, context);
    return response(503, 'operation_outcome_unknown');
  }
  return settleStoredResult(deps, allowEffects, context, stored);
}

/**
 * Create the fixed OpenAI Responses API adapter. It never accepts a URL,
 * model, tool list, or token limit from the caller.
 * @param {{apiKey: string, fetchImpl: (allowEffects: AllowEffects, url: string, options: object) => Promise<{ok: boolean, json: () => Promise<unknown>}>, timeoutSignal: (milliseconds: number) => AbortSignal}} deps Provider dependencies.
 * @returns {(allowEffects: AllowEffects, messages: Array<{role: string, content: string}>) => Promise<string>} Model call.
 */
export function createOpenAIChatModelClient(deps) {
  return async function callModel(allowEffects, messages) {
    if (!deps.apiKey) throw new Error('OpenAI is not configured.');
    const result = await deps.fetchImpl(allowEffects, CHAT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: deps.timeoutSignal(15_000),
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        input: [{ role: 'developer', content: SYSTEM_MESSAGE }, ...messages],
        ['max_output_tokens']: OPENAI_CHAT_MAX_OUTPUT_TOKENS,
        store: false,
      }),
    });
    if (!result.ok) throw new Error('OpenAI request failed.');
    const body = await result.json();
    const output = extractOpenAIChatText(body);
    if (!output) throw new Error('OpenAI response was invalid.');
    return output;
  };
}

/**
 * Extract assistant text from the raw Responses API payload.
 * @param {unknown} body Provider response payload.
 * @returns {string|null} Combined text output.
 */
function extractOpenAIChatText(body) {
  if (!isRecord(body)) return null;
  if (typeof body.output_text === 'string') return body.output_text;
  if (!Array.isArray(body.output)) return null;
  const text = body.output
    .flatMap(item => {
      if (
        !isRecord(item) ||
        item.type !== 'message' ||
        item.role !== 'assistant'
      )
        return [];
      if (!Array.isArray(item.content)) return [];
      return item.content.flatMap(part =>
        isRecord(part) &&
        part.type === 'output_text' &&
        typeof part.text === 'string'
          ? [part.text]
          : []
      );
    })
    .join('');
  return text || null;
}

/**
 * Create a fixed-window, per-identity request limiter over injected Firestore
 * transaction effects.
 * @param {{now?: () => number, runTransaction: (allowEffects: AllowEffects, uid: string, window: number, update: (current: {window: number, count: number}|null) => {write?: {window: number, count: number}, allowed: boolean}) => Promise<{allowed: boolean, retryAfterSeconds?: number}>}} deps Transaction adapter.
 * @returns {(allowEffects: AllowEffects, uid: string) => Promise<{allowed: boolean, retryAfterSeconds?: number}>} Rate limiter.
 */
export function createOpenAIChatRateLimiter(deps) {
  return (allowEffects, uid) => {
    const now = (deps.now ?? Date.now)();
    const minuteBucket = Math.floor(now / OPENAI_CHAT_RATE_WINDOW_MS);
    return deps.runTransaction(allowEffects, uid, minuteBucket, current => {
      const count = current?.window === minuteBucket ? current.count : 0;
      if (count >= OPENAI_CHAT_RATE_LIMIT)
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(
              ((minuteBucket + 1) * OPENAI_CHAT_RATE_WINDOW_MS - now) / 1000
            )
          ),
        };
      return {
        allowed: true,
        write: { window: minuteBucket, count: count + 1 },
      };
    });
  };
}

/**
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {Record<string, any>} context Operation identity and request fingerprint.
 * @returns {Promise<{response?: {status: number, body: unknown}, result?: {requestHash: string, reply: string}}>} Existing request result.
 */
async function readPriorResult(deps, allowEffects, context) {
  let result;
  try {
    result = await deps.readResult(
      allowEffects,
      context.billingUuid,
      context.operationAttemptId
    );
  } catch {
    return { response: response(503, 'operation_result_unavailable') };
  }
  if (!result) return {};
  if (result.requestHash !== context.requestHash)
    return { response: response(409, 'idempotency_key_conflict') };
  return { result };
}

/**
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {Record<string, any>} context Operation identity.
 * @param {{requestHash: string, reply: string}} result Stored response.
 * @returns {Promise<{status: number, body: unknown}>} Stable result after settlement.
 */
async function settleStoredResult(deps, allowEffects, context, result) {
  const settled = await resolveOutcome(deps, allowEffects, context, 'success');
  return settled
    ? { status: 200, body: { reply: result.reply } }
    : response(503, 'operation_settlement_pending');
}

/**
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {Record<string, any>} context Operation identity.
 * @param {'success'|'ambiguous'} outcome Reservation outcome.
 * @returns {Promise<boolean>} Whether the reservation reached its requested state.
 */
async function resolveOutcome(deps, allowEffects, context, outcome) {
  return operationBilling.resolveOperationOutcome({
    billing: deps.billing,
    allowEffects,
    uuid: context.billingUuid,
    operationType: OPENAI_CHAT_OPERATION,
    operationAttemptId: context.operationAttemptId,
    outcome,
  });
}

/**
 * Mark a provider operation as requiring recovery.
 * @param {Record<string, any>} deps Handler dependencies.
 * @param {AllowEffects} allowEffects Effect capability.
 * @param {Record<string, any>} context Operation identity.
 * @returns {Promise<void>} Completes after best-effort resolution.
 */
async function markAmbiguous(deps, allowEffects, context) {
  await resolveOutcome(deps, allowEffects, context, 'ambiguous');
}

/**
 * Check whether a provider reply fits the public response bound.
 * @param {unknown} reply Provider reply.
 * @returns {boolean} Whether the reply is non-empty and bounded.
 */
function isValidReply(reply) {
  return (
    typeof reply === 'string' &&
    Boolean(reply.trim()) &&
    byteLength(reply) <= OPENAI_CHAT_MAX_OUTPUT_BYTES
  );
}

/**
 * Read a bearer token without exposing it in the response.
 * @param {unknown} request Incoming request.
 * @returns {string|null} Bearer token.
 */
function readBearerToken(request) {
  const authorization = readHeader(request, 'authorization');
  if (typeof authorization !== 'string') return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1] ?? null;
}

/**
 * Read a bounded idempotency key.
 * @param {unknown} request Incoming request.
 * @returns {string|null} Valid key or null.
 */
function readIdempotencyKey(request) {
  const key = readHeader(request, 'idempotency-key');
  if (typeof key !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(key.trim()))
    return null;
  return key.trim();
}

/**
 * Read an HTTP header from an Express request or plain test object.
 * @param {unknown} request Incoming request.
 * @param {string} name Header name.
 * @returns {unknown} Header value.
 */
function readHeader(request, name) {
  if (!isRecord(request)) return undefined;
  const getter = request.get;
  if (typeof getter === 'function') {
    const value = getter.call(request, name);
    if (value !== null && value !== undefined) return value;
  }
  if (!isRecord(request.headers)) return undefined;
  const lower = name.toLowerCase();
  const match = Object.entries(request.headers).find(
    ([header]) => header.toLowerCase() === lower
  );
  return match?.[1];
}

/**
 * Reject oversized raw HTTP bodies before interpreting JSON fields.
 * @param {Record<string, any>} request Authenticated HTTP request record.
 * @returns {boolean} Whether the encoded body exceeds the cap.
 */
function requestBytesTooLarge(request) {
  const contentLength = readHeader(request, 'content-length');
  if (typeof contentLength === 'string' && Number(contentLength) > 16_384)
    return true;
  const rawBody = request.rawBody;
  return (
    rawBody !== undefined &&
    typeof rawBody.byteLength === 'number' &&
    rawBody.byteLength > 16_384
  );
}

/**
 * Count UTF-8 bytes without relying on a runtime-specific global encoder.
 * @param {string} value Text value.
 * @returns {number} UTF-8 byte length.
 */
function byteLength(value) {
  let bytes = 0;
  for (const character of value) {
    const codePoint = /** @type {number} */ (character.codePointAt(0));
    bytes +=
      codePoint <= 0x7f
        ? 1
        : codePoint <= 0x7ff
          ? 2
          : codePoint <= 0xffff
            ? 3
            : 4;
  }
  return bytes;
}

/**
 * Build a stable error response without provider details.
 * @param {number} status HTTP status.
 * @param {string} error Stable error code.
 * @returns {{status: number, body: {error: string}}} Error response.
 */
function response(status, error) {
  return { status, body: { error } };
}

/**
 * Check whether a value is a non-array object record.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, any>} Whether value is a record.
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
