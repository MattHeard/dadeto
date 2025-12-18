import { jest } from '@jest/globals';
import {
  announceTriggerRenderResult,
  buildSignInCredential,
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
