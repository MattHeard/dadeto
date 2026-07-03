import { jest } from '@jest/globals';
import {
  announceTriggerRenderResult,
  buildSignInCredential,
  handleCredentialSignIn,
  resolveAdminEndpoint,
} from '../../../src/core/browser/admin-core.js';

describe('buildSignInCredential', () => {
  it('calls the credential factory and returns its value', () => {
    const credentialFactory = jest.fn(token => `cred:${token}`);
    const handler = buildSignInCredential(credentialFactory);

    const result = handler({}, 'token-123');

    expect(credentialFactory).toHaveBeenCalledWith('token-123');
    expect(result).toBe('cred:token-123');
  });
});

describe('resolveAdminEndpoint', () => {
  it('returns an empty string when the key is not present anywhere', () => {
    expect(resolveAdminEndpoint({}, 'missing')).toBe('');
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
});
