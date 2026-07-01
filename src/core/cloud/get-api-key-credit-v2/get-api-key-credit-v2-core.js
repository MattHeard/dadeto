import { getApiKeyCreditSnapshot } from './get-api-key-credit-snapshot.js';
import { getNumericValueOrZero, productionOrigins } from '../cloud-core.js';
import {
  ensureString,
  functionOrFallback,
  isNonNullObject,
  whenOrNull,
  whenString,
} from '../../commonCore.js';

export { createDb } from './create-db.js';
export { productionOrigins };

const UUID_PATH_PATTERN =
  /\/api-keys\/([0-9a-fA-F-]{36})\/credit(?:\/events)?\/?$/;

/**
 * Result of executing a UUID capturing regex.
 * @typedef {(
 *   Array<string> & {
 *     index: number,
 *     input: string,
 *     groups?: Record<string, string | undefined>,
 *   }
 * )} RegExpExecArray
 */

/**
 * Credit event type.
 * @typedef {'credit_added' | 'credit_deducted'} CreditEventType
 */

/**
 * Credit event request payload.
 * @typedef {{
 *   type: CreditEventType,
 *   eventId: string,
 *   amount: number,
 * }} CreditEventInput
 */

/**
 * Credit balance response body.
 * @typedef {{
 *   credit: number,
 * }} CreditBalanceResponseBody
 *
 * Credit event history response body.
 * @typedef {{
 *   events: Array<CreditLedgerEvent>,
 * }} CreditHistoryResponseBody
 */

/**
 * Credit event response body.
 * @typedef {{
 *   credit: number,
 *   type: CreditEventType,
 *   eventId: string,
 *   applied: true,
 * }} CreditEventResponseBody
 *
 * Credit ledger event response body.
 * @typedef {{
 *   type: CreditEventType,
 *   eventId: string,
 *   amount: number,
 *   balanceBefore: number,
 *   balanceAfter: number,
 * }} CreditLedgerEvent
 */

/**
 * Credit API response metadata.
 * @typedef {{
 *   status: number,
 *   body: string | CreditBalanceResponseBody | CreditEventResponseBody | CreditHistoryResponseBody,
 *   headers?: Record<string, string>,
 * }} CreditApiResponse
 */

/**
 * Credit event validation error metadata.
 * @typedef {{
 *   status: number,
 *   body: string,
 *   headers?: Record<string, string>,
 * }} ValidationErrorResponse
 */

/**
 * Firestore transaction surface used by the credit ledger helpers.
 * @typedef {{
 *   get: (ref: import('@google-cloud/firestore').DocumentReference) => Promise<import('@google-cloud/firestore').DocumentSnapshot>,
 *   set: (ref: import('@google-cloud/firestore').DocumentReference, data: Record<string, unknown>) => void,
 * }} CreditTransaction
 */

/**
 * Firestore database surface used by the credit ledger helpers.
 * @typedef {import('@google-cloud/firestore').Firestore & {
 *   runTransaction: (updateFunction: (transaction: CreditTransaction) => Promise<CreditApiResponse>) => Promise<CreditApiResponse>,
 * }} CreditFirestore
 */

/**
 * Attempt to execute the UUID path pattern against a value.
 * @param {unknown} value Value representing the request path.
 * @returns {RegExpExecArray|null} Regex match result when successful.
 */
function execUuidPathPattern(value) {
  return whenString(value, uuidCandidate =>
    UUID_PATH_PATTERN.exec(uuidCandidate)
  );
}

/**
 * Attempt to read a UUID segment from a credit API request path.
 * @param {unknown} path Value representing the request path.
 * @returns {string} Matched UUID, or an empty string when no match exists.
 */
function matchPathUuid(path) {
  const match = execUuidPathPattern(path);
  return extractUuidFromMatch(match);
}

/**
 * Extract the UUID capture from a regex match result.
 * @param {RegExpExecArray | null} match Result of applying the UUID path regex.
 * @returns {string} Normalized UUID string when the match succeeds.
 */
function extractUuidFromMatch(match) {
  return ensureString(match?.[1]);
}

/**
 * Invoke resolvers until one produces a value.
 * @param {Array<() => string>} resolvers Candidate value resolvers.
 * @returns {string} First non-empty string returned by a resolver.
 */
