import { onRequest } from 'firebase-functions/v2/https';
import { Firestore } from '@google-cloud/firestore';
import { handleRequest } from './logic.js';

const db = new Firestore();
const repo = db.collection('api-key-credit');

export const getApiKeyCreditV2 = onRequest((req, res) =>
  handleRequest(req, res, { repo })
);
