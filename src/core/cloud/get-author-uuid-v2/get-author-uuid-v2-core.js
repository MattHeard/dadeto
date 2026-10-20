import { resolveAuthorIdFromHeader } from '../auth-helpers.js';
import { getAuthorizationHeader } from '../../submit-shared.js';
import { handleBillableAuthorUuidRequest } from './billable-operation.js';
import { createAuthorUuidResponse } from './response.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * @typedef {{ uid?: string | null | undefined }} DecodedToken
 * @typedef {{ verifyIdToken: (token: string) => Promise<DecodedToken> }} AuthLike
 * @typedef {{ collection: (name: string) => { doc: (id: string) => { get: () => Promise<{ data: () => Record<string, unknown> | undefined }>, set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void> } } }} FirestoreLike
 * @typedef {{ method?: string, get?: (name: string) => string | null | undefined, headers?: { authorization?: string | string[] | undefined, Authorization?: string | string[] | undefined, origin?: string | undefined, 'idempotency-key'?: string | string[] | undefined, 'Idempotency-Key'?: string | string[] | undefined } }} RequestLike
 * @typedef {(allowEffects: AllowEffects, input: object) => Promise<{status: number, body: Record<string, unknown>}>} BillingOperation
 * @typedef {{getCurrentPricingSnapshot: () => Promise<object|null>, reserveOperation: BillingOperation, resolveOperation: BillingOperation}} AuthorBillingService
 * @typedef {{enabled?: boolean, resolveBillingIdentity?: (allowEffects: AllowEffects, uid: string) => Promise<string|null>, service?: AuthorBillingService}} AuthorBillingConfiguration
 * @typedef {{db: FirestoreLike, auth: AuthLike, persistence: {randomUUID: () => string, getAuthorDocument?: (allowEffects: AllowEffects, reference: unknown) => Promise<{data: () => Record<string, unknown>|undefined}>, setAuthorDocument: (allowEffects: AllowEffects, reference: unknown, data: object, options: object) => Promise<void>}, billing?: AuthorBillingConfiguration}} AuthorUuidHandlerDependencies
 * @typedef {{db: FirestoreLike, auth: AuthLike, randomUUID: () => string, allowedOrigins?: string[], getAuthorDocument?: (allowEffects: AllowEffects, reference: unknown) => Promise<{data: () => Record<string, unknown>|undefined}>, setAuthorDocument: (allowEffects: AllowEffects, reference: unknown, data: object, options: object) => Promise<void>, billing?: AuthorBillingConfiguration, setResponseHeader: (allowEffects: AllowEffects, response: unknown, name: string, value: string) => unknown, sendJsonResponse: (allowEffects: AllowEffects, response: unknown, status: number, body: unknown) => unknown, sendEmptyResponse: (allowEffects: AllowEffects, response: unknown, status: number) => unknown}} AuthorUuidExpressDependencies
 */

/**
 * Resolve or create the author's public uuid.
 * @param {FirestoreLike} db Firestore instance.
 * @param {() => string} randomUUID UUID generator.
 * @param {(allowEffects: AllowEffects, reference: unknown, data: object, options: object) => Promise<void>} setAuthorDocument Permission-first Firestore write adapter.
 * @param {(allowEffects: AllowEffects, uid: string) => Promise<string|null>} readAuthorUuid Existing UUID reader.
 * @returns {(allowEffects: AllowEffects, uid: string) => Promise<string>} Capability-aware UUID resolver.
 */
function createResolveAuthorUuid(
  db,
  randomUUID,
  setAuthorDocument,
  readAuthorUuid
) {
  return async function resolveAuthorUuid(allowEffects, uid) {
    const authorRef = db.collection('authors').doc(uid);
    const existingUuid = await readAuthorUuid(allowEffects, uid);
    if (existingUuid) return existingUuid;

    const uuid = randomUUID();
    await setAuthorDocument(allowEffects, authorRef, { uuid }, { merge: true });
    return uuid;
  };
}

/**
 * Create an authenticated handler that returns the caller's author uuid.
 * @param {AuthorUuidHandlerDependencies} deps Handler dependencies.
 * @returns {(allowEffects: AllowEffects, request?: RequestLike) => Promise<{ status: number, body: string | Record<string, unknown> }>} Request handler.
 */
export function createGetAuthorUuidV2Handler(deps) {
  const { db, auth, persistence, billing } = deps;
  const { randomUUID, setAuthorDocument } = persistence;
  const billingEnabled = billing?.enabled === true;
  const billingService = billing?.service;
  const resolveBillingIdentity = billing?.resolveBillingIdentity;
  const getAuthorDocument =
    persistence.getAuthorDocument ??
    ((allowEffects, reference) => {
      void allowEffects;
      return /** @type {{get: () => Promise<{data: () => Record<string, unknown>|undefined}>}} */ (
        reference
      ).get();
    });
  /** @type {(allowEffects: AllowEffects, uid: string) => Promise<string|null>} */
  const readAuthorUuid = async (allowEffects, uid) => {
    const reference = db.collection('authors').doc(uid);
    const snapshot = await getAuthorDocument(allowEffects, reference);
    const uuid = snapshot.data()?.uuid;
    return typeof uuid === 'string' && uuid ? uuid : null;
  };
  const resolveUuid = createResolveAuthorUuid(
    db,
    randomUUID,
    setAuthorDocument,
    readAuthorUuid
  );
  return async function handleRequest(allowEffects, request = {}) {
    const uid = await resolveAuthorIdFromHeader(
      getAuthorizationHeader(request),
      token => auth.verifyIdToken(token)
    );
    if (!uid) {
      return { status: 401, body: 'Invalid or expired token' };
    }

    if (billingEnabled) {
      return handleBillableAuthorUuidRequest({
        allowEffects,
        request,
        uid,
        billing: billingService,
        resolveBillingIdentity,
        readAuthorUuid,
        resolveUuid,
      });
    }

    const uuid = await resolveUuid(allowEffects, uid);
    return createAuthorUuidResponse(uuid);
  };
}

/**
 * Wrap the request handler in an Express responder.
 * @param {AuthorUuidExpressDependencies} deps Handler dependencies.
 * @returns {(allowEffects: AllowEffects, req: RequestLike, res: unknown) => Promise<void>} Express handler.
 */
export function createGetAuthorUuidV2ExpressHandle(deps) {
  const handleRequest = createGetAuthorUuidV2Handler({
    db: deps.db,
    auth: deps.auth,
    persistence: {
      randomUUID: deps.randomUUID,
      getAuthorDocument: deps.getAuthorDocument,
      setAuthorDocument: deps.setAuthorDocument,
    },
    billing: deps.billing,
  });
  return async function handle(allowEffects, req, res) {
    const origin = req?.headers?.origin;
    const corsHeaders = /** @type {Record<string, string>} */ ({
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Idempotency-Key',
      Vary: 'Origin',
    });
    if (
      typeof origin === 'string' &&
      (deps.allowedOrigins ?? []).includes(origin)
    )
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    Object.entries(corsHeaders).forEach(([name, value]) =>
      deps.setResponseHeader(allowEffects, res, name, value)
    );

    if (req?.method === 'OPTIONS') {
      deps.sendEmptyResponse(allowEffects, res, 204);
      return;
    }
    if (req?.method && req.method !== 'GET') {
      deps.setResponseHeader(allowEffects, res, 'Allow', 'GET, OPTIONS');
      deps.sendJsonResponse(allowEffects, res, 405, 'Method not allowed');
      return;
    }
    const result = await handleRequest(allowEffects, req);
    deps.sendJsonResponse(allowEffects, res, result.status, result.body);
  };
}