function resolveFirstValue(resolvers) {
  return resolvers.map(resolve => resolve()).find(Boolean) || '';
}

/**
 * Check if request is valid for UUID extraction.
 * @param {unknown} request Request data to validate.
 * @returns {boolean} True if request is a valid object.
 */
function isValidRequestObject(request) {
  return Boolean(request) && typeof request === 'object';
}

/**
 * Extract an API key UUID from a request-like object.
 * @param {unknown} [request] Incoming request data.
 * @returns {string} Extracted UUID or an empty string when missing.
 */
export function extractUuid(request) {
  if (!isValidRequestObject(request)) {
    return '';
  }

  const typedRequest =
    /** @type {{ path?: string, params?: Record<string, unknown>, query?: Record<string, unknown> }} */ (
      request
    );
  const resolvers = [
    () => matchPathUuid(typedRequest.path),
    () => ensureString(typedRequest.params?.uuid),
    () => ensureString(typedRequest.query?.uuid),
  ];

  return resolveFirstValue(resolvers);
}

/**
 * @typedef {{
 *   fetchCredit?: (uuid: string) => Promise<number | null>,
 *   fetchCreditEvents?: (uuid: string) => Promise<Array<CreditLedgerEvent>>,
 *   applyCreditEvent?: (uuid: string, event: CreditEventInput) => Promise<CreditApiResponse>,
 *   getUuid?: (request: unknown) => string,
 *   logError?: (error: unknown) => void,
 * }} HandlerDependencies
 */

/**
 * Factory for the HTTPS handler serving API key credit data.
 * @param {HandlerDependencies} [deps] Runtime dependencies for the handler.
 * @returns {(request?: { method?: string, body?: unknown } & Record<string, unknown>) => Promise<CreditApiResponse>} Handler producing HTTP response metadata.
 */
export function createGetApiKeyCreditV2Handler(deps) {
  const {
    fetchCredit,
    fetchCreditEvents,
    applyCreditEvent,
    resolveUuid,
    errorLogger,
  } = resolveV2HandlerDependencies(deps);

  return async function handleRequest(request = {}) {
    const method = ensureString(request.method).toUpperCase();
    const uuid = resolveUuid(request);
    const validationError = resolveRequestValidationError(method, uuid);

    return resolveRequestResponse(validationError, () => {
      if (method === 'GET') {
        if (isCreditEventsRequest(/** @type {{ path?: string }} */ (request))) {
          return fetchCreditEventsResponse(
            fetchCreditEvents,
            uuid,
            errorLogger
          );
        }
        return fetchCreditResponse(fetchCredit, uuid, errorLogger);
      }

      return applyCreditEventResponse(
        applyCreditEvent,
        uuid,
        request.body,
        errorLogger
      );
    });
  };
}

/**
 * Create the Express-style handler for the API key credit endpoint.
 * @param {{ db: CreditFirestore }} deps Runtime dependencies.
 * @returns {(req: unknown, res: { set: (name: string, value: string) => void, status: (status: number) => { json: (body: unknown) => void, send: (body: unknown) => void } }) => Promise<void>} Express handler.
 */
export function createGetApiKeyCreditV2ExpressHandle({ db }) {
  const handleRequest = createGetApiKeyCreditV2Handler({
    fetchCredit: createFetchCredit(db),
    fetchCreditEvents: createFetchCreditEvents(db),
    applyCreditEvent: createApplyCreditEvent(db),
    getUuid: extractUuid,
    logError: error => console.error(error),
  });

  return async function handle(req, res) {
    const { status, body, headers } = await handleRequest(
      /** @type {{ method?: string, body?: unknown } & Record<string, unknown>} */ (
        req
      )
    );

    applyResponseHeaders(res, headers);

    if (body && typeof body === 'object') {
      return res.status(status).json(body);
    }

    return res.status(status).send(body);
  };
}

/**
 * Apply response headers to an Express response object.
 * @param {{ set: (name: string, value: string) => void }} res Response object.
 * @param {Record<string, string | undefined> | undefined} headers Response headers.
 * @returns {void}
 */
export function applyResponseHeaders(res, headers) {
  if (!headers) {
    return;
  }

  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value !== 'undefined') {
      res.set(key, value);
    }
  });
}

