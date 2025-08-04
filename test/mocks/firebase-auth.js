export const getAuth = () => ({
  signOut: async () => {},
  currentUser: { getIdToken: async () => '' },
});
export const GoogleAuthProvider = { credential: () => ({}) };
export const signInWithCredential = async () => {};
