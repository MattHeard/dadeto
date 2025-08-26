// Gen2 HTTP function: GET /api-keys/:uuid/credit  (also supports ?uuid=)
// Returns: { credit: number } or 404 if missing
import { onRequest } from 'firebase-functions/v2/https';
import { Firestore } from '@google-cloud/firestore';

const db = new Firestore();

/**
 *
 * @param req
 */
function extractUuid(req) {
  // Prefer REST path: /api-keys/<uuid>/credit
  const m = (req.path || '').match(
    /\/api-keys\/([0-9a-fA-F-]{36})\/credit\/?$/
  );
  if (m) return m[1];
  // Fallbacks for parity with Gen1
  return req.params?.uuid || req.query?.uuid || '';
}

/**
 *
 * @param uuid
 */
async function fetchCredit(uuid) {
  const snap = await db.collection('api-key-credit').doc(String(uuid)).get();
  return snap.exists ? (snap.data().credit ?? 0) : null;
}

export const getApiKeyCreditV2 = onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    res.set('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }
  const uuid = extractUuid(req);
  if (!uuid) return res.status(400).send('Missing UUID');

  try {
    const credit = await fetchCredit(uuid);
    if (credit === null) return res.status(404).send('Not found');
    return res.json({ credit });
  } catch (e) {
    console.error(e);
    return res.status(500).send('Internal error');
  }
});
