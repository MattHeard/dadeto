import { Firestore } from '@google-cloud/firestore';
import { handler as logicHandler } from './logic.js';

const firestore = new Firestore();
const repo = firestore.collection('api-key-credit');

/**
 *
 * @param req
 * @param res
 */
export async function handler(req, res) {
  await logicHandler(req, res, { repo });
}
