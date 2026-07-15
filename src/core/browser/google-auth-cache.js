const AUTHOR_UUID_STORAGE_KEY = 'author_uuid';

/**
 * @typedef {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }} StorageLike
 */
/**
 * Read the cached author uuid from storage.
 * @param {StorageLike} storage Cached storage.
 * @returns {string | null} Cached uuid or null.
 */
export function getCachedAuthorUuid(storage = sessionStorage) {
  return storage.getItem(AUTHOR_UUID_STORAGE_KEY);
}

/**
 * Persist the author uuid in storage.
 * @param {StorageLike} storage Cached storage.
 * @param {string | null} authorUuid Author uuid to cache.
 * @returns {void}
 */
export function setCachedAuthorUuid(storage, authorUuid) {
  const resolvedStorage = storage || sessionStorage;
  if (authorUuid) {
    resolvedStorage.setItem(AUTHOR_UUID_STORAGE_KEY, authorUuid);
    return;
  }
  resolvedStorage.removeItem(AUTHOR_UUID_STORAGE_KEY);
}

/**
 * Fetch the author uuid from the remote API.
 * @param {(input: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean, json: () => Promise<Record<string, unknown>> }>} fetchFn Fetch helper.
 * @param {string} url API url.
 * @param {string} token Bearer token.
 * @returns {Promise<string | null>} Author uuid or null.
 */
export async function fetchAuthorUuidFromApi(fetchFn, url, token) {
  if (!url) {
    return null;
  }

  return fetchFn(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(response => {
      if (!response.ok) {
        return null;
      }

      return response.json().then(payload => {
        if (payload && typeof payload.uuid === 'string' && payload.uuid) {
          return payload.uuid;
        }
        return null;
      });
    })
    .catch(() => null);
}

/**
 * Refresh and cache the author uuid for an already authenticated session.
 * @param {object} deps Refresh dependencies.
 * @param {StorageLike} [deps.storage] Storage containing the ID token.
 * @param {typeof fetch} deps.fetchFn Fetch helper.
 * @param {() => Promise<string>} deps.getAuthorUuidUrl Configured endpoint resolver.
 * @returns {Promise<string | null>} Cached or refreshed uuid.
 */
export async function refreshCachedAuthorUuid(deps) {
  const { storage = sessionStorage, fetchFn, getAuthorUuidUrl } = deps;
  const token = storage.getItem('id_token');
  if (!token || getCachedAuthorUuid(storage)) {
    return getCachedAuthorUuid(storage);
  }
  const uuid = await getAuthorUuidUrl().then(url =>
    fetchAuthorUuidFromApi(fetchFn, url, token)
  );
  setCachedAuthorUuid(storage, uuid);
  return uuid;
}

/**
 * Attach author-uuid caching behavior to an auth module.
 * @param {{ initGoogleSignIn: (options?: { onSignIn?: (token: string) => void | Promise<void> }) => void | Promise<void>, signOut: () => Promise<void> }} handle Auth module.
 * @param {{ storage?: StorageLike, fetchFn: typeof fetch, getAuthorUuidUrl: () => Promise<string>, isInternalOrigin: () => boolean }} deps Caching dependencies.
 * @returns {object} Wrapped auth module.
 */
export function installAuthorUuidCaching(handle, deps) {
  const {
    storage = sessionStorage,
    fetchFn,
    getAuthorUuidUrl,
    isInternalOrigin,
  } = deps;
  const originalSignOut = handle.signOut;
  handle.signOut = async () => {
    await originalSignOut();
    setCachedAuthorUuid(storage, null);
  };

  const originalInitGoogleSignIn = handle.initGoogleSignIn;
  handle.initGoogleSignIn = options => {
    if (isInternalOrigin()) {
      return undefined;
    }

    originalInitGoogleSignIn({
      ...options,
      onSignIn(token) {
        const onSignIn = options?.onSignIn;
        return getAuthorUuidUrl()
          .then(url => fetchAuthorUuidFromApi(fetchFn, url, token))
          .then(authorUuid => {
            setCachedAuthorUuid(storage, authorUuid);
            if (typeof onSignIn === 'function') {
              return onSignIn(token);
            }
            return undefined;
          });
      },
    });
    return undefined;
  };

  return handle;
}
