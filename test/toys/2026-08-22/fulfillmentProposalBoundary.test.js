import {
  fulfillmentBoundary,
  fulfillmentProposalFailure,
} from '../../../src/core/browser/toys/2026-08-22/fulfillmentResult.js';

test('legacy proposal envelopes retain message-only thrown-value behavior', () => {
  expect(fulfillmentProposalFailure(new Error('failure'))).toBe(
    '{"valid":false,"error":"failure"}'
  );
  expect(fulfillmentProposalFailure('failure')).toBe('{"valid":false}');
  expect(() => fulfillmentProposalFailure(null)).toThrow(TypeError);
  expect(
    fulfillmentBoundary(
      '{}',
      'valid',
      () => {
        throw 'failure';
      },
      fulfillmentProposalFailure
    )
  ).toBe('{"valid":false}');
  expect(
    fulfillmentBoundary('{}', 'valid', () => {
      throw 'failure';
    })
  ).toBe('{"valid":false,"reason":"failure","error":"failure"}');
});
