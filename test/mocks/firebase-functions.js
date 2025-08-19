export const region = () => ({
  firestore: { document: () => ({ onWrite: () => {}, onCreate: () => {} }) },
  https: { onRequest: () => {} },
});
