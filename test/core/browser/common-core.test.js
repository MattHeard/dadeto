import { DEFAULT_BUCKET_NAME } from '../../../src/core/browser/common-core.js';

describe('browser/common-core', () => {
  it('should export DEFAULT_BUCKET_NAME', () => {
    expect(DEFAULT_BUCKET_NAME).toBe('www.dendritestories.co.nz');
  });
});
