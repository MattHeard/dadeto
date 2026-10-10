import { resolveAuthorIdFromHeader } from '../auth-helpers.js';
import { getAuthorizationHeader } from '../../submit-shared.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * @typedef {{ uid?: string | null | undefined }} DecodedToken
 * @typedef {{ verifyIdToken: (token: string) => Promise<DecodedToken> }} AuthLike
 * @typedef {{ collection: (name: string) => { doc: (id: string) => { get: () => Promise<{ data: () => Record<string, unknown> | undefined }>, set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void> } } }} FirestoreLike
 * @typedef {{ get?: (name: string) => string | null | undefined, headers?: { authorization?: string | string[] | undefined, Authorization?: string | string[] | undefined } }} RequestLike
 */

/**
 * Resolve or create the author's public uuid.
 * @param {FirestoreLike} db Firestore instance.
 * @param {() => string} randomUUID UUID generator.
 * @param {(allowEffects: AllowEffects, reference: unknown, data: object, options: object) => Promise<void>} setAuthorDocument Permission-first Firestore write adapter.
 * @returns {(allowEffects: AllowEffects, uid: string) => Promise<string>} Capability-aware UUID resolver.
 */
function createResolveAuthorUuid(db, randomUUID, setAuthorDocument) {
  return async function resolveAuthorUuid(allowEffects, uid) {
    const authorRef = db.collection('authors').doc(uid);
    const snap = await authorRef.get();
    const data = snap.data();
    if (typeof data?.uuid === 'string' && data.uuid) {
      return data.uuid;
    }

    const uuid = randomUUID();
    await setAuthorDocument(allowEffects, authorRef, { uuid }, { merge: true });
    return uuid;
  };
}

/**
 * Create an authenticated handler that returns the caller's author uuid.
 * @param {{ db: FirestoreLike, auth: AuthLike, randomUUID: () => string, setAuthorDocument: (allowEffects: AllowEffects, reference: unknown, data: object, options: object) => Promise<void> }} deps Handler dependencies.
 * @returns {(allowEffects: AllowEffects, request?: RequestLike) => Promise<{ status: number, body: string | { uuid: string } }>} Request handler.
 */
export function createGetAuthorUuidV2Handler(deps) {
  const { db, auth, randomUUID, setAuthorDocument } = deps;
  const resolveUuid = createResolveAuthorUuid(
    db,
    randomUUID,
    setAuthorDocument
  );
  return async function handleRequest(allowEffects, request = {}) {
    const uid = await resolveAuthorIdFromHeader(
      getAuthorizationHeader(request),
      token => auth.verifyIdToken(token)
    );
    if (!uid) {
      return { status: 401, body: 'Invalid or expired token' };
    }

    const uuid = await resolveUuid(allowEffects, uid);
    return { status: 200, body: { uuid } };
  };
}

/**
 * Wrap the request handler in an Express responder.
 * @param {{ db: FirestoreLike, auth: AuthLike, randomUUID: () => string, setAuthorDocument: (allowEffects: AllowEffects, reference: unknown, data: object, options: object) => Promise<void>, sendJsonResponse: (allowEffects: AllowEffects, response: unknown, status: number, body: unknown) => unknown }} deps Handler dependencies.
 * @returns {(allowEffects: AllowEffects, req: RequestLike, res: unknown) => Promise<void>} Express handler.
 */
export function createGetAuthorUuidV2ExpressHandle(deps) {
  const handleRequest = createGetAuthorUuidV2Handler(deps);
  return async function handle(allowEffects, req, res) {
    const result = await handleRequest(allowEffects, req);
    deps.sendJsonResponse(allowEffects, res, result.status, result.body);
  };
}