/**
 * @typedef {{
 *   fetchCredit: (uuid: string) => Promise<number | null>,
 *   fetchCreditEvents: (uuid: string) => Promise<Array<CreditLedgerEvent>>,
 *   applyCreditEvent: (uuid: string, event: CreditEventInput) => Promise<CreditApiResponse>,
 *   resolveUuid: (request: unknown) => string,
 *   errorLogger: (error: unknown) => void,
 * }} ResolvedHandlerDependencies
 */

/**
 * Resolve runtime dependencies for the API handler.
 * @param {HandlerDependencies} deps Handler dependencies.
 * @returns {ResolvedHandlerDependencies} Runtime helpers for the handler.
 */
function resolveV2HandlerDependencies(deps = {}) {
  const typedDeps = /** @type {HandlerDependencies} */ (deps);
  const fetchCredit = typedDeps.fetchCredit;
  const fetchCreditEvents = typedDeps.fetchCreditEvents;
  const applyCreditEvent = typedDeps.applyCreditEvent;
  const getUuid = typedDeps.getUuid;
  const logError = typedDeps.logError;
  ensureFetchCredit(fetchCredit);
  ensureFetchCreditEvents(fetchCreditEvents);
  ensureApplyCreditEvent(applyCreditEvent);

  return {
    fetchCredit: resolveCallable(fetchCredit),
    fetchCreditEvents:
      /** @type {(uuid: string) => Promise<Array<CreditLedgerEvent>>} */ (
        fetchCreditEvents ?? (async () => [])
      ),
    applyCreditEvent: resolveCallable(applyCreditEvent),
    resolveUuid: resolveUuidDependency(getUuid),
    errorLogger: resolveErrorLogger(logError),
  };
}

/**
 * Coerce a dependency into a callable value.
 * @template {(...args: Array<any>) => any} T
 * @param {T | undefined} dependency Dependency to wrap.
 * @returns {T} Callable dependency.
 */
function resolveCallable(dependency) {
  return /** @type {T} */ (dependency);
}

/**
 * Ensure a fetchCredit dependency is provided.
 * @param {unknown} fetchCredit Candidate dependency.
 * @returns {void}
 */
function ensureFetchCredit(fetchCredit) {
  if (typeof fetchCredit !== 'function') {
    throw new TypeError('fetchCredit must be a function');
  }
}

/**
 * Ensure an applyCreditEvent dependency is provided.
 * @param {unknown} applyCreditEvent Candidate dependency.
 * @returns {void}
 */
function ensureApplyCreditEvent(applyCreditEvent) {
  if (typeof applyCreditEvent !== 'function') {
    throw new TypeError('applyCreditEvent must be a function');
  }
}

/**
 * Ensure a fetchCreditEvents dependency is provided when history is requested.
 * @param {unknown} fetchCreditEvents Candidate dependency.
 * @returns {void}
 */
function ensureFetchCreditEvents(fetchCreditEvents) {
  if (
    typeof fetchCreditEvents !== 'undefined' &&
    typeof fetchCreditEvents !== 'function'
  ) {
    throw new TypeError('fetchCreditEvents must be a function');
  }
}

/**
 * Use a custom UUID resolver or default to the internal extractor.
 * @param {((request: unknown) => string) | undefined} getUuid Optional resolver.
 * @returns {(request: unknown) => string} UUID resolver to run.
 */
function resolveUuidDependency(getUuid) {
  if (typeof getUuid === 'function') {
    return getUuid;
  }

  return request =>
    extractUuid(
      /** @type {{ path?: string, params?: Record<string, unknown>, query?: Record<string, unknown> }} */ (
        request
      )
    );
}

/**
 * Determine whether the request is for credit history.
 * @param {{ path?: string }} request Request-like object.
 * @returns {boolean} True when the history subresource was requested.
 */
function isCreditEventsRequest(request) {
  return String(request.path ?? '').includes('/credit/events');
}

/**
 * Select a logger for handler errors.
 * @param {((error: unknown) => void) | undefined} logError Optional logger.
 * @returns {(error: unknown) => void} Logger that safely ignores errors.
 */
function resolveErrorLogger(logError) {
  return /** @type {(error: unknown) => void} */ (
    functionOrFallback(logError, () => () => {})
  );
}

/**
 * Validate that the method is allowed.
 * @param {string} method Normalized HTTP method.
 * @returns {{ status: number, body: string, headers?: Record<string, string> } | null} Error response when invalid.
 */
