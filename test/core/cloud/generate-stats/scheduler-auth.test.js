import { jest } from '@jest/globals';
import { createSchedulerRequestVerifier } from '../../../../src/core/cloud/generate-stats/scheduler-auth.js';

describe('createSchedulerRequestVerifier', () => {
  it('accepts only a verified token for the configured service account and audience', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'generate-stats-job@example.iam.gserviceaccount.com',
        ['email_verified']: true,
      }),
    });
    const verify = createSchedulerRequestVerifier({
      verifyIdToken,
      audience: 'https://example.test/generate-stats',
      serviceAccountEmail: 'generate-stats-job@example.iam.gserviceaccount.com',
    });

    await expect(verify({ get: () => 'Bearer signed-token' })).resolves.toBe(
      true
    );
    expect(verifyIdToken).toHaveBeenCalledWith(
      'signed-token',
      'https://example.test/generate-stats'
    );
  });

  it('rejects missing bearer tokens and unverified identities', async () => {
    const verifyIdToken = jest.fn().mockResolvedValue({
      getPayload: () => ({
        email: 'other@example.iam.gserviceaccount.com',
        ['email_verified']: true,
      }),
    });
    const verify = createSchedulerRequestVerifier({
      verifyIdToken,
      audience: 'https://example.test/generate-stats',
      serviceAccountEmail: 'generate-stats-job@example.iam.gserviceaccount.com',
    });

    await expect(verify({ get: () => undefined })).resolves.toBe(false);
    await expect(verify({ get: () => 'Bearer signed-token' })).resolves.toBe(
      false
    );
    expect(verifyIdToken).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid tokens and missing expected identity configuration', async () => {
    const verifyIdToken = jest
      .fn()
      .mockRejectedValue(new Error('invalid signature'));
    const verify = createSchedulerRequestVerifier({
      verifyIdToken,
      audience: 'https://example.test/generate-stats',
      serviceAccountEmail: 'generate-stats-job@example.iam.gserviceaccount.com',
    });

    await expect(verify({ get: () => 'Bearer invalid-token' })).resolves.toBe(
      false
    );

    const missingConfig = createSchedulerRequestVerifier({
      verifyIdToken,
      audience: undefined,
      serviceAccountEmail: undefined,
    });
    await expect(
      missingConfig({ get: () => 'Bearer signed-token' })
    ).resolves.toBe(false);
    expect(verifyIdToken).toHaveBeenCalledTimes(1);
  });
});
