import { expect, test } from '@jest/globals';
import {
  isPlainPrototypeObject,
  parseJsonOrFallback,
} from '../../../src/core/browser/toys/browserToysCore.js';
import { normalizeAssignment as normalizeAsset } from '../../../src/core/browser/toys/2026-08-20/assetSegmentAssignmentPredicate.js';
import { normalizeAssignment as normalizePerson } from '../../../src/core/browser/toys/2026-08-20/personSegmentAssignmentPredicate.js';

test.each([null, { inherited: true }])(
  'retains distinct reference prototype policies for %p',
  prototype => {
    const reference = Object.assign(Object.create(prototype), {
      assetId: ' A1 ',
      personId: ' P1 ',
      segmentId: ' S1 ',
    });
    expect(normalizeAsset(reference)).toBeNull();
    expect(normalizePerson(reference)).toEqual({
      personId: 'P1',
      segmentId: 'S1',
    });
  }
);

test('plain references preserve separate owner keys and discard extra fields', () => {
  const reference = {
    assetId: ' A1 ',
    personId: ' P1 ',
    segmentId: ' S1 ',
    extra: true,
  };
  expect(normalizeAsset(reference)).toEqual({ assetId: 'A1', segmentId: 'S1' });
  expect(normalizePerson(reference)).toEqual({
    personId: 'P1',
    segmentId: 'S1',
  });
});

test('prototype validation does not trust constructors or admit callable records', () => {
  const callable = Object.setPrototypeOf(() => {}, Object.prototype);
  expect(isPlainPrototypeObject(callable)).toBe(false);
  expect(isPlainPrototypeObject({ constructor: null })).toBe(true);
  expect(isPlainPrototypeObject(null)).toBe(false);
  expect(parseJsonOrFallback('{')).toBeNull();
});
