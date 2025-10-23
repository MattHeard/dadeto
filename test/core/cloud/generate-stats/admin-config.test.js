import { describe, expect, it } from '@jest/globals';
import { ADMIN_UID as coreAdminUid } from '../../../../src/core/admin-config.js';
import { ADMIN_UID as reExportedAdminUid } from '../../../../src/core/cloud/generate-stats/admin-config.js';

describe('generate-stats admin config re-export', () => {
  it('exposes the same admin UID as the core configuration', () => {
    expect(reExportedAdminUid).toBe(coreAdminUid);
  });
});
