import { Firestore } from './get-api-key-credit-gcf.js';
import {
  createFirestore,
  createGetApiKeyCreditHandler,
  fetchApiKeyCreditDocument,
  isMissingDocument,
} from './get-api-key-credit-core.js';

/**
 *
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
    return request?.params?.uuid || request?.query?.uuid || request?.body?.uuid;
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
