import { describe, expect, it, jest } from '@jest/globals';
import {
  createFirebaseTenantIdToken,
  createTenantCustomToken,
  exchangeCustomTokenForIdToken,
  GET_AUTHOR_UUID_V2_TEST_UID,
} from '../e2e/get-author-uuid-v2-auth.js';

describe('get-author-uuid-v2 temporary tenant authentication', () => {
  it('signs a five-minute custom token for the dedicated UID and tenant', async () => {
    const signedBlob = Buffer.from('test-signature').toString('base64');
    const signBlobFn = jest.fn().mockResolvedValue(signedBlob);
    const customToken = await createTenantCustomToken({
      uid: GET_AUTHOR_UUID_V2_TEST_UID,
      tenantId: 'temporary-tenant',
      signerServiceAccount: 'playwright@example.iam.gserviceaccount.com',
      signBlobFn,
      nowSeconds: 1_800_000_000,
    });
    const unsignedToken = customToken.slice(0, customToken.lastIndexOf('.'));
    const claims = JSON.parse(
      Buffer.from(unsignedToken.split('.')[1], 'base64url').toString('utf8')
    );

    expect(claims).toMatchObject({
      uid: GET_AUTHOR_UUID_V2_TEST_UID,
      ['tenant_id']: 'temporary-tenant',
      iat: 1_800_000_000,
      exp: 1_800_000_300,
    });
    expect(signBlobFn).toHaveBeenCalledTimes(1);
  });

  it('exchanges the custom token with the explicit Firebase tenant', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ idToken: 'ephemeral-id-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      exchangeCustomTokenForIdToken({
        apiKey: 'public-test-api-key',
        customToken: 'short-lived-custom-token',
        tenantId: 'temporary-tenant',
        fetchFn,
      })
    ).resolves.toBe('ephemeral-id-token');

    const [url, request] = fetchFn.mock.calls[0];
    expect(new URL(url).searchParams.get('key')).toBe('public-test-api-key');
    expect(JSON.parse(request.body)).toMatchObject({
      token: 'short-lived-custom-token',
      tenantId: 'temporary-tenant',
      returnSecureToken: true,
    });
  });

  it('uses the temporary Playwright identity and returns only the exchanged ID token', async () => {
    const client = {
      request: jest.fn().mockResolvedValue({
        data: { signedBlob: Buffer.from('test-signature').toString('base64') },
      }),
    };
    const googleAuthFactory = jest.fn(() => ({
      getClient: async () => client,
    }));
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ idToken: 'ephemeral-id-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      createFirebaseTenantIdToken({
        apiKey: 'public-test-api-key',
        projectId: 'test-project',
        tenantId: 'temporary-tenant',
        signerServiceAccount: 'playwright@example.iam.gserviceaccount.com',
        googleAuthFactory,
        fetchFn,
        nowSecondsFn: () => 1_800_000_000,
      })
    ).resolves.toBe('ephemeral-id-token');

    expect(googleAuthFactory).toHaveBeenCalledWith({
      projectId: 'test-project',
      scopes: ['https://www.googleapis.com/auth/iam'],
    });
    expect(client.request.mock.calls[0][0].url).toContain(
      'playwright%40example.iam.gserviceaccount.com:signBlob'
    );
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toMatchObject({
      tenantId: 'temporary-tenant',
      returnSecureToken: true,
    });
  });

  it('fails with redacted errors for missing setup or token-exchange failures', async () => {
    const fetchFn = jest.fn();
    await expect(createFirebaseTenantIdToken({})).rejects.toThrow(
      'configuration is incomplete'
    );
    await expect(
      exchangeCustomTokenForIdToken({
        apiKey: 'api-key',
        customToken: 'custom-token',
        tenantId: 'temporary-tenant',
        fetchFn: async () =>
          new Response('sensitive response body', { status: 401 }),
      })
    ).rejects.toThrow('returned HTTP 401');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