function resolveMethodError(method) {
  return whenOrNull(method !== 'GET' && method !== 'POST', () => ({
    status: 405,
    body: 'Method Not Allowed',
    headers: { Allow: 'GET, POST' },
  }));
}

/**
 * Validate the request payload.
 * @param {string} method Normalized HTTP method.
 * @param {string} uuid Extracted UUID string.
 * @returns {ValidationErrorResponse | null} Validation error metadata.
 */
function resolveRequestValidationError(method, uuid) {
  const methodError = resolveMethodError(method);
  if (methodError) {
    return methodError;
  }

  return resolveUuidPresence(uuid);
}

/**
 * Build the response after validation.
 * @param {ValidationErrorResponse | null} validationError Validation result.
 * @param {() => Promise<CreditApiResponse>} onSuccess Success callback returning HTTP metadata.
 * @returns {Promise<CreditApiResponse>} HTTP response information.
 */
async function resolveRequestResponse(validationError, onSuccess) {
  return resolveValidationOrValue(validationError, onSuccess);
}

/**
 * Ensure a UUID string exists and return an error when missing.
 * @param {string} uuid UUID extracted from the request.
 * @returns {{ status: number, body: string } | null} Missing UUID error when absent.
 */
function resolveUuidPresence(uuid) {
  return whenOrNull(!uuid, () => missingUuidResponse());
}

/**
 * Build the standard missing UUID response.
 * @returns {{ status: number, body: string }} HTTP error metadata.
 */
function missingUuidResponse() {
  return {
    status: 400,
    body: 'Missing UUID',
  };
}

/**
 * Read a positive credit amount from a request body.
 * @param {Record<string, unknown>} body Request body.
 * @returns {number} Normalized credit amount.
 */
function readCreditAmount(body) {
  const amount = Number(body.amount);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return amount;
}

/**
 * Read the event type from a request body.
 * @param {Record<string, unknown>} body Request body.
 * @returns {string} Normalized event type.
 */
function readCreditEventType(body) {
  return ensureString(body.type ?? body.eventType);
}

/**
 * Read the idempotency UUID from a request body.
 * @param {Record<string, unknown>} body Request body.
 * @returns {string} Normalized idempotency UUID.
 */
function readIdempotencyUuid(body) {
  return ensureString(body.eventId ?? body.idempotencyUuid);
}

/**
 * Determine whether a credit event type is recognized.
 * @param {unknown} type Event type.
 * @returns {type is CreditEventType} True when the type is supported.
 */
function isCreditEventType(type) {
  return type === 'credit_added' || type === 'credit_deducted';
}

/**
 * Validate the request payload for a credit event write.
 * @param {unknown} body Request body.
 * @returns {ValidationErrorResponse | null} Validation error metadata.
 */
function resolveCreditEventBodyError(body) {
  if (!isNonNullObject(body)) {
    return {
      status: 400,
      body: 'Missing or invalid event body',
    };
  }

  const type = readCreditEventType(
    /** @type {Record<string, unknown>} */ (body)
  );
  if (!type) {
    return {
      status: 400,
      body: 'Missing or invalid event type',
    };
  }

  if (!isCreditEventType(type)) {
    return {
      status: 400,
      body: 'Unsupported event type',
    };
  }

  const eventId = readIdempotencyUuid(
    /** @type {Record<string, unknown>} */ (body)
  );
  if (!eventId) {
    return {
      status: 400,
      body: 'Missing or invalid idempotency UUID',
    };
  }

  const amount = readCreditAmount(
    /** @type {Record<string, unknown>} */ (body)
  );
  if (amount <= 0) {
    return {
      status: 400,
      body: 'Missing or invalid amount',
    };
  }

  return null;
}

/**
 * Normalize and validate a request body into a credit event payload.
 * @param {unknown} body Event body.
 * @returns {CreditEventInput | ValidationErrorResponse} Normalized event or validation error.
 */
function resolveCreditEventInput(body) {
  return resolveValidationOrValue(resolveCreditEventBodyError(body), () => {
    const typedBody =
      /** @type {{ type?: unknown, eventType?: unknown, eventId?: unknown, idempotencyUuid?: unknown, amount?: unknown }} */ (
        body
      );
    const type = readCreditEventType(typedBody);

    return {
      type: /** @type {CreditEventType} */ (type),
      eventId: readIdempotencyUuid(typedBody),
      amount: readCreditAmount(typedBody),
    };
  });
}

