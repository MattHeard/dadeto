/**
 * Fetch credit value associated with a UUID from repository.
 * @param {object} repo - Firestore collection with doc().get().
 * @param {string} uuid - API key identifier.
 * @returns {Promise<number|null>} Credit or null when not found.
 */
export async function fetchCredit(repo, uuid) {
  const doc = await repo.doc(uuid).get();
  if (doc.exists) {
    const data = doc.data();
    return data.credit;
  }
  return null;
}

/**
 * Respond with the provided credit value or a 404 error.
 * @param {object} res - Express response object.
 * @param {number|null} credit - Credit value or null when not found.
 */
export function respondWithCredit(res, credit) {
  if (credit === null) {
    res.status(404).send('Not found');
    return;
  }
  res.status(200).json({ credit });
}

/**
 * Send a credit response or a 500 error when undefined.
 * @param {object} res - Express response object.
 * @param {number|null|undefined} credit - Credit value, null when not found, or undefined on error.
 */
export function respondWithCreditOrError(res, credit) {
  if (credit === undefined) {
    res.status(500).send('Internal error');
    return;
  }
  respondWithCredit(res, credit);
}

/**
 * Fetch credit while logging errors.
 * @param {object} repo - Firestore collection with doc().get().
 * @param {string} uuid - API key identifier.
 * @returns {Promise<number|null|undefined>} Credit, null when not found, or undefined on error.
 */
export async function safeFetchCredit(repo, uuid) {
  try {
    return await fetchCredit(repo, uuid);
  } catch {
    return undefined;
  }
}

/**
 * Extract the UUID from the request parameters or query string.
 * @param {object} req - Express request object.
 * @returns {string|undefined} The UUID when present.
 */
export function getUuid(req) {
  return req.params?.uuid || req.query?.uuid;
}

/**
 * Respond with a 400 Bad Request message.
 * @param {object} res - Express response object.
 * @param {string} message - Error message.
 */
export function sendBadRequest(res, message) {
  res.status(400).send(message);
}

/**
 * HTTP handler to retrieve credit data associated with an API key.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {{repo: {doc: (id: string) => {get: () => Promise<object>}}}} deps - Dependencies.
 * @returns {Promise<void>} Response with credit value or error code.
 */
export async function handler(req, res, { repo }) {
  const uuid = getUuid(req);

  if (!uuid) {
    sendBadRequest(res, 'Missing UUID');
    return;
  }

  const credit = await safeFetchCredit(repo, uuid);
  respondWithCreditOrError(res, credit);
}
