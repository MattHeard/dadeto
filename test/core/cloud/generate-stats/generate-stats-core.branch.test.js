import { isDuplicateAppError } from '../../../../src/core/cloud/generate-stats/generate-stats-core.js';

describe('isDuplicateAppError', () => {
  it('should return false if error is falsy', () => {
    expect(isDuplicateAppError(null)).toBe(false);
    expect(isDuplicateAppError(undefined)).toBe(false);
  });

  it('should return true if error code is app/duplicate-app', () => {
    const error = {
      code: 'app/duplicate-app',
      message:
        "Firebase: Firebase App named '[DEFAULT]' already exists (app/duplicate-app).",
    };
    expect(isDuplicateAppError(error)).toBe(true);
  });

  it('should return false if error message is string but not duplicate app error', () => {
    const error = { message: 'Some other error message.' };
    expect(isDuplicateAppError(error)).toBe(false);
  });
});
