import { Firestore } from '@google-cloud/firestore';
import { createGetApiKeyCreditHandler } from './handler.js';

const firestore = new Firestore();

const getApiKeyCredit = createGetApiKeyCreditHandler({
  async fetchCredit(uuid) {
    const doc = await firestore
      .collection('api-key-credit')
      .doc(String(uuid))
      .get();

    if (!doc.exists) {
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
