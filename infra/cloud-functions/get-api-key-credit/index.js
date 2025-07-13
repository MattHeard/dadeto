import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

/**
 * HTTP Cloud Function to retrieve credit data associated with an API key.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {Promise<void>} Response with credit value or error code.
 */
export async function handler(req, res) {
  const { uuid } = req.params;

  if (!uuid) {
    res.status(400).send('Missing UUID');
    return;
  }

  try {
    const doc = await firestore.collection('api-key-credit').doc(uuid).get();

    if (!doc.exists) {
      res.status(404).send('Not found');
      return;
    }

    const data = doc.data();
    res.status(200).json({ credit: data.credit });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal error');
  }
}
