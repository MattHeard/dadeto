import { describe, expect, it, jest } from '@jest/globals';
import {
  createFirebaseTenantAuth,
  createTenantCustomToken,
  exchangeCustomTokenForIdToken,
  main,
  runGetAuthorUuidV2ProductionSmoke,
  validateDeploymentMetadata,
} from '../../scripts/get-author-uuid-v2-production-smoke.js';

const metadata = {
  schemaVersion: 1,
  gcpTest: {
    runId: '12345',
    headSha: 'a'.repeat(40),
    branch: 'main',
  },
  gcpProd: {
    runId: '67890',
    deployedHeadSha: 'a'.repeat(40),
  },
  endpointUrl: 'https://get-author-uuid-v2-abc.europe-west1.run.app',
  origin: 'https://www.dendritestories.co.nz',
  firebase: {
    projectId: 'dadeto-prod',
    tenantId: 'dadeto-prod-tenant',
    apiKey: 'public-web-api-key',
  },
};

describe('get-author-uuid-v2 production smoke runner', () => {
  it('accepts metadata only when it belongs to the matching linked deployment', () => {
    expect(
      validateDeploymentMetadata(metadata, {
        expectedGcpProdRunId: '67890',
        defaultBranch: 'main',
      })
    ).toMatchObject({
      gcpTestRunId: '12345',
      gcpProdRunId: '67890',
      origin: 'https://www.dendritestories.co.nz',
    });
    expect(() =>
      validateDeploymentMetadata(metadata, {
        expectedGcpProdRunId: '67891',
        defaultBranch: 'main',
      })
    ).toThrow('does not match the triggering gcp-prod run');
  });

  it('rejects metadata from another branch or an unlinked deployed commit', () => {
    expect(() =>
      validateDeploymentMetadata(
        {
          ...metadata,
          gcpTest: { ...metadata.gcpTest, branch: 'codex/untrusted' },
        },
        { expectedGcpProdRunId: '67890', defaultBranch: 'main' }
      )
    ).toThrow('default-branch gcp-test run');
    expect(() =>
      validateDeploymentMetadata(
        {
          ...metadata,
          gcpProd: { ...metadata.gcpProd, deployedHeadSha: 'b'.repeat(40) },
        },
        { expectedGcpProdRunId: '67890', defaultBranch: 'main' }
      )
    ).toThrow('default-branch gcp-test run');
  });

  it('exchanges a custom token for a tenant ID token without logging either token', async () => {
    const customToken = 'private-custom-token';
    const idToken = 'private-id-token';
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ idToken }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      exchangeCustomTokenForIdToken({
        apiKey: 'public-api-key',
        customToken,
        tenantId: 'prod-tenant',
        fetchFn,
      })
    ).resolves.toBe(idToken);

    const request = fetchFn.mock.calls[0][1];
    expect(request.body).toContain(customToken);
    expect(JSON.parse(request.body)).toMatchObject({ tenantId: 'prod-tenant' });
  });

  it('mints a five-minute tenant custom token using the scoped IAM signer', async () => {
    const signature = Buffer.from('signed-token-bytes').toString('base64');
    const client = {
      request: jest.fn().mockResolvedValue({ data: { signedBlob: signature } }),
    };
    const googleAuthFactory = jest.fn(() => ({
      getClient: async () => client,
    }));
    const identity = await createFirebaseTenantAuth({
      projectId: 'dadeto-prod',
      tenantId: 'prod-tenant',
      signerServiceAccount: 'signer@example.iam.gserviceaccount.com',
      googleAuthFactory,
      nowSecondsFn: () => 1_800_000_000,
    });

    const customToken = await identity.firebaseAuth.createCustomToken(
      'dedicated-smoke-uid'
    );
    const request = client.request.mock.calls[0][0];
    const unsignedToken = Buffer.from(request.data.payload, 'base64').toString(
      'utf8'
    );
    const [header, claims] = unsignedToken.split('.');

    expect(googleAuthFactory).toHaveBeenCalledWith({
      projectId: 'dadeto-prod',
      scopes: ['https://www.googleapis.com/auth/iam'],
    });
    expect(request).toMatchObject({
      url: 'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/signer%40example.iam.gserviceaccount.com:signBlob',
      method: 'POST',
    });
    expect(
      JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))
    ).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(
      JSON.parse(Buffer.from(claims, 'base64url').toString('utf8'))
    ).toEqual({
      iss: 'signer@example.iam.gserviceaccount.com',
      sub: 'signer@example.iam.gserviceaccount.com',
      aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
      iat: 1_800_000_000,
      exp: 1_800_000_300,
      uid: 'dedicated-smoke-uid',
      ['tenant_id']: 'prod-tenant',
    });
    expect(customToken).toBe(
      `${unsignedToken}.${Buffer.from(signature, 'base64').toString('base64url')}`
    );
    await identity.close();
  });

  it('rejects incomplete custom-token signing configuration', async () => {
    await expect(
      createTenantCustomToken({
        uid: 'smoke-uid',
        tenantId: 'prod-tenant',
        signerServiceAccount: 'signer@example.iam.gserviceaccount.com',
        signBlobFn: async () => '',
        nowSeconds: 1_800_000_000,
      })
    ).rejects.toThrow('valid token signature');
  });

  it('uses only the dedicated test identity and passes its short-lived token to the existing smoke check', async () => {
    const firebaseAuth = {
      createCustomToken: jest.fn().mockResolvedValue('private-custom-token'),
    };
    const fetchFn = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ idToken: 'private-id-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const smokeRunner = jest.fn().mockResolvedValue({
      endpointHost: 'get-author-uuid-v2-abc.europe-west1.run.app',
      origin: 'https://www.dendritestories.co.nz',
      preflightStatus: 204,
      authenticatedGetStatus: 200,
      repeatGetStatus: 200,
      missingTokenStatus: 401,
      invalidTokenStatus: 401,
      uuidStable: true,
    });

    await expect(
      runGetAuthorUuidV2ProductionSmoke({
        deployment: validateDeploymentMetadata(metadata, {
          expectedGcpProdRunId: '67890',
          defaultBranch: 'main',
        }),
        firebaseAuth,
        fetchFn,
        smokeRunner,
      })
    ).resolves.toMatchObject({ uuidStable: true });

    expect(firebaseAuth.createCustomToken).toHaveBeenCalledWith(
      'dadeto-get-author-uuid-v2-smoke'
    );
    expect(smokeRunner).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'private-id-token', fetchFn })
    );
  });

  it('links safe results to both workflow runs and writes the persistent-record effect to the summary', async () => {
    const output = [];
    const summaries = [];
    const close = jest.fn();
    const smokeRunner = jest.fn().mockResolvedValue({
      preflightStatus: 204,
      authenticatedGetStatus: 200,
      repeatGetStatus: 200,
      missingTokenStatus: 401,
      invalidTokenStatus: 401,
      uuidStable: true,
    });

    await expect(
      main({
        argv: ['--execute'],
        environment: {
          GET_AUTHOR_UUID_SMOKE_DEPLOYMENT_METADATA: 'metadata.json',
          GET_AUTHOR_UUID_SMOKE_EXPECTED_GCP_PROD_RUN_ID: '67890',
          GET_AUTHOR_UUID_SMOKE_DEFAULT_BRANCH: 'main',
          GET_AUTHOR_UUID_SMOKE_SIGNER_SERVICE_ACCOUNT:
            'signer@example.iam.gserviceaccount.com',
          GITHUB_STEP_SUMMARY: 'summary.md',
        },
        readFileFn: async () => JSON.stringify(metadata),
        appendSummaryFn: async (...args) => summaries.push(args),
        authFactory: async () => ({
          firebaseAuth: {
            createCustomToken: async () => 'private-custom-token',
          },
          close,
        }),
        smokeRunner,
        writeLine: line => output.push(line),
      })
    ).resolves.toBe(0);

    expect(close).toHaveBeenCalledTimes(1);
    expect(output.join('\n')).not.toContain('private-custom-token');
    expect(output.join('\n')).not.toContain('private-id-token');
    expect(output.join('\n')).not.toContain('sensitive-author-uuid');
    expect(output.join('\n')).toContain('gcpTestRunId');
    expect(summaries[0][1]).toContain('authors/{uid}');
    expect(summaries[0][1]).toContain('gcp-test run: 12345');
    expect(summaries[0][1]).toContain('gcp-prod run: 67890');
  });
});
