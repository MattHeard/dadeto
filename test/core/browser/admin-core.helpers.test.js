import { jest } from '@jest/globals';
import {
  announceTriggerRenderResult,
  buildSignInCredential,
  createAdminEndpointsPromise,
  createGetAdminEndpoints,
  handleCredentialSignIn,
  mapConfigToAdminEndpoints,
  isAdminWithDeps,
  resolveAdminEndpoint,
} from '../../../src/core/browser/admin-core.js';

describe('buildSignInCredential', () => {
  it('passes auth and credential through to the wrapped signer', () => {
    const credentialFactory = jest.fn((auth, credential) => ({
      auth,
      credential,
    }));
    const handler = buildSignInCredential(credentialFactory);

    const auth = { uid: 'user-1' };
    const result = handler(auth, 'token-123');

    expect(credentialFactory).toHaveBeenCalledWith(auth, 'token-123');
    expect(result).toEqual({ auth, credential: 'token-123' });
  });
});

describe('resolveAdminEndpoint', () => {
  it('returns an empty string when the key is not present anywhere', () => {
    expect(resolveAdminEndpoint({}, 'missing')).toBe('');
  });

  it('prefers configured endpoints and stringifies configured values', () => {
    expect(resolveAdminEndpoint({ triggerRenderContentsUrl: 42 }, 'triggerRenderContentsUrl')).toBe('42');
    expect(resolveAdminEndpoint({}, 'triggerRenderContentsUrl')).toMatch(/^https:\/\//);
  });
});

describe('admin endpoint configuration', () => {
  it('maps all configured endpoint overrides', () => {
    expect(mapConfigToAdminEndpoints({
      triggerRenderContentsUrl: 'render',
      markVariantDirtyUrl: 'dirty',
      generateStatsUrl: 'stats',
    })).toEqual({
      triggerRenderContentsUrl: 'render',
      markVariantDirtyUrl: 'dirty',
      generateStatsUrl: 'stats',
    });
  });

  it('uses defaults for a missing loader and rejected loader', async () => {
    const withoutLoader = await createAdminEndpointsPromise(null);
    const rejected = await createAdminEndpointsPromise(() => Promise.reject(new Error('load failed')));
    expect(withoutLoader).toEqual(rejected);
    expect(withoutLoader.triggerRenderContentsUrl).toMatch(/^https:\/\//);
  });

  it('memoizes the endpoint promise', async () => {
    const factory = jest.fn(() => Promise.resolve({ value: 'endpoints' }));
    const getEndpoints = createGetAdminEndpoints(factory);
    expect(await getEndpoints()).toEqual({ value: 'endpoints' });
    expect(getEndpoints()).toBe(getEndpoints());
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('isAdminWithDeps', () => {
  it('normalizes URL-safe base64 characters before decoding', () => {
    const storage = { getItem: jest.fn().mockReturnValue('header.a-b_c.sig') };
    const decodeBase64 = jest.fn(value => {
      expect(value).toBe('a+b/c');
      return JSON.stringify({ sub: 'not-admin' });
    });
    expect(isAdminWithDeps(storage, JSON, decodeBase64)).toBe(false);
  });
});

describe('announceTriggerRenderResult', () => {
  it('reports unknown status when the response is unavailable', async () => {
    const showMessage = jest.fn();
    await announceTriggerRenderResult(null, showMessage);

    expect(showMessage).toHaveBeenCalledWith('Render failed: unknown unknown');
  });
});

describe('handleCredentialSignIn', () => {
  it('stores the ID token from the sign-in result user', async () => {
    const getIdToken = jest.fn().mockResolvedValue('result-token');
    const signInWithCredential = jest.fn().mockResolvedValue({
      user: { getIdToken },
    });
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: null };
    await handleCredentialSignIn(
      { credential: 'token-123' },
      {
        credentialFactory: token => `cred:${token}`,
        signInWithCredential,
        auth,
        storage,
      }
    );

    expect(signInWithCredential).toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith('id_token', 'result-token');
  });

  it('falls back to auth.currentUser when the sign-in result omits a user', async () => {
    const getIdToken = jest.fn().mockResolvedValue('auth-token');
    const signInWithCredential = jest.fn().mockResolvedValue(undefined);
    const onSignIn = jest.fn();
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: { getIdToken } };

    await handleCredentialSignIn(
      { credential: 'token-123' },
      {
        credentialFactory: token => `cred:${token}`,
        signInWithCredential,
        auth,
        storage,
        onSignIn,
      }
    );

    expect(signInWithCredential).toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith('id_token', 'auth-token');
    expect(onSignIn).toHaveBeenCalledWith('auth-token');
  });

  it('falls back to auth.currentUser when sign-in throws after mutating auth state', async () => {
    const getIdToken = jest.fn().mockResolvedValue('fallback-token');
    const signInWithCredential = jest.fn(async auth => {
      auth.currentUser = { getIdToken };
      throw new Error('sign-in failed');
    });
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: null };

    await handleCredentialSignIn(
      { credential: 'token-123' },
      {
        credentialFactory: token => `cred:${token}`,
        signInWithCredential,
        auth,
        storage,
      }
    );

    expect(signInWithCredential).toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith('id_token', 'fallback-token');
  });

  it('rethrows when sign-in fails and auth.currentUser is unavailable', async () => {
    const signInWithCredential = jest.fn().mockRejectedValue(new Error('boom'));
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: null };

    await expect(
      handleCredentialSignIn(
        { credential: 'token-123' },
        {
          credentialFactory: token => `cred:${token}`,
          signInWithCredential,
          auth,
          storage,
        }
      )
    ).rejects.toThrow('boom');

    expect(signInWithCredential).toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
