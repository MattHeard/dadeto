/** Firebase UID used only by the disposable get-author-uuid-v2 E2E test. */
export const GCP_TEST_AUTHOR_UUID_UID = 'dadeto-gcp-test-get-author-uuid-v2';

const API_KEY_UUID = '00000000-0000-4000-8000-000000000001';
const SEED_SOURCE = 'gcp-test-get-author-uuid-v2';
const OPERATION_TYPE = 'get-author-uuid-v2';
const TEST_CREDIT = 1;
const EFFECTIVE_AT = '2000-01-01T00:00:00.000Z';

/**
 * Build the disposable test tenant billing documents.
 * @param {{ environment: string, databaseId: string, workflowRunId: string, createdAt?: Date }} input Test environment identity.
 * @returns {{documents: Array<{path: string, data: Record<string, unknown>}>}} Documents to create atomically.
 */
export function createGcpTestAuthorUuidBillingSeed({
  environment,
  databaseId,
  workflowRunId,
  createdAt = new Date(),
}) {
  if (!/^t-[0-9a-f]{8}$/.test(environment) || databaseId !== environment)
    throw new Error(
      'Billing seed requires its matching temporary t-* database.'
    );
  if (typeof workflowRunId !== 'string' || !workflowRunId.trim())
    throw new Error('Billing seed requires a workflow run identifier.');
  if (!(createdAt instanceof Date) || !Number.isFinite(createdAt.getTime()))
    throw new Error('Billing seed requires a valid creation time.');

  const pricingSnapshotId = `${SEED_SOURCE}-${environment}`;
  const purchaseId = `test-credit-${environment}`;
  const provenance = {
    seedSource: SEED_SOURCE,
    environment,
    testUid: GCP_TEST_AUTHOR_UUID_UID,
    workflowRunId,
  };
  return {
    documents: [
      {
        path: `api-key-ownership/${GCP_TEST_AUTHOR_UUID_UID}`,
        data: { apiKeyUuid: API_KEY_UUID, ...provenance },
      },
      {
        path: `api-key-credit/${API_KEY_UUID}`,
        data: { credit: TEST_CREDIT },
      },
      {
        path: `api-key-credit/${API_KEY_UUID}/lots/${purchaseId}`,
        data: {
          purchaseId,
          issuedCredits: TEST_CREDIT,
          remainingCredits: TEST_CREDIT,
          createdAt,
          refundable: false,
          pricingSnapshotId,
          creditSource: 'non-purchased-test-credit',
          ...provenance,
        },
      },
      {
        path: `billing-pricing-snapshots/${pricingSnapshotId}`,
        data: {
          snapshotId: pricingSnapshotId,
          effectiveAt: EFFECTIVE_AT,
          eurPerUsdMicros: 920_000,
          creditEurMicros: 1,
          markupBps: 0,
          operations: {
            [OPERATION_TYPE]: { id: OPERATION_TYPE, costEurMicros: 1 },
          },
        },
      },
    ],
  };
}

/**
 * Create missing test documents once, without resetting consumed test credit.
 * @param {import('../../../../types/allow-effects').AllowEffects} allowEffects Permission to write test data.
 * @param {{ environment: string, databaseId: string, workflowRunId: string, createdAt?: Date }} input Test environment identity.
 * @param {{ runTransaction: (allowEffects: import('../../../../types/allow-effects').AllowEffects, handler: (transaction: unknown) => Promise<unknown>) => Promise<unknown>, getDocument: (allowEffects: import('../../../../types/allow-effects').AllowEffects, transaction: unknown, path: string) => Promise<Record<string, unknown>|null>, createDocument: (allowEffects: import('../../../../types/allow-effects').AllowEffects, transaction: unknown, path: string, data: Record<string, unknown>) => unknown }} store Transactional document adapter.
 * @returns {Promise<{createdDocuments: number, unchangedDocuments: number}>} Seed result counts.
 */
export async function seedGcpTestAuthorUuidBillingCredit(
  allowEffects,
  input,
  store
) {
  const { documents } = createGcpTestAuthorUuidBillingSeed(input);
  return /** @type {Promise<{createdDocuments: number, unchangedDocuments: number}>} */ (
    store.runTransaction(allowEffects, async transaction => {
      const existing = await Promise.all(
        documents.map(document =>
          store.getDocument(allowEffects, transaction, document.path)
        )
      );
      const toCreate = planGcpTestBillingSeedWrites(documents, existing);
      for (const document of toCreate)
        await store.createDocument(
          allowEffects,
          transaction,
          document.path,
          document.data
        );
      return {
        createdDocuments: toCreate.length,
        unchangedDocuments: documents.length - toCreate.length,
      };
    })
  );
}

/**
 * Decide whether the seed is new, complete, or inconsistent.
 * @param {Array<{path: string, data: Record<string, unknown>}>} documents Intended seed documents.
 * @param {Array<Record<string, unknown>|null>} existing Stored documents in matching order.
 * @returns {Array<{path: string, data: Record<string, unknown>}>} Documents safe to create.
 */
function planGcpTestBillingSeedWrites(documents, existing) {
  const existingCount = existing.filter(Boolean).length;
  if (existingCount === 0) return documents;
  if (existingCount !== documents.length)
    throw new Error('Billing seed is incomplete; refusing to mint credit.');

  documents.forEach((document, index) =>
    validateExistingSeedDocument(
      document,
      /** @type {Record<string, unknown>} */ (existing[index])
    )
  );
  return [];
}

/**
 * Ensure a prior seed still has its provenance and has not restored consumed credit.
 * @param {{path: string, data: Record<string, unknown>}} expected Expected document.
 * @param {Record<string, unknown>} actual Stored document.
 * @returns {void} Throws if the existing seed is inconsistent.
 */
function validateExistingSeedDocument(expected, actual) {
  for (const [key, value] of Object.entries(expected.data)) {
    if (key === 'createdAt') {
      if (actual.createdAt === null || actual.createdAt === undefined)
        throw new Error(
          'Existing test credit lot is missing its creation time.'
        );
      continue;
    }
    if (key === 'credit' && expected.path.startsWith('api-key-credit/')) {
      if (actual.credit !== 0 && actual.credit !== TEST_CREDIT)
        throw new Error(
          'Existing test credit balance does not match its seed.'
        );
      continue;
    }
    if (key === 'remainingCredits') {
      if (
        actual.remainingCredits !== 0 &&
        actual.remainingCredits !== TEST_CREDIT
      )
        throw new Error('Existing test credit lot does not match its seed.');
      continue;
    }
    if (!sameSeedValue(actual[key], value))
      throw new Error('Existing test billing data has conflicting provenance.');
  }
}

/**
 * Compare nested seed values without relying on Firestore map key order.
 * @param {unknown} actual Stored value.
 * @param {unknown} expected Expected value.
 * @returns {boolean} Whether the values match.
 */
function sameSeedValue(actual, expected) {
  if (actual === expected) return true;
  if (
    !actual ||
    !expected ||
    typeof actual !== 'object' ||
    typeof expected !== 'object' ||
    Array.isArray(actual) ||
    Array.isArray(expected)
  )
    return false;
  const actualRecord = /** @type {Record<string, unknown>} */ (actual);
  const expectedRecord = /** @type {Record<string, unknown>} */ (expected);
  const keys = Object.keys(expectedRecord);
  return (
    keys.length === Object.keys(actualRecord).length &&
    keys.every(key => sameSeedValue(actualRecord[key], expectedRecord[key]))
  );
}
