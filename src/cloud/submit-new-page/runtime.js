/**
 * Connect submit-new-page core dependencies to the cloud runtime.
 * @param {object} deps Cloud services and submit-new-page helpers.
 * @returns {ReturnType<import('../../core/cloud/submit-new-page/submit-new-page-core').createHandleSubmit>} Core request handler.
 */
export function createSubmitNewPageRuntime(deps) {
  const { ensureFirebaseApp } = deps.createFirebaseAppManager(
    deps.initializeApp
  );
  ensureFirebaseApp();
  const db = deps.getFirestoreInstance();
  const auth = deps.getAuth();
  return deps.createHandleSubmit({
    verifyIdToken: token => auth.verifyIdToken(token),
    saveSubmission: (
      /** @type {import('../../../types/allow-effects').AllowEffects} */ allowEffects,
      id,
      data
    ) => {
      void allowEffects;
      return db.collection('pageFormSubmissions').doc(id).set(data);
    },
    randomUUID: () => deps.crypto.randomUUID(),
    serverTimestamp: () => deps.FieldValue.serverTimestamp(),
    parseIncomingOption: deps.parseIncomingOption,
    findExistingOption: parsed => deps.findExistingOption(db, parsed),
    findExistingPage: pageNumber => deps.findExistingPage(db, pageNumber),
  });
}
