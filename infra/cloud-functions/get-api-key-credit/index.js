import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

/**
 * Fetch credit value associated with the given UUID.
 * @param {string} uuid - API key identifier.
 * @returns {Promise<number|null>} Credit or null when not found.
 */
async function fetchCredit(uuid) {
  const doc = await firestore.collection('api-key-credit').doc(uuid).get();
  if (doc.exists) {
    const data = doc.data();
    return data.credit;
  }
  return null;
}

/**
 * Respond with a 400 Bad Request message.
 * @param {object} res - Express response object.
 * @param {string} message - Error message.
 */
function sendBadRequest(res, message) {
  res.status(400).send(message);
}

/**
 * Respond with the provided credit value or a 404 error.
 * @param {object} res - Express response object.
 * @param {number|null} credit - Credit value or null when not found.
 */
function respondWithCredit(res, credit) {
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
function respondWithCreditOrError(res, credit) {
  if (credit === undefined) {
    res.status(500).send('Internal error');
    return;
  }
  respondWithCredit(res, credit);
}

/**
 * Fetch credit while logging errors.
 * @param {string} uuid - API key identifier.
 * @returns {Promise<number|null|undefined>} Credit, null when not found, or undefined on error.
 */
async function safeFetchCredit(uuid) {
  try {
    return await fetchCredit(uuid);
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

/**
 * Extract the UUID from the request parameters or query string.
 * @param {object} req - Express request object.
 * @returns {string|undefined} The UUID when present.
 */
function getUuid(req) {
  return req.params.uuid || req.query.uuid;
}

/**
 * HTTP Cloud Function to retrieve credit data associated with an API key.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {Promise<void>} Response with credit value or error code.
 */
export async function handler(req, res) {
  const uuid = getUuid(req);

  if (!uuid) {
    sendBadRequest(res, 'Missing UUID');
    return;
  }

  const credit = await safeFetchCredit(uuid);
  respondWithCreditOrError(res, credit);
}
