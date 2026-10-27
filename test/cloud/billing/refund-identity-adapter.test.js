import { sha256Utf8 } from '../../../src/cloud/billing/refund-identity-adapter.js';

test.each([
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  [
    'user-1\u0000purchase-1\u0000customer-retry-key-123',
    'e3dc6a5a3820ae50d26ead1cf49a189266f66dca89a4193ca83568d38416f1fc',
  ],
  [
    'jörg\u0000purchase-é\u0000retry-🌊',
    'eb0249d73598058aa3e6c567dd5fc3132d52f193f0d4e2ed7168de76a50fcd53',
  ],
])('preserves exact UTF-8 hashing for %s', (identity, expected) => {
  expect(sha256Utf8(identity)).toBe(expected);
});
