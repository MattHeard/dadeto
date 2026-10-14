import { sendResponseBody } from '../../core/cloud/response-utils.js';

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {(permission: import('../../../types/allow-effects').AllowEffects) => void} ensureApp */
export function initializeReportModerationFirebase(permission, ensureApp) {
  ensureApp(permission);
}

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {{add: (report: Record<string, unknown>) => Promise<unknown>}} collection @param {Record<string, unknown>} report */
export async function addModerationReport(permission, collection, report) {
  void permission;
  await collection.add(report);
}

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {{use: (middleware: unknown) => void}} app @param {unknown} middleware */
export function useReportMiddleware(permission, app, middleware) {
  void permission;
  app.use(middleware);
}

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {{all: (path: string, handler: unknown) => void}} app @param {string} path @param {unknown} handler */
export function registerReportRoute(permission, app, path, handler) {
  void permission;
  app.all(path, handler);
}

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {{region: (region: string) => {https: {onRequest: (handler: unknown) => unknown}}}} functions @param {unknown} app */
export function registerReportFunction(permission, functions, app) {
  void permission;
  return functions.region('europe-west1').https.onRequest(app);
}

/** @param {import('../../../types/allow-effects').AllowEffects} permission @param {unknown} response @param {number} status @param {string|Record<string, unknown>} body */
export function sendReportResponse(permission, response, status, body) {
  void permission;
  sendResponseBody(
    /** @type {Parameters<typeof sendResponseBody>[0]} */ (response),
    status,
    body,
    typeof body === 'string' ? 'send' : 'json'
  );
}