/**
 * Fetch credit for a UUID and translate it into an HTTP response.
 * @param {(uuid: string) => Promise<number | null>} fetchCredit Function to fetch credit totals.
 * @param {string} uuid UUID used for the lookup.
 * @param {(error: unknown) => void} errorLogger Logger invoked when fetch attempts fail.
 * @returns {Promise<CreditApiResponse>} HTTP response metadata.
 */
async function fetchCreditResponse(fetchCredit, uuid, errorLogger) {
  return runWithInternalError(errorLogger, async () => {
    const credit = await fetchCredit(uuid);
    let resolvedCredit = 0;
    if (typeof credit === 'number') {
      resolvedCredit = credit;
    }
    return {
      status: 200,
      body: {
        credit: resolvedCredit,
      },
    };
  });
}

/**
 * Fetch the ledger event history and translate it into an HTTP response.
 * @param {(uuid: string) => Promise<Array<CreditLedgerEvent>>} fetchCreditEvents Function to fetch ledger entries.
 * @param {string} uuid UUID used for the lookup.
 * @param {(error: unknown) => void} errorLogger Logger invoked when fetch attempts fail.
 * @returns {Promise<CreditApiResponse>} HTTP response metadata.
 */
async function fetchCreditEventsResponse(fetchCreditEvents, uuid, errorLogger) {
  return runWithInternalError(errorLogger, async () => ({
    status: 200,
    body: {
      events: await fetchCreditEvents(uuid),
    },
  }));
}

/**
 * Apply a credit event and translate it into an HTTP response.
 * @param {(uuid: string, event: CreditEventInput) => Promise<CreditApiResponse>} applyCreditEvent Function to execute the write.
 * @param {string} uuid UUID used for the mutation.
 * @param {unknown} body Request body.
 * @param {(error: unknown) => void} errorLogger Logger invoked when write attempts fail.
 * @returns {Promise<CreditApiResponse>} HTTP response metadata.
 */
async function applyCreditEventResponse(
  applyCreditEvent,
  uuid,
  body,
  errorLogger
) {
  const eventInput = resolveCreditEventInput(body);
  if (isValidationErrorResponse(eventInput)) {
    return eventInput;
  }

  return runWithInternalError(errorLogger, () =>
    applyCreditEvent(uuid, eventInput)
  );
}

/**
 * Determine whether a handler result is a validation error.
 * @param {CreditEventInput | ValidationErrorResponse} value Potential validation result.
 * @returns {value is ValidationErrorResponse} True when the value is an error.
 */
function isValidationErrorResponse(value) {
  return (
    isNonNullObject(value) &&
    'status' in value &&
    typeof value.status === 'number'
  );
}

/**
 * Run a request and convert thrown errors into a standard internal error response.
 * @template T
 * @param {(error: unknown) => void} errorLogger Error logger.
 * @param {() => Promise<T>} action Action to execute.
 * @returns {Promise<T | CreditApiResponse>} Success result or internal error response.
 */
async function runWithInternalError(errorLogger, action) {
  try {
    return await action();
  } catch (error) {
    errorLogger(error);
    return internalErrorResponse();
  }
}

/**
 * Produce a generic internal error response payload.
 * @returns {{ status: number, body: string }} HTTP error metadata.
 */
function internalErrorResponse() {
  return {
    status: 500,
    body: 'Internal error',
  };
}

/**
 * Create a fetchCredit function bound to the supplied Firestore database.
 * @param {CreditFirestore} db Firestore instance to use for lookups.
 * @returns {(uuid: string) => Promise<number>} Function to fetch credit.
 */
export function createFetchCredit(db) {
  return async function fetchCredit(uuid) {
    const snap = await getApiKeyCreditSnapshot(db, uuid);
    return resolveCreditFromSnapshot(snap);
  };
}

/**
 * Create a ledger history fetcher bound to the supplied Firestore database.
 * @param {CreditFirestore} db Firestore instance to use for lookups.
 * @returns {(uuid: string) => Promise<Array<CreditLedgerEvent>>} Function to fetch credit events.
 */
