import { jest } from '@jest/globals';
import {
  createVerifyAdmin,
  GENERATE_STATS_VERIFY_ADMIN_MARKER,
} from '../../../../src/core/cloud/generate-stats/verifyAdmin.js';

describe('generate stats verify-admin facade', () => {
  it('forwards verifier dependencies to the shared implementation', async () => {
    const sendUnauthorized = jest.fn();
    const verifier = createVerifyAdmin({
      verifyToken: jest.fn(),
      isAdminUid: jest.fn(),
      sendUnauthorized,
      sendForbidden: jest.fn(),
      logger: { warn: jest.fn() },
    });

    await expect(verifier({ headers: {} }, {})).resolves.toBe(false);
    expect(sendUnauthorized).toHaveBeenCalled();
    expect(GENERATE_STATS_VERIFY_ADMIN_MARKER).toBe(true);
  });
});
