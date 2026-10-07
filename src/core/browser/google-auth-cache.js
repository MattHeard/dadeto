import { resolveOrNull, whenOrNull } from '../commonCore.js';

const AUTHOR_UUID_STORAGE_KEY = 'author_uuid';

/**
 * @typedef {{ getItem: (key: string) => string | null, setItem: (permission: import('../../../types/allow-effects').AllowEffects, key: string, value: string) => void, removeItem: (permission: import('../../../types/allow-effects').AllowEffects, key: string) => void }} StorageLike
 */
/**
 * Read the cached author uuid from storage.
 * @param {Pick<StorageLike, 'getItem'>} storage Cached storage.
 * @returns {string | null} Cached uuid or null.
 */
export function getCachedAuthorUuid(storage = sessionStorage) {
  return storage.getItem(AUTHOR_UUID_STORAGE_KEY);
}

/**
 * Persist the author uuid in storage.
 * @param {import('../../../types/allow-effects').AllowEffects} permission Explicit cache-write permission.
 * @param {StorageLike} storage Cached storage.
 * @param {string | null} authorUuid Author uuid to cache.
 * @returns {void}
 */
export function setCachedAuthorUuid(permission, storage, authorUuid) {
  const resolvedStorage = storage;
  if (authorUuid) {
    resolvedStorage.setItem(permission, AUTHOR_UUID_STORAGE_KEY, authorUuid);
    return;
  }
  resolvedStorage.removeItem(permission, AUTHOR_UUID_STORAGE_KEY);
}

/**
 * Fetch the author uuid from the remote API.
 * @param {import('../../../types/allow-effects').AllowEffects} permission Permission for the API request.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, input: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean, json: () => Promise<Record<string, unknown>> }>} fetchFn Fetch helper.
 * @param {string} url API url.
 * @param {string} token Bearer token.
 * @returns {Promise<string | null>} Author uuid or null.
 */
export async function fetchAuthorUuidFromApi(permission, fetchFn, url, token) {
  if (!url) {
    return null;
  }

  return resolveOrNull(
    fetchFn(permission, url, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(readAuthorUuidResponse)
  );
}

/**
 * Decode successful responses only, preserving the response method receiver.
 * @param {{ok: boolean, json: () => Promise<Record<string, unknown>>}} response API response.
 * @returns {Promise<string | null> | null} Selected UUID or unsuccessful response.
 */
function readAuthorUuidResponse(response) {
  if (!response.ok) return null;
  return response.json().then(selectAuthorUuid);
}

/**
 * Retain the API's nonempty string selection and lazy property reads.
 * @param {Record<string, unknown>} payload Decoded API payload.
 * @returns {string | null} Author identifier.
 */
function selectAuthorUuid(payload) {
  return whenOrNull(
    Boolean(payload && typeof payload.uuid === 'string' && payload.uuid),
    () => /** @type {string} */ (payload.uuid)
  );
}

/**
 * Refresh and cache the author uuid for an already authenticated session.
 * @param {object} deps Refresh dependencies.
 * @param {StorageLike} deps.storage Storage containing the ID token.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, input: string, init?: object) => Promise<Response>} deps.fetchFn Fetch helper.
 * @param {() => Promise<string>} deps.getAuthorUuidUrl Configured endpoint resolver.
 * @param {import('../../../types/allow-effects').AllowEffectsBoundary} deps.bindEffectBoundary Permission boundary.
 * @returns {Promise<string | null>} Cached or refreshed uuid.
 */
export async function refreshCachedAuthorUuid(deps) {
  const { storage, fetchFn, getAuthorUuidUrl } = deps;
  const token = storage.getItem('id_token');
  if (!token || getCachedAuthorUuid(storage)) {
    return getCachedAuthorUuid(storage);
  }
  const uuid = await getAuthorUuidUrl().then(url =>
    deps.bindEffectBoundary(permission =>
      fetchAuthorUuidFromApi(permission, fetchFn, url, token)
    )
  );
  await deps.bindEffectBoundary(async permission => {
    setCachedAuthorUuid(permission, storage, uuid);
  });
  return uuid;
}

/**
 * Attach author-uuid caching behavior to an auth module.
 * @param {{ initGoogleSignIn: (options?: { onSignIn?: (token: string) => void | Promise<void> }) => void | Promise<void>, signOut: () => Promise<void> }} handle Auth module.
 * @param {{ storage: StorageLike, fetchFn: (permission: import('../../../types/allow-effects').AllowEffects, input: string, init?: object) => Promise<Response>, getAuthorUuidUrl: () => Promise<string>, isInternalOrigin: () => boolean, bindEffectBoundary: import('../../../types/allow-effects').AllowEffectsBoundary }} deps Caching dependencies.
 * @returns {object} Wrapped auth module.
 */
export function installAuthorUuidCaching(handle, deps) {
  const {
    storage,
    fetchFn,
    getAuthorUuidUrl,
    isInternalOrigin,
    bindEffectBoundary,
  } = deps;
  const originalSignOut = handle.signOut;
  handle.signOut = async () => {
    await originalSignOut();
    await bindEffectBoundary(async permission => {
      setCachedAuthorUuid(permission, storage, null);
    });
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
          .then(url =>
            bindEffectBoundary(permission =>
              fetchAuthorUuidFromApi(permission, fetchFn, url, token)
            )
          )
          .then(async authorUuid => {
            await bindEffectBoundary(async permission => {
              setCachedAuthorUuid(permission, storage, authorUuid);
            });
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
