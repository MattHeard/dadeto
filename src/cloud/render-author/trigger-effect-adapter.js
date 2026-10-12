/**
 * Register the author document trigger with the Cloud Functions runtime.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Startup command permission.
 * @param {{ functions: { region: (region: string) => { firestore: { database?: (name: string) => { document: (path: string) => { onWrite: (handler: (change: unknown) => unknown) => unknown } }, document: (path: string) => { onWrite: (handler: (change: unknown) => unknown) => unknown } } } }, region: string, documentPath: string, database?: string, handler: (change: unknown) => unknown }} options Trigger registration dependencies.
 * @returns {unknown} Registered Cloud Function trigger.
 */
export function registerAuthorWriteTrigger(allowEffects, options) {
  void allowEffects;
  const scopedFunctions = options.functions.region(options.region);
  let firestore = scopedFunctions.firestore;
  if (options.database && scopedFunctions.firestore.database) {
    firestore = scopedFunctions.firestore.database(options.database);
  }
  return firestore
    .document(options.documentPath)
    .onWrite(change => options.handler(change));
}
