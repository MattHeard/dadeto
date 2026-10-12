/**
 * Register the render-variant Firestore trigger.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup permission.
 * @param {{ functions: { region: (name: string) => { firestore: { document: (path: string) => { onWrite: (handler: (change: unknown) => unknown) => unknown } } } }, region: string, documentPath: string, handler: (change: unknown) => unknown }} options Trigger configuration.
 * @returns {unknown} Registered Cloud Function.
 */
export function registerVariantWriteTrigger(allowEffects, options) {
  void allowEffects;
  return options.functions
    .region(options.region)
    .firestore.document(options.documentPath)
    .onWrite(change => options.handler(change));
}
