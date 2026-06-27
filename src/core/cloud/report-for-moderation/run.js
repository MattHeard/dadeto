/* istanbul ignore file */
import {
  createCorsOptions,
  createHandleReportForModeration,
  createReportForModerationHandler,
} from './report-for-moderation-core.js';
import { getAllowedOrigins } from '../cors-config.js';

/**
 * Wire the report-for-moderation cloud function.
 * @param {{
 *   functions: { region: (region: string) => { https: { onRequest: (handler: unknown) => unknown } } },
 *   express: (() => { use: (middleware: unknown) => void, all: (path: string, handler: unknown) => void }) & { json: () => unknown },
 *   cors: (options: unknown) => unknown,
 *   FieldValue: { serverTimestamp: () => unknown },
 *   createFirebaseAppManager: (initializeApp: typeof import('firebase-admin/app').initializeApp) => { ensureFirebaseApp: () => void },
 *   getFirestoreInstance: () => import('firebase-admin/firestore').Firestore,
 *   getEnvironmentVariables: () => Record<string, unknown>,
 *   initializeApp: typeof import('firebase-admin/app').initializeApp,
 * }} deps Cloud wiring dependencies.
 * @returns {{ handle: unknown, handleReportForModeration: unknown }} Wired exports.
 */
export function runReportForModeration(deps) {
  const firebaseAppManager = deps.createFirebaseAppManager(deps.initializeApp);
  firebaseAppManager.ensureFirebaseApp();

  const db = deps.getFirestoreInstance();
  const moderationReportsCollection = /** @type {any} */ (
    db.collection('moderationReports')
  );
  /** @type {(report: { variant: string, reporterIdentity: string, createdAt: unknown }) => Promise<void>} */
  const addModerationReport = /** @type {any} */ (
    moderationReportsCollection.add.bind(moderationReportsCollection)
  );
  const reportForModerationHandler = createReportForModerationHandler({
    addModerationReport,
    hasModerationReport: async (reporterIdentity, variant) => {
      const snapshot = await moderationReportsCollection
        .where('reporterIdentity', '==', reporterIdentity)
        .where('variant', '==', variant)
        .limit(1)
        .get();

      return !snapshot.empty;
    },
    getServerTimestamp: deps.FieldValue.serverTimestamp,
  });

  const handleReportForModeration = createHandleReportForModeration(
    reportForModerationHandler
  );

  const app = deps.express();
  const environmentVariables = deps.getEnvironmentVariables();
  const allowedOrigins = getAllowedOrigins(environmentVariables);
  const corsOptions = createCorsOptions({ allowedOrigins, methods: ['POST'] });

  app.use(deps.cors(corsOptions));
  app.use(deps.express.json());
  app.all('/', handleReportForModeration);

  const handle = deps.functions.region('europe-west1').https.onRequest(app);

  return { handle, handleReportForModeration };
}
