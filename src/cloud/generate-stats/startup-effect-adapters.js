import { createAllowEffects } from '../allow-effects.js';

/** Bind synchronous startup composition to a fresh cloud permission. */
export function bindStartupEffectBoundary(handler) {
  return handler(createAllowEffects());
}

/** Register middleware at the cloud function boundary. */
export function useMiddleware(permission, app, middleware) {
  void permission;
  app.use(middleware);
}

/** Initialize Firebase Admin at the cloud composition boundary. */
export function initializeFirebaseApp(permission, initializeApp) {
  void permission;
  return initializeApp();
}
