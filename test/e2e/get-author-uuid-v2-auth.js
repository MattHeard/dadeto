import { GoogleAuth } from 'google-auth-library';
import { GCP_TEST_AUTHOR_UUID_UID } from '../../src/core/cloud/get-author-uuid-v2/gcp-test-billing-seed-core.js';

const CUSTOM_TOKEN_AUDIENCE =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const CUSTOM_TOKEN_LIFETIME_SECONDS = 300;
const IAM_SCOPE = 'https://www.googleapis.com/auth/iam';
const CUSTOM_TOKEN_ENDPOINT =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken';

export const GET_AUTHOR_UUID_V2_TEST_UID = GCP_TEST_AUTHOR_UUID_UID;

/**
 * Check that a parsed Firebase response is a record.
 * @param {unknown} value Candidate JSON value.
 * @returns {boolean} True when the value is a non-array object.
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Mint an in-memory Firebase ID token for the dedicated temporary tenant user.
 * @param {{ apiKey: string, projectId: string, tenantId: string, signerServiceAccount: string, uid?: string, googleAuthFactory?: (options: object) => { getClient: () => Promise<{ request: (options: object) => Promise<{ data?: { signedBlob?: string } }> }> }, fetchFn?: typeof fetch, nowSecondsFn?: () => number }} options Test-tenant token inputs.
 * @returns {Promise<string>} Short-lived Firebase ID token.
 */
export async function createFirebaseTenantIdToken({
  apiKey,
  projectId,
  tenantId,
  signerServiceAccount,
  uid = GET_AUTHOR_UUID_V2_TEST_UID,
  googleAuthFactory = options => new GoogleAuth(options),
  fetchFn = globalThis.fetch,
  nowSecondsFn = () => Math.floor(Date.now() / 1000),
}) {
  if (!apiKey || !projectId || !tenantId || !signerServiceAccount) {
    throw new Error(
      'Temporary Firebase tenant test configuration is incomplete.'
    );
  }

  let googleAuth;
  try {
    googleAuth = googleAuthFactory({ projectId, scopes: [IAM_SCOPE] });
  } catch {
    throw new Error('Google Auth could not initialize for the test identity.');
  }

  let client;
  try {
    client = await googleAuth.getClient();
  } catch {
    throw new Error(
      'Google Auth could not obtain the temporary test identity.'
    );
  }

  const customToken = await createTenantCustomToken({
    uid,
    tenantId,
    signerServiceAccount,
    nowSeconds: nowSecondsFn(),
    signBlobFn: async payload => {
      let response;
      try {
        response = await client.request({
          url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(signerServiceAccount)}:signBlob`,
          method: 'POST',
          data: { payload: Buffer.from(payload, 'utf8').toString('base64') },
        });
      } catch {
        throw new Error('IAM Credentials could not sign the test identity.');
      }
      return response?.data?.signedBlob;
    },
  });

  return exchangeCustomTokenForIdToken({
    apiKey,
    customToken,
    tenantId,
    fetchFn,
  });
}

/**
 * Create a five-minute Firebase tenant custom token with IAM signBlob.
 * @param {{ uid: string, tenantId: string, signerServiceAccount: string, signBlobFn: (payload: string) => Promise<string>, nowSeconds: number }} options Token signing inputs.
 * @returns {Promise<string>} Signed Firebase custom token.
 */
export async function createTenantCustomToken({
  uid,
  tenantId,
  signerServiceAccount,
  signBlobFn,
  nowSeconds,
}) {
  if (
    typeof uid !== 'string' ||
    uid.length === 0 ||
    uid.length > 128 ||
    typeof tenantId !== 'string' ||
    tenantId.length === 0 ||
    typeof signerServiceAccount !== 'string' ||
    signerServiceAccount.length === 0 ||
    typeof signBlobFn !== 'function' ||
    !Number.isInteger(nowSeconds) ||
    nowSeconds <= 0
  ) {
    throw new Error('Temporary Firebase tenant token signing is incomplete.');
  }

  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' })
  ).toString('base64url');
  const claims = Buffer.from(
    JSON.stringify({
      iss: signerServiceAccount,
      sub: signerServiceAccount,
      aud: CUSTOM_TOKEN_AUDIENCE,
      iat: nowSeconds,
      exp: nowSeconds + CUSTOM_TOKEN_LIFETIME_SECONDS,
      uid,
      ['tenant_id']: tenantId,
    })
  ).toString('base64url');
  const unsignedToken = `${header}.${claims}`;

  let signedBlob;
  try {
    signedBlob = await signBlobFn(unsignedToken);
  } catch {
    throw new Error('Could not sign the temporary Firebase test identity.');
  }
  if (
    typeof signedBlob !== 'string' ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(signedBlob)
  ) {
    throw new Error(
      'IAM Credentials returned an invalid test token signature.'
    );
  }
  const signature = Buffer.from(signedBlob, 'base64');
  if (signature.length === 0) {
    throw new Error(
      'IAM Credentials returned an invalid test token signature.'
    );
  }
  return `${unsignedToken}.${signature.toString('base64url')}`;
}

/**
 * Exchange a tenant custom token for its short-lived Firebase ID token.
 * @param {{ apiKey: string, customToken: string, tenantId: string, fetchFn?: typeof fetch, timeoutSignal?: (milliseconds: number) => AbortSignal }} options Exchange inputs.
 * @returns {Promise<string>} Firebase ID token.
 */
export async function exchangeCustomTokenForIdToken({
  apiKey,
  customToken,
  tenantId,
  fetchFn = globalThis.fetch,
  timeoutSignal = AbortSignal.timeout,
}) {
  if (
    typeof apiKey !== 'string' ||
    apiKey.length === 0 ||
    typeof customToken !== 'string' ||
    customToken.length === 0 ||
    typeof tenantId !== 'string' ||
    tenantId.length === 0
  ) {
    throw new Error('Firebase test-tenant token exchange is incomplete.');
  }
  const endpoint = new URL(CUSTOM_TOKEN_ENDPOINT);
  endpoint.searchParams.set('key', apiKey);
  let response;
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token: customToken,
        tenantId,
        returnSecureToken: true,
      }),
      signal: timeoutSignal(15_000),
    });
  } catch {
    throw new Error('Firebase test-tenant token exchange failed.');
  }
  if (!response.ok) {
    throw new Error(
      `Firebase test-tenant token exchange returned HTTP ${response.status}.`
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      'Firebase test-tenant token exchange returned invalid JSON.'
    );
  }
  if (
    !isRecord(payload) ||
    typeof payload.idToken !== 'string' ||
    !payload.idToken
  ) {
    throw new Error(
      'Firebase test-tenant token exchange returned no ID token.'
    );
  }
  return payload.idToken;
}
