/**
 * Register the render-contents Firestore and HTTP functions.
 * @param {import('../../../types/allow-effects').AllowEffects} allowEffects Permission to register cloud triggers.
 * @param {{region: (region: string) => {firestore: {document: (path: string) => {onCreate: (handler: (...args: never[]) => unknown) => unknown}}, https: {onRequest: (handler: (...args: never[]) => unknown) => unknown}}}} functions Cloud Functions API.
 * @param {(...args: never[]) => unknown} onCreate Firestore handler.
 * @param {(...args: never[]) => unknown} onRequest HTTP handler.
 * @returns {{handle: unknown, handleTrigger: unknown}} Registered function handles.
 */
export function registerRenderContentsTriggers(allowEffects, functions, onCreate, onRequest) {
  void allowEffects;
  void allowEffects;
  const region = functions.region('europe-west1');
  const handle = region
    .firestore.document('stories/{storyId}')
    .onCreate(onCreate);
  const handleTrigger = region.https.onRequest(onRequest);
  return { handle, handleTrigger };
}
