#!/usr/bin/env node
import { appendFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runGetAuthorUuidV2Smoke } from './smoke-get-author-uuid-v2.js';

const runtimeDepsRequire = createRequire(
  new URL('../src/cloud/runtime-deps/package.json', import.meta.url)
);
const SMOKE_IDENTITY_UID = 'dadeto-get-author-uuid-v2-smoke';
const PRODUCTION_ORIGIN = 'https://www.dendritestories.co.nz';
const CUSTOM_TOKEN_ENDPOINT =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken';

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate that metadata belongs to the exact successful gcp-prod run that
 * triggered this workflow and links back to its source gcp-test run.
 * @param {unknown} value Parsed deployment metadata.
 * @param {{ expectedGcpProdRunId: string, defaultBranch: string }} expected Expected workflow context.
 * @returns {{ endpointUrl: string, origin: string, firebase: { projectId: string, tenantId: string, apiKey: string }, gcpTestRunId: string, gcpProdRunId: string }} Validated deployment metadata.
 */
export function validateDeploymentMetadata(
  value,
  { expectedGcpProdRunId, defaultBranch }
) {
  if (!isRecord(value)) {
    throw new Error('Deployment metadata is not an object.');
  }
  const gcpTest = value.gcpTest;
  const gcpProd = value.gcpProd;
  const firebase = value.firebase;
  if (
    value.schemaVersion !== 1 ||
    !isRecord(gcpTest) ||
    !isRecord(gcpProd) ||
    !isRecord(firebase)
  ) {
    throw new Error('Deployment metadata has an unsupported shape.');
  }
  if (
    typeof expectedGcpProdRunId !== 'string' ||
    !/^[0-9]+$/.test(expectedGcpProdRunId) ||
    gcpProd.runId !== expectedGcpProdRunId
  ) {
    throw new Error('Deployment metadata does not match the triggering gcp-prod run.');
  }
  if (
    typeof defaultBranch !== 'string' ||
    gcpTest.branch !== defaultBranch ||
    typeof gcpTest.runId !== 'string' ||
    !/^[0-9]+$/.test(gcpTest.runId) ||
    typeof gcpTest.headSha !== 'string' ||
    !/^[0-9a-f]{40}$/i.test(gcpTest.headSha) ||
    gcpProd.deployedHeadSha !== gcpTest.headSha
  ) {
    throw new Error('Deployment metadata does not link to a default-branch gcp-test run.');
  }
  if (
    typeof value.endpointUrl !== 'string' ||
    value.origin !== PRODUCTION_ORIGIN ||
    typeof firebase.projectId !== 'string' ||
    firebase.projectId.length === 0 ||
    typeof firebase.tenantId !== 'string' ||
    firebase.tenantId.length === 0 ||
    typeof firebase.apiKey !== 'string' ||
    firebase.apiKey.length === 0
  ) {
    throw new Error('Deployment metadata is missing required production configuration.');
  }

  return {
    endpointUrl: value.endpointUrl,
    origin: value.origin,
    firebase: {
      projectId: firebase.projectId,
      tenantId: firebase.tenantId,
      apiKey: firebase.apiKey,
    },
    gcpTestRunId: gcpTest.runId,
    gcpProdRunId: gcpProd.runId,
  };
}

/**
 * Exchange a short-lived custom token for a Firebase tenant ID token.
 * @param {{ apiKey: string, customToken: string, tenantId: string, fetchFn?: typeof fetch }} options Auth exchange options.
 * @returns {Promise<string>} Ephemeral Firebase ID token.
 */
export async function exchangeCustomTokenForIdToken({
  apiKey,
  customToken,
  tenantId,
  fetchFn = globalThis.fetch,
}) {
  if (
    typeof apiKey !== 'string' ||
    apiKey.length === 0 ||
    typeof customToken !== 'string' ||
    customToken.length === 0 ||
    typeof tenantId !== 'string' ||
    tenantId.length === 0
  ) {
    throw new Error('Firebase custom-token exchange configuration is incomplete.');
  }
  const endpoint = new URL(CUSTOM_TOKEN_ENDPOINT);
  endpoint.searchParams.set('key', apiKey);
  let response;
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: customToken,
        tenantId,
        returnSecureToken: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('Firebase custom-token exchange failed before a response was received.');
  }
  if (!response.ok) {
    throw new Error(
      'Firebase custom-token exchange returned HTTP ' + response.status + '.'
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Firebase custom-token exchange returned invalid JSON.');
  }
  if (!isRecord(payload) || typeof payload.idToken !== 'string' || !payload.idToken) {
    throw new Error('Firebase custom-token exchange did not return an ID token.');
  }
  return payload.idToken;
}

/**
 * Run the existing five-request smoke check with a dedicated tenant identity.
 * @param {{ deployment: ReturnType<typeof validateDeploymentMetadata>, firebaseAuth: { createCustomToken: (uid: string) => Promise<string> }, fetchFn?: typeof fetch, smokeRunner?: typeof runGetAuthorUuidV2Smoke }} options Smoke execution dependencies.
 * @returns {Promise<Awaited<ReturnType<typeof runGetAuthorUuidV2Smoke>>>} Safe smoke result.
 */
