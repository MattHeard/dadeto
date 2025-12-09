import { createVerifyAdmin as cloudCreateVerifyAdmin } from '../../../../src/core/cloud/cloud-core.js';
import { createVerifyAdmin } from '../../../../src/core/cloud/generate-stats/verifyAdmin.js';

it('re-exports createVerifyAdmin from the shared cloud core', () => {
  expect(createVerifyAdmin).toBe(cloudCreateVerifyAdmin);
});
