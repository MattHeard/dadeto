/**
 * Build a Firestore-triggered Cloud Function from injected runtime dependencies.
 * @param {{
 *   functions: { region: (region: string) => { firestore: { document: (path: string) => Record<string, Function> } } },
 *   getFirestoreInstance: () => unknown,
 *   createHandler: (deps: { db: unknown }) => Function,
 *   documentPath: string,
 *   eventName?: string,
 *   region?: string,
 * }} options Runtime dependencies and trigger configuration.
 * @returns {unknown} Registered Cloud Function handle.
 */
export function createFirestoreHandle({
  functions,
  getFirestoreInstance,
  createHandler,
  documentPath,
  eventName = 'onCreate',
  region = 'europe-west1',
}) {
  const db = getFirestoreInstance();
  const handleEvent = createHandler({ db });

  return functions
    .region(region)
    .firestore.document(documentPath)
    [eventName](handleEvent);
}