export async function runGetAuthorUuidV2ProductionSmoke({
  deployment,
  firebaseAuth,
  fetchFn = globalThis.fetch,
  smokeRunner = runGetAuthorUuidV2Smoke,
}) {
  let customToken;
  try {
    customToken = await firebaseAuth.createCustomToken(SMOKE_IDENTITY_UID);
  } catch {
    throw new Error('Could not mint a custom token for the dedicated smoke identity.');
  }
  if (typeof customToken !== 'string' || customToken.length === 0) {
    throw new Error('Firebase Admin did not return a custom token.');
  }

  const idToken = await exchangeCustomTokenForIdToken({
    apiKey: deployment.firebase.apiKey,
    customToken,
    tenantId: deployment.firebase.tenantId,
    fetchFn,
  });
  return smokeRunner({
    endpointUrl: deployment.endpointUrl,
    origin: deployment.origin,
    token: idToken,
    fetchFn,
  });
}

async function createFirebaseTenantAuth({
  projectId,
  tenantId,
  signerServiceAccount,
}) {
  if (!signerServiceAccount) {
    throw new Error('The dedicated smoke signer service account is not configured.');
  }
  let initializeApp;
  let applicationDefault;
  let getAuth;
  try {
    ({ initializeApp, applicationDefault } =
      runtimeDepsRequire('firebase-admin/app'));
    ({ getAuth } = runtimeDepsRequire('firebase-admin/auth'));
  } catch {
    throw new Error('Firebase Admin runtime dependencies are unavailable.');
  }
  let app;
  try {
    app = initializeApp(
      {
        credential: applicationDefault(),
        projectId,
        serviceAccountId: signerServiceAccount,
      },
      'get-author-uuid-v2-production-smoke'
    );
    return {
      firebaseAuth: getAuth(app).tenantManager().authForTenant(tenantId),
      close: () => app.delete(),
    };
  } catch {
    throw new Error('Could not initialize the dedicated Firebase tenant signer.');
  }
}

/**
 * Execute the CI entry point. It never writes token or UUID values to output.
 * @param {{ argv?: string[], environment?: Record<string, string | undefined>, writeLine?: (message: string) => void, readFileFn?: typeof readFile, appendSummaryFn?: typeof appendFile, authFactory?: typeof createFirebaseTenantAuth, smokeRunner?: typeof runGetAuthorUuidV2ProductionSmoke }} options CLI dependencies.
 * @returns {Promise<number>} Process exit code.
 */
export async function main({
  argv = process.argv.slice(2),
  environment = process.env,
  writeLine = console.log,
  readFileFn = readFile,
  appendSummaryFn = appendFile,
  authFactory = createFirebaseTenantAuth,
  smokeRunner = runGetAuthorUuidV2ProductionSmoke,
} = {}) {
  if (!argv.includes('--execute')) {
    writeLine('No requests sent. This CI runner requires --execute.');
    return 0;
  }
  let admin;
  try {
    const metadataPath = environment.GET_AUTHOR_UUID_SMOKE_DEPLOYMENT_METADATA;
    const expectedGcpProdRunId =
      environment.GET_AUTHOR_UUID_SMOKE_EXPECTED_GCP_PROD_RUN_ID;
    const defaultBranch = environment.GET_AUTHOR_UUID_SMOKE_DEFAULT_BRANCH;
    const signerServiceAccount =
      environment.GET_AUTHOR_UUID_SMOKE_SIGNER_SERVICE_ACCOUNT;
    if (!metadataPath) {
      throw new Error('Deployment metadata path is not configured.');
    }
    const metadataText = await readFileFn(metadataPath, 'utf8');
    let rawMetadata;
    try {
      rawMetadata = JSON.parse(metadataText);
    } catch {
      throw new Error('Deployment metadata is not valid JSON.');
    }
    const deployment = validateDeploymentMetadata(rawMetadata, {
      expectedGcpProdRunId,
      defaultBranch,
    });
    admin = await authFactory({
      projectId: deployment.firebase.projectId,
      tenantId: deployment.firebase.tenantId,
      signerServiceAccount,
    });
    const result = await smokeRunner({
      deployment,
      firebaseAuth: admin.firebaseAuth,
    });
    const output = {
      ...result,
      gcpTestRunId: deployment.gcpTestRunId,
      gcpProdRunId: deployment.gcpProdRunId,
    };
    const line =
      'get-author-uuid-v2 production smoke passed: ' + JSON.stringify(output);
    writeLine(line);
    if (environment.GITHUB_STEP_SUMMARY) {
      await appendSummaryFn(
        environment.GITHUB_STEP_SUMMARY,
        [
          '',
          '## get-author-uuid-v2 production smoke',
          '',
          '- Result: passed',
          '- gcp-test run: ' + deployment.gcpTestRunId,
          '- gcp-prod run: ' + deployment.gcpProdRunId,
          '- Authenticated GET may create one authors/{uid} record for the dedicated smoke identity.',
          '- The Firebase test identity is retained in the production tenant for reuse.',
          '',
        ].join('\n'),
        'utf8'
      );
    }
    return 0;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown smoke failure.';
    writeLine('get-author-uuid-v2 production smoke failed: ' + message);
    return 1;
  } finally {
    try {
      await admin?.close();
    } catch {
      // Cleanup errors are intentionally silent; they cannot change test evidence.
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().then(code => {
    process.exitCode = code;
  });
}
