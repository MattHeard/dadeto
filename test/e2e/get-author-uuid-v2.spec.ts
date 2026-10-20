import { expect, test } from '@playwright/test';

import {
  createFirebaseTenantIdToken,
  GET_AUTHOR_UUID_V2_TEST_UID,
} from './get-author-uuid-v2-auth.js';

test.use({ screenshot: 'off', trace: 'off', video: 'off' });

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required Playwright environment value ${name} is missing.`);
  }
  return value;
}

test('get-author-uuid-v2 passes browser CORS and tenant authentication checks', async ({
  page,
}) => {
  const endpointUrl = requiredEnvironmentValue('GET_AUTHOR_UUID_V2_URL');
  const tenantId = requiredEnvironmentValue('GET_AUTHOR_UUID_V2_TENANT_ID');
  const signerServiceAccount = requiredEnvironmentValue(
    'GET_AUTHOR_UUID_V2_TEST_SIGNER_SERVICE_ACCOUNT'
  );
  const projectId = requiredEnvironmentValue('FIREBASE_PROJECT_ID');
  const apiKey = requiredEnvironmentValue('FIREBASE_API_KEY');
  const baseUrl = requiredEnvironmentValue('PLAYWRIGHT_BASE_URL');
  const idToken = await createFirebaseTenantIdToken({
    apiKey,
    projectId,
    tenantId,
    signerServiceAccount,
    uid: GET_AUTHOR_UUID_V2_TEST_UID,
  });

  // The first successful GET may create authors/{uid}; this URL belongs to the
  // current run's temporary t-* Firestore database.
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(
    async ({ functionUrl, token }) => {
      try {
        // The Authorization header forces the browser-managed CORS preflight.
        const first = await fetch(functionUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': 'gcp-test-author-uuid-v2',
          },
        });
        const firstBody = first.ok ? await first.json() : null;
        const repeated = await fetch(functionUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            Authorization: `Bearer ${token}`,
            'Idempotency-Key': 'gcp-test-author-uuid-v2',
          },
        });
        const repeatedBody = repeated.ok ? await repeated.json() : null;
        const missing = await fetch(functionUrl, { method: 'GET', mode: 'cors' });
        const invalid = await fetch(functionUrl, {
          method: 'GET',
          mode: 'cors',
          headers: { Authorization: 'Bearer invalid-test-token' },
        });

        return {
          authenticatedStatus: first.status,
          repeatedStatus: repeated.status,
          missingTokenStatus: missing.status,
          invalidTokenStatus: invalid.status,
          uuidStable:
            typeof firstBody?.uuid === 'string' &&
            firstBody.uuid.length > 0 &&
            firstBody.uuid === repeatedBody?.uuid,
        };
      } catch (error) {
        return {
          browserRequestError:
            error instanceof Error ? error.name : 'UnknownBrowserRequestError',
        };
      }
    },
    { functionUrl: endpointUrl, token: idToken }
  );

  expect(result).not.toHaveProperty('browserRequestError');
  expect(result).toEqual({
    authenticatedStatus: 200,
    repeatedStatus: 200,
    missingTokenStatus: 401,
    invalidTokenStatus: 401,
    uuidStable: true,
  });
});
