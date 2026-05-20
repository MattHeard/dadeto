import { initializeApp } from 'firebase-admin/app';
import {
  functions,
  FieldValue,
  getAuth,
  express,
  cors,
  crypto,
  createFirebaseAppManager,
  getFirestoreInstance,
  getEnvironmentVariables,
} from './submit-new-page-gcf.js';
import { getAllowedOrigins } from './cors-config.js';
import {
  createHandleSubmit,
  createSubmitNewPageApp,
  createSubmitNewPageRequestHandler,
} from './submit-new-page-core.js';
import {
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
} from './helpers.js';

const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

ensureFirebaseApp();
const db = getFirestoreInstance();
const auth = getAuth();
const handleSubmitCore = createHandleSubmit({
  verifyIdToken: token => auth.verifyIdToken(token),
  saveSubmission: (id, data) =>
    db.collection('pageFormSubmissions').doc(id).set(data),
  randomUUID: () => crypto.randomUUID(),
  serverTimestamp: () => FieldValue.serverTimestamp(),
  parseIncomingOption,
  findExistingOption: parsed => findExistingOption(db, parsed),
  findExistingPage: pageNumber => findExistingPage(db, pageNumber),
});
const app = createSubmitNewPageApp({
  express,
  cors,
  allowedOrigins: getAllowedOrigins(getEnvironmentVariables()),
  handleSubmit: createSubmitNewPageRequestHandler(handleSubmitCore),
});

export const submitNewPage = functions
  .region('europe-west1')
  .https.onRequest(app);
