import { describe, expect, it, jest } from '@jest/globals';
import {
  fetchAuthorUuidFromApi,
  getCachedAuthorUuid,
  installAuthorUuidCaching,
  setCachedAuthorUuid,
} from '../../../src/core/browser/google-auth-cache.js';

/**
 * @returns {{ store: Record<string, string>, getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }} Storage double.
 */
function createStorage() {
  return {
    store: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.store, key)
        ? this.store[key]
        : null;
    },
    setItem(key, value) {
      this.store[key] = value;
    },
    removeItem(key) {
      delete this.store[key];
    },
  };
}

describe('google-auth-cache', () => {
  it('stores and clears the cached author uuid', () => {
    const storage = createStorage();
    setCachedAuthorUuid(storage, 'author-1');
    expect(getCachedAuthorUuid(storage)).toBe('author-1');
    setCachedAuthorUuid(storage, null);
    expect(getCachedAuthorUuid(storage)).toBeNull();
  });

  it('falls back to sessionStorage when no storage is provided', () => {
    const sessionStorage = createStorage();
    const previousSessionStorage = globalThis.sessionStorage;
    globalThis.sessionStorage = sessionStorage;
    try {
      expect(getCachedAuthorUuid()).toBeNull();
      setCachedAuthorUuid(undefined, 'author-4');
      expect(getCachedAuthorUuid()).toBe('author-4');
      setCachedAuthorUuid(null, null);
      expect(getCachedAuthorUuid()).toBeNull();
    } finally {
      globalThis.sessionStorage = previousSessionStorage;
    }
  });

  it('handles missing urls, bad responses, and valid payloads', async () => {
    const fetchFn = jest.fn();
    await expect(
      fetchAuthorUuidFromApi(fetchFn, '', 'token')
    ).resolves.toBeNull();

    fetchFn.mockResolvedValueOnce({ ok: false, json: jest.fn() });
    await expect(
      fetchAuthorUuidFromApi(fetchFn, '/author', 'token')
    ).resolves.toBeNull();

    fetchFn.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ uuid: 'author-2' }),
    });
    await expect(
      fetchAuthorUuidFromApi(fetchFn, '/author', 'token')
    ).resolves.toBe('author-2');

    fetchFn.mockRejectedValueOnce(new Error('network'));
    await expect(
      fetchAuthorUuidFromApi(fetchFn, '/author', 'token')
    ).resolves.toBeNull();
  });

  it('caches author uuid on sign in and clears it on sign out', async () => {
    const storage = createStorage();
    const onSignIn = jest.fn();
    const originalSignOut = jest.fn().mockResolvedValue(undefined);
    let onSignInHandler;
    const handle = installAuthorUuidCaching(
      {
        initGoogleSignIn: options => {
          onSignInHandler = options.onSignIn;
        },
        signOut: originalSignOut,
      },
      {
        storage,
        fetchFn: jest.fn().mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({ uuid: 'author-3' }),
        }),
        getAuthorUuidUrl: jest.fn().mockResolvedValue('/author'),
        isInternalOrigin: () => false,
      }
    );

    await handle.initGoogleSignIn({ onSignIn });
    await onSignInHandler('token-1');
    expect(getCachedAuthorUuid(storage)).toBe('author-3');
    expect(onSignIn).toHaveBeenCalledWith('token-1');

    await handle.signOut();
    expect(getCachedAuthorUuid(storage)).toBeNull();
    expect(originalSignOut).toHaveBeenCalled();

    const bareHandle = installAuthorUuidCaching(
      {
        initGoogleSignIn: options => {
          onSignInHandler = options.onSignIn;
        },
        signOut: jest.fn().mockResolvedValue(undefined),
      },
      {
        storage: createStorage(),
        fetchFn: jest.fn().mockResolvedValue({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        }),
        getAuthorUuidUrl: jest.fn().mockResolvedValue('/author'),
        isInternalOrigin: () => false,
      }
    );

    await bareHandle.initGoogleSignIn({});
    await onSignInHandler('token-2');
  });

  it('does not install the google sign-in wrapper on internal origins', () => {
    const initGoogleSignIn = jest.fn();
    const handle = installAuthorUuidCaching(
      {
        initGoogleSignIn,
        signOut: jest.fn().mockResolvedValue(undefined),
      },
      {
        fetchFn: jest.fn(),
        getAuthorUuidUrl: jest.fn(),
        storage: createStorage(),
        isInternalOrigin: () => true,
      }
    );

    handle.initGoogleSignIn();

    expect(initGoogleSignIn).not.toHaveBeenCalled();
  });
});
