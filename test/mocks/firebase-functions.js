const functions = {
  region: () => ({
    firestore: { document: () => ({ onWrite: () => {}, onCreate: () => {} }) },
    https: { onRequest: () => {} },
  }),
};

export const region = functions.region;
export default functions;
