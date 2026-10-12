/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {import('../../../types/native-http').NativeExpressApp} NativeExpressApp */
import { createAllowEffects } from '../allow-effects.js';

/** @param {AllowEffects} permission @param {NativeExpressApp} app @param {unknown} middleware */
export function useRealtimeMiddleware(permission, app, middleware) {
  void permission;
  app.use(middleware);
}
/** @param {AllowEffects} permission @param {NativeExpressApp} app @param {string} path @param {Function} handler */
export function registerRealtimePostRoute(permission, app, path, handler) {
  void permission;
  app.post(path, handler);
}
/** @param {AllowEffects} permission @param {NativeExpressApp} app @param {Function} handler */
export function registerRealtimeErrorHandler(permission, app, handler) {
  void permission;
  app.use((error, request, response, _next) =>
    handler(createAllowEffects(), error, request, response)
  );
}
/** @param {AllowEffects} permission @param {(options: object, handler: unknown) => unknown} onRequest @param {NativeExpressApp} app */
export function registerRealtimeFunction(permission, onRequest, app) {
  void permission;
  return onRequest({ region: 'europe-west1' }, app);
}

/** @param {AllowEffects} permission @param {unknown} response @param {string} sdpAnswer @param {string} location */
export function sendRealtimeAnswer(permission, response, sdpAnswer, location) {
  void permission;
  const target = /** @type {{set: (name: string, value: string) => unknown, type: (value: string) => {send: (body: string) => unknown}}} */ (response);
  if (location) target.set('Location', location);
  target.type('application/sdp').send(sdpAnswer);
}

/** @param {AllowEffects} permission @param {(error?: unknown) => unknown} next @param {unknown} error */
export function forwardRealtimeError(permission, next, error) {
  void permission;
  next(error);
}

/** @param {AllowEffects} permission @param {unknown} response @param {unknown} error */
export function sendRealtimeError(permission, response, error) {
  void permission;
  const message = error instanceof Error ? error.message : 'Unknown server error';
  /** @type {{status: (code: number) => {json: (body: unknown) => unknown}}} */ (response)
    .status(500)
    .json({ error: message });
}
