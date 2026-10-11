/**
 * Build a Firestore-triggered Cloud Function from injected runtime dependencies.
 * @template {(...args: never[]) => unknown} EventHandler Trigger callback.
 * @param {{
 *   functions: { region: (region: string) => { firestore: { document: (path: string) => Record<string, (handler: unknown) => unknown> } } },
 *   getFirestoreInstance: () => import('firebase-admin/firestore').Firestore,
 *   createHandler: (deps: { db: import('firebase-admin/firestore').Firestore }) => EventHandler,
 *   documentPath: string,
 *   eventName?: string,
 *   region?: string,
 * }} options Runtime dependencies and trigger configuration.
 * @returns {unknown} Registered Cloud Function handle.
 */
export function createFirestoreHandle(options) {
  const functions = options.functions;
  const getFirestoreInstance = options.getFirestoreInstance;
  const createHandler = options.createHandler;
  const documentPath = options.documentPath;
  const eventName =
    options.eventName === undefined ? 'onCreate' : options.eventName;
  const region = options.region === undefined ? 'europe-west1' : options.region;

  const db = getFirestoreInstance();
  const handleEvent = createHandler({ db });

  return functions
    .region(region)
    .firestore.document(documentPath)
    [eventName](handleEvent);
}
