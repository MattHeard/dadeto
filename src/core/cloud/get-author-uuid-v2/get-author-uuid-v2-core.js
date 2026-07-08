import { resolveAuthorIdFromHeader } from '../auth-helpers.js';
import { getAuthorizationHeader } from '../../submit-shared.js';

/**
 * @typedef {{ uid?: string | null | undefined }} DecodedToken
 * @typedef {{ verifyIdToken: (token: string) => Promise<DecodedToken> }} AuthLike
 * @typedef {{ collection: (name: string) => { doc: (id: string) => { get: () => Promise<{ data: () => Record<string, unknown> | undefined }>, set: (data: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void> } } }} FirestoreLike
 * @typedef {{ get?: (name: string) => string | null | undefined, headers?: { authorization?: string | string[] | undefined, Authorization?: string | string[] | undefined } }} RequestLike
 */

/**
 * Resolve or create the author's public uuid.
 * @param {FirestoreLike} db Firestore instance.
 * @param {string} uid Verified user uid.
 * @param {() => string} randomUUID UUID generator.
 * @returns {Promise<string>} Author uuid.
 */
async function resolveAuthorUuid(db, uid, randomUUID) {
  const authorRef = db.collection('authors').doc(uid);
  const snap = await authorRef.get();
  const data = snap.data();
  if (typeof data?.uuid === 'string' && data.uuid) {
    return data.uuid;
  }

  const uuid = randomUUID();
  await authorRef.set({ uuid }, { merge: true });
  return uuid;
}

/**
 * Create an authenticated handler that returns the caller's author uuid.
 * @param {{ db: FirestoreLike, auth: AuthLike, randomUUID: () => string }} deps Handler dependencies.
 * @returns {(request?: RequestLike) => Promise<{ status: number, body: string | { uuid: string } }>} Request handler.
 */
export function createGetAuthorUuidV2Handler(deps) {
  const { db, auth, randomUUID } = deps;
  return async function handleRequest(request = {}) {
    const uid = await resolveAuthorIdFromHeader(
      getAuthorizationHeader(request),
      token => auth.verifyIdToken(token)
    );
    if (!uid) {
      return { status: 401, body: 'Invalid or expired token' };
    }

    const uuid = await resolveAuthorUuid(db, uid, randomUUID);
    return { status: 200, body: { uuid } };
  };
}

/**
 * Wrap the request handler in an Express responder.
 * @param {{ db: FirestoreLike, auth: AuthLike, randomUUID: () => string }} deps Handler dependencies.
 * @returns {(req: RequestLike, res: { status: (code: number) => { json: (body: unknown) => void } }) => Promise<void>} Express handler.
 */
export function createGetAuthorUuidV2ExpressHandle(deps) {
  const handleRequest = createGetAuthorUuidV2Handler(deps);
  return async function handle(req, res) {
    const result = await handleRequest(req);
    res.status(result.status).json(result.body);
  };
}
