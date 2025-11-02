import { Firestore } from './get-api-key-credit-gcf.js';
import {
  createFirestore,
  createGetApiKeyCreditHandler,
  fetchApiKeyCreditDocument,
  isMissingDocument,
} from './get-api-key-credit-core.js';

/**
 * Create a memoized async getter for a Firestore instance.
 * @returns {() => Promise<import('@google-cloud/firestore').Firestore>} Memoized Firestore accessor.
 */
function createGetFirestoreInstance() {
  let firestoreInstance;

  return async function getFirestoreInstance() {
    if (!firestoreInstance) {
      firestoreInstance = createFirestore(Firestore);
    }

    return firestoreInstance;
  };
}

const getFirestoreInstance = createGetFirestoreInstance();

/**
 * Normalize a potential UUID candidate sourced from an HTTP request.
 * @param {unknown} candidate Value read from the request payload.
 * @returns {string|undefined} Sanitized UUID value when present.
 */
function readUuidCandidate(candidate) {
  if (typeof candidate !== 'string') {
    return undefined;
  }

  const trimmedCandidate = candidate.trim();

  if (trimmedCandidate.length === 0) {
    return undefined;
  }

  return trimmedCandidate;
}

/**
 * Resolve the first UUID-like value from an Express request.
 * @param {import('express').Request|undefined} request Incoming request object.
 * @returns {string|undefined} UUID extracted from params, query, or body.
 */
function findUuidFromRequest(request) {
  if (!request) {
    return undefined;
  }

  let paramsUuid;

  if (request.params) {
    paramsUuid = readUuidCandidate(request.params.uuid);
  }

  if (paramsUuid) {
    return paramsUuid;
  }

  let queryUuid;

  if (request.query) {
    queryUuid = readUuidCandidate(request.query.uuid);
  }

  if (queryUuid) {
    return queryUuid;
  }

  let bodyUuid;

  if (request.body) {
    bodyUuid = readUuidCandidate(request.body.uuid);
  }

  return bodyUuid;
}

const getApiKeyCredit = createGetApiKeyCreditHandler({
  async fetchCredit(uuid) {
    const firestore = await getFirestoreInstance();
    const doc = await fetchApiKeyCreditDocument(firestore, uuid);

    if (isMissingDocument(doc)) {
      return null;
    }

    const data = doc.data();

    return data ? data.credit : undefined;
  },
  getUuid(request) {
    return findUuidFromRequest(request);
  },
});

/**
 * Express entry point bridging the core API key credit handler.
 * @param {import('express').Request} req Incoming request.
 * @param {import('express').Response} res Express response.
 * @returns {Promise<void>} Resolves after the response is sent.
 */
export async function handler(req, res) {
  const { status, body } = await getApiKeyCredit(req);

  if (status === 405) {
    res.set('Allow', 'POST');
  }

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    res.status(status).json(body);
    return;
  }

  res.status(status).send(body);
}

export {
  createFirestore,
  createGetApiKeyCreditHandler,
  fetchApiKeyCreditDocument,
  isMissingDocument,
} from './get-api-key-credit-core.js';
