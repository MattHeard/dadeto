// @ts-nocheck
import {
  createCorsOptions,
  createCorsErrorHandler,
  createHandleSubmitNewStory,
  createSubmitNewStoryResponder,
} from './submit-new-story-core.js';

/**
 * Set up and export the submit-new-story cloud function.
 * @param {{
 *   initializeApp: typeof import('firebase-admin/app').initializeApp,
 *   createFirebaseAppManager: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').createFirebaseAppManager,
 *   getFirestoreInstance: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').getFirestoreInstance,
 *   getAuth: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').getAuth,
 *   express: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').express,
 *   cors: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').cors,
 *   crypto: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').crypto,
 *   FieldValue: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').FieldValue,
 *   functions: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').functions,
 *   getEnvironmentVariables: typeof import('../../../../src/cloud/submit-new-story/submit-new-story-gcf.js').getEnvironmentVariables,
 *   getAllowedOrigins: typeof import('../../../../src/cloud/submit-new-story/cors-config.js').getAllowedOrigins,
 * }} deps Dependencies for wiring the endpoint.
 * @returns {{ submitNewStory: unknown, handleSubmitNewStory: Function, app: unknown }} Wired endpoint exports.
 */
export function runSubmitNewStory(deps) {
  const { ensureFirebaseApp } = deps.createFirebaseAppManager(
    deps.initializeApp
  );

  ensureFirebaseApp();
  const db = deps.getFirestoreInstance();
  const auth = deps.getAuth();
  const app = deps.express();

  const environmentVariables = deps.getEnvironmentVariables();
  const allowedOrigins = deps.getAllowedOrigins(environmentVariables);
  const corsOptions = createCorsOptions({ allowedOrigins });

  app.use(deps.cors(corsOptions));
  app.use(createCorsErrorHandler());
  app.use(deps.express.json({ limit: '20kb' }));
  app.use(deps.express.urlencoded({ extended: false, limit: '20kb' }));

  const submitNewStoryResponder = createSubmitNewStoryResponder({
    verifyIdToken: token => auth.verifyIdToken(token),
    saveSubmission: (id, data) =>
      db.collection('storyFormSubmissions').doc(id).set(data),
    randomUUID: () => deps.crypto.randomUUID(),
    getServerTimestamp: () => deps.FieldValue.serverTimestamp(),
  });

  const handleSubmitNewStory = createHandleSubmitNewStory(
    submitNewStoryResponder
  );

  app.post('/', handleSubmitNewStory);

  const submitNewStory = deps.functions
    .region('europe-west1')
    .https.onRequest(app);

  return { submitNewStory, handleSubmitNewStory, app };
}
