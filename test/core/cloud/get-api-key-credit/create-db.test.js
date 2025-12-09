import { createDb as bridgeCreateDb } from '../../../../src/core/cloud/get-api-key-credit/create-db.js';
import { createDb as versionedCreateDb } from '../../../../src/core/cloud/get-api-key-credit-v2/create-db.js';

it('re-exports the v2 createDb implementation', () => {
  expect(bridgeCreateDb).toBe(versionedCreateDb);
});
