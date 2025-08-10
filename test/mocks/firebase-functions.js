export const region = () => ({
  firestore: { document: () => ({ onWrite: () => {}, onCreate: () => {} }) },
});
