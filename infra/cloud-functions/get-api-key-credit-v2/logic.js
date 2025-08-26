/**
 * Extract a UUID from request path, params, or query.
 * @param {object} req HTTP request.
 * @returns {string} UUID string or empty string when missing.
 */
export function extractUuid(req) {
  const m = (req.path || '').match(
    /\/api-keys\/([0-9a-fA-F-]{36})\/credit\/?$/
  );
  if (m) return m[1];
  return req.params?.uuid || req.query?.uuid || '';
}

/**
 * Fetch credit value for the UUID.
 * @param {object} repo Firestore collection with doc().get().
 * @param {string} uuid API key identifier.
 * @returns {Promise<number|null>} Credit or null when not found.
 */
export async function fetchCredit(repo, uuid) {
  const snap = await repo.doc(String(uuid)).get();
  return snap.exists ? (snap.data().credit ?? 0) : null;
}

/**
 * Handle HTTP request for API key credit.
 * @param {object} req HTTP request.
 * @param {object} res HTTP response.
 * @param {{repo: {doc: (id: string) => {get: () => Promise<object>}}}} deps Dependencies.
 * @returns {Promise<void>} Response promise.
 */
export async function handleRequest(req, res, { repo }) {
  if (req.method !== 'GET') {
    res.set('Allow', 'GET');
    res.status(405).send('Method Not Allowed');
    return;
  }
  const uuid = extractUuid(req);
  if (!uuid) {
    res.status(400).send('Missing UUID');
    return;
  }
  try {
    const credit = await fetchCredit(repo, uuid);
    if (credit === null) {
      res.status(404).send('Not found');
      return;
    }
    res.json({ credit });
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal error');
  }
}
