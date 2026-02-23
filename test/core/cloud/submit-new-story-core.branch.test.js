import { submitNewStoryCoreTestUtils } from '../../../src/core/cloud/submit-new-story/submit-new-story-core.js';

describe('submitNewStoryCoreTestUtils', () => {
  test('getAuthFromGetter returns null when getter not provided', () => {
    expect(submitNewStoryCoreTestUtils.getAuthFromGetter()).toBeNull();
  });

  test('collectOptions falls back when body missing', () => {
    expect(submitNewStoryCoreTestUtils.collectOptions(undefined, 10)).toEqual(
      []
    );
  });
});
