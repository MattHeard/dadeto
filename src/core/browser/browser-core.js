export const createGoogleSignOut = ({
  authSignOut,
  storage,
  disableAutoSelect,
}) => {
  return async () => {
    await authSignOut();
    storage.removeItem('id_token');
    disableAutoSelect();
  };
};
