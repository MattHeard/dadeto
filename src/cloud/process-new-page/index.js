import { randomUUID } from 'node:crypto';
import functions from '../firebase-functions.js';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreInstance } from './firestore.js';
import { createProcessNewPageHandler } from './process-new-page-core.js';

const db = getFirestoreInstance();

const handleProcessNewPage = createProcessNewPageHandler({
  db,
  fieldValue: FieldValue,
  randomUUID,
  random: Math.random,
});

export const processNewPage = functions
  .region('europe-west1')
  .firestore.document('pageFormSubmissions/{subId}')
  .onCreate((snap, context) => handleProcessNewPage(snap, context));

export { handleProcessNewPage };
export * from './common-gcf.js';