export function createFetchCreditEvents(db) {
  return async function fetchCreditEvents(uuid) {
    const ledgerSnap = await db
      .collection('api-key-ledger')
      .doc(String(uuid))
      .collection('events')
      .get();
    return ledgerSnap.docs
      .map(doc => resolveEventData(doc))
      .filter(isCreditLedgerEvent)
      .sort((a, b) => a.eventId.localeCompare(b.eventId));
  };
}

/**
 * Create a credit-event write function bound to the supplied Firestore database.
 * @param {CreditFirestore} db Firestore instance to use for writes.
 * @returns {(uuid: string, event: CreditEventInput) => Promise<CreditApiResponse>} Function to apply a credit event.
 */
export function createApplyCreditEvent(db) {
  return async function applyCreditEvent(uuid, event) {
    return db.runTransaction(async transaction => {
      const eventRef = getApiKeyCreditEventDocument(db, uuid, event.eventId);
      const eventSnap = await transaction.get(eventRef);
      if (eventSnap.exists) {
        return resolveStoredCreditEventResponse(eventSnap);
      }

      const creditRef = getApiKeyCreditDocument(db, uuid);
      const creditSnap = await transaction.get(creditRef);

      return applyCreditEventTransaction({
        transaction,
        creditRef,
        creditSnap,
        eventRef,
        event,
      });
    });
  };
}

/**
 * Extract the credit number from a Firestore snapshot.
 * @param {import('@google-cloud/firestore').DocumentSnapshot} snap Snapshot containing credit data.
 * @returns {number} Stored credit total when present, otherwise zero.
 */
function resolveCreditFromSnapshot(snap) {
  if (!snap.exists) {
    return 0;
  }

  const data = resolveSnapshotData(snap);
  return resolveCreditValue(data);
}

/**
 * Safely read the Firestore snapshot payload when available.
 * @param {import('@google-cloud/firestore').DocumentSnapshot} snap Firestore snapshot to inspect.
 * @returns {Record<string, unknown> | undefined} Document data or undefined when unavailable.
 */
function resolveSnapshotData(snap) {
  if (typeof snap.data !== 'function') {
    return undefined;
  }

  return snap.data();
}

/**
 * Extract the numeric credit value from normalized data.
 * @param {Record<string, unknown> | undefined} data Data payload.
 * @returns {number} The stored credit when present, otherwise zero.
 */
function resolveCreditValue(data) {
  return getNumericValueOrZero(data, record => record.credit);
}

/**
 * Build a document reference for the balance snapshot.
 * @param {import('@google-cloud/firestore').Firestore} db Firestore instance.
 * @param {string} uuid API key UUID.
 * @returns {import('@google-cloud/firestore').DocumentReference} Balance document reference.
 */
function getApiKeyCreditDocument(db, uuid) {
  return db.collection('api-key-credit').doc(String(uuid));
}

/**
 * Build a document reference for a ledger event.
 * @param {import('@google-cloud/firestore').Firestore} db Firestore instance.
 * @param {string} uuid API key UUID.
 * @param {string} eventId Idempotency UUID.
 * @returns {import('@google-cloud/firestore').DocumentReference} Ledger event reference.
 */
function getApiKeyCreditEventDocument(db, uuid, eventId) {
  return db
    .collection('api-key-ledger')
    .doc(String(uuid))
    .collection('events')
    .doc(String(eventId));
}

/**
 * Apply a credit event within a transaction.
 * @param {{
 *   transaction: CreditTransaction,
 *   creditRef: import('@google-cloud/firestore').DocumentReference,
 *   creditSnap: import('@google-cloud/firestore').DocumentSnapshot,
 *   eventRef: import('@google-cloud/firestore').DocumentReference,
 *   event: CreditEventInput,
 * }} input Mutation input.
 * @returns {Promise<CreditApiResponse>} Response metadata.
 */
async function applyCreditEventTransaction(input) {
  const { transaction, creditRef, creditSnap, eventRef, event } = input;
  const currentCredit = resolveCreditFromSnapshot(creditSnap);

  if (event.type === 'credit_added') {
    return commitCreditEvent({
      transaction,
      creditRef,
      eventRef,
      event,
      balanceBefore: currentCredit,
      balanceAfter: currentCredit + event.amount,
    });
  }

  if (!creditSnap.exists) {
    return {
      status: 404,
      body: 'Not found',
    };
  }

  const nextCredit = currentCredit - event.amount;
  if (nextCredit < 0) {
    return {
      status: 409,
      body: 'Insufficient credit',
    };
  }

  return commitCreditEvent({
    transaction,
    creditRef,
    eventRef,
    event,
    balanceBefore: currentCredit,
    balanceAfter: nextCredit,
  });
}

