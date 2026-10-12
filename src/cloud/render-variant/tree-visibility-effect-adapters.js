/**
 * Register the daily tree-visibility regeneration job.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {{ functions: { region: (name: string) => { pubsub: { schedule: (cron: string) => { onRun: (handler: () => Promise<null>) => unknown } } } }, handler: () => Promise<null> }} options Registration dependencies.
 * @returns {unknown} Registered scheduled function.
 */
export function registerTreeVisibilitySchedule(allowEffects, options) {
  void allowEffects;
  return options.functions
    .region('europe-west1')
    .pubsub.schedule('every 24 hours')
    .onRun(options.handler);
}

/**
 * Register the HTTP tree-visibility regeneration endpoint.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {{ functions: { region: (name: string) => { https: { onRequest: (handler: (request: import('express').Request, response: import('express').Response) => Promise<void>) => unknown } } }, handler: (request: import('express').Request, response: import('express').Response) => Promise<void> }} options Registration dependencies.
 * @returns {unknown} Registered HTTP function.
 */
export function registerTreeVisibilityHttp(allowEffects, options) {
  void allowEffects;
  return options.functions.region('europe-west1').https.onRequest(options.handler);
}
