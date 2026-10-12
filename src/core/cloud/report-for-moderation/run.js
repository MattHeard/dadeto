import {
  createCorsOptions,
  createHandleReportForModeration,
  createReportForModerationHandler,
} from './report-for-moderation-core.js';
import { getAllowedOrigins } from '../cors-config.js';
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/** @typedef {import('firebase-admin/firestore').CollectionReference & { add: (report: Record<string, unknown>) => Promise<unknown> }} ModerationReportsCollection */

/**
 * Wire the report-for-moderation cloud function.
 * @param {AllowEffects} startupAllowEffects Permission for startup effects.
 * @param {{
 *   functions: { region: (region: string) => { https: { onRequest: (handler: unknown) => unknown } } },
 *   express: (() => { use: (middleware: unknown) => void, all: (path: string, handler: unknown) => void }) & { json: () => unknown },
 *   cors: (options: unknown) => unknown,
 *   FieldValue: { serverTimestamp: () => unknown },
 *   db: import('firebase-admin/firestore').Firestore,
 *   useMiddleware: typeof import('../../../cloud/report-for-moderation/effect-adapters.js').useReportMiddleware,
 *   registerRoute: typeof import('../../../cloud/report-for-moderation/effect-adapters.js').registerReportRoute,
 *   registerFunction: typeof import('../../../cloud/report-for-moderation/effect-adapters.js').registerReportFunction,
 *   addModerationReport: (permission: AllowEffects, collection: ModerationReportsCollection, report: Record<string, unknown>) => Promise<void>,
 *   sendResponse: typeof import('../../../cloud/report-for-moderation/effect-adapters.js').sendReportResponse,
 *   createHttpBoundary: typeof import('../../../cloud/allow-effects.js').createEffectHttpBoundary,
 *   getEnvironmentVariables: () => Record<string, unknown>,
 * }} deps Cloud wiring dependencies.
 * @returns {{ handle: unknown, handleReportForModeration: unknown }} Wired exports.
 */
export function runReportForModeration(startupAllowEffects, deps) {
  const { db } = deps;
  const moderationReportsCollection =
    /** @type {ModerationReportsCollection} */ (
      db.collection('moderationReports')
    );
  /**
   * Persist a moderation report.
   * @param {{ variant: string, reporterIdentity: string, createdAt: unknown }} report Report to persist.
   * @returns {Promise<void>} Completion of the write.
   */
  const reportForModerationHandler = createReportForModerationHandler({
    addModerationReport: (permission, report) =>
      deps.addModerationReport(permission, moderationReportsCollection, report),
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
    reportForModerationHandler,
    deps.sendResponse
  );

  const app = deps.express();
  const environmentVariables = deps.getEnvironmentVariables();
  const allowedOrigins = getAllowedOrigins(environmentVariables);
  const corsOptions = createCorsOptions({ allowedOrigins, methods: ['POST'] });

  deps.useMiddleware(startupAllowEffects, app, deps.cors(corsOptions));
  deps.useMiddleware(startupAllowEffects, app, deps.express.json());
  deps.registerRoute(
    startupAllowEffects,
    app,
    '/',
    deps.createHttpBoundary(handleReportForModeration)
  );

  const handle = deps.registerFunction(
    startupAllowEffects,
    deps.functions,
    app
  );

  return { handle, handleReportForModeration };
}