/**
 * Persist a credit event and snapshot update in one transaction.
 * @param {{
 *   transaction: CreditTransaction,
 *   creditRef: import('@google-cloud/firestore').DocumentReference,
 *   eventRef: import('@google-cloud/firestore').DocumentReference,
 *   event: CreditEventInput,
 *   balanceBefore: number,
 *   balanceAfter: number,
 * }} input Transaction payload.
 * @returns {CreditApiResponse} Response metadata.
 */
function commitCreditEvent(input) {
  const response = createCreditEventResponse(input.event, input.balanceAfter);
  input.transaction.set(input.eventRef, {
    type: input.event.type,
    eventId: input.event.eventId,
    amount: input.event.amount,
    balanceBefore: input.balanceBefore,
    balanceAfter: input.balanceAfter,
  });
  input.transaction.set(input.creditRef, {
    credit: input.balanceAfter,
    lastEventId: input.event.eventId,
  });
  return response;
}

/**
 * Create a response for a committed credit event.
 * @param {CreditEventInput} event Event being applied.
 * @param {number} credit Resulting credit balance.
 * @returns {CreditApiResponse} HTTP response metadata.
 */
function createCreditEventResponse(event, credit) {
  let status = 200;
  if (event.type === 'credit_added') {
    status = 201;
  }

  return {
    status,
    body: {
      credit,
      type: event.type,
      eventId: event.eventId,
      applied: true,
    },
  };
}

/**
 * Reconstruct a response from a stored ledger event.
 * @param {import('@google-cloud/firestore').DocumentSnapshot} snap Ledger event snapshot.
 * @returns {CreditApiResponse} HTTP response metadata.
 */
function resolveStoredCreditEventResponse(snap) {
  const data = resolveEventData(snap);
  if (!data) {
    return internalErrorResponse();
  }

  const { type } = data;
  if (
    !isCreditEventType(type) ||
    typeof data.eventId !== 'string' ||
    typeof data.amount !== 'number' ||
    typeof data.balanceAfter !== 'number'
  ) {
    return internalErrorResponse();
  }

  return createCreditEventResponse(
    {
      type,
      eventId: data.eventId,
      amount: data.amount,
    },
    data.balanceAfter
  );
}

/**
 * Determine whether a value is a valid ledger event snapshot payload.
 * @param {{ type?: CreditEventType, eventId?: string, amount?: number, balanceBefore?: number, balanceAfter?: number } | null} data Event payload candidate.
 * @returns {data is CreditLedgerEvent} True when the payload is valid.
 */
function isCreditLedgerEvent(data) {
  if (!isNonNullObject(data)) {
    return false;
  }

  const typed =
    /** @type {{ type?: CreditEventType, eventId?: string, amount?: number, balanceBefore?: number, balanceAfter?: number }} */ (
      data
    );
  return (
    isCreditEventType(typed.type) &&
    typeof typed.eventId === 'string' &&
    typeof typed.amount === 'number' &&
    typeof typed.balanceBefore === 'number' &&
    typeof typed.balanceAfter === 'number'
  );
}

/**
 * Safely read event data from a snapshot.
 * @param {import('@google-cloud/firestore').DocumentSnapshot} snap Ledger event snapshot.
 * @returns {{ type?: CreditEventType, eventId?: string, amount?: number, balanceAfter?: number } | null} Event data.
 */
function resolveEventData(snap) {
  if (typeof snap.data !== 'function') {
    return null;
  }

  const data = snap.data();
  if (!isNonNullObject(data)) {
    return null;
  }

  return /** @type {{ type?: CreditEventType, eventId?: string, amount?: number, balanceAfter?: number }} */ (
    data
  );
}

/**
 * Return either a validation error or a computed value.
 * @template T
 * @param {ValidationErrorResponse | null} validationError Validation error, if any.
 * @param {() => T} onSuccess Value factory.
 * @returns {ValidationErrorResponse | T} Validation error or computed value.
 */
function resolveValidationOrValue(validationError, onSuccess) {
  return validationError ?? onSuccess();
}
