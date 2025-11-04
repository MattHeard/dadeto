import {
  isDuplicateAppError,
  getUrlMapFromEnv,
  getProjectFromEnv,
  getCdnHostFromEnv,
  initializeFirebaseApp,
} from '../../../../src/core/cloud/generate-stats/generate-stats-core.js';

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

  it('should return false if error has no code or message', () => {
    expect(isDuplicateAppError({})).toBe(false);
  });

  it('should return true if error message contains "already exists" but code is not app/duplicate-app', () => {
    const error = { message: 'Another error: app already exists.' };
    expect(isDuplicateAppError(error)).toBe(true);
  });
});

describe('getUrlMapFromEnv', () => {
  it('should return DEFAULT_URL_MAP if env is falsy', () => {
    expect(getUrlMapFromEnv(null)).toBe('prod-dendrite-url-map');
    expect(getUrlMapFromEnv(undefined)).toBe('prod-dendrite-url-map');
  });

  it('should return DEFAULT_URL_MAP if env.URL_MAP is falsy', () => {
    expect(getUrlMapFromEnv({})).toBe('prod-dendrite-url-map');
    expect(getUrlMapFromEnv({ URL_MAP: null })).toBe('prod-dendrite-url-map');
    expect(getUrlMapFromEnv({ URL_MAP: '' })).toBe('prod-dendrite-url-map');
  });
});

describe('getProjectFromEnv', () => {
  it('should return the project ID from env.GOOGLE_CLOUD_PROJECT if present', () => {
    expect(getProjectFromEnv({ GOOGLE_CLOUD_PROJECT: 'test-project-id' })).toBe(
      'test-project-id'
    );
  });

  it('should return the project ID from env.GCLOUD_PROJECT if present and GOOGLE_CLOUD_PROJECT is not', () => {
    expect(
      getProjectFromEnv({ GCLOUD_PROJECT: 'another-test-project-id' })
    ).toBe('another-test-project-id');
  });

  it('should return undefined if neither GOOGLE_CLOUD_PROJECT nor GCLOUD_PROJECT are present', () => {
    expect(getProjectFromEnv({})).toBeUndefined();
    expect(getProjectFromEnv(null)).toBeUndefined();
    expect(getProjectFromEnv(undefined)).toBeUndefined();
  });
});

describe('getCdnHostFromEnv', () => {
  it('should return DEFAULT_CDN_HOST if env is falsy', () => {
    expect(getCdnHostFromEnv(null)).toBe('www.dendritestories.co.nz');
    expect(getCdnHostFromEnv(undefined)).toBe('www.dendritestories.co.nz');
  });

  it('should return DEFAULT_CDN_HOST if env.CDN_HOST is falsy', () => {
    expect(getCdnHostFromEnv({})).toBe('www.dendritestories.co.nz');
    expect(getCdnHostFromEnv({ CDN_HOST: null })).toBe(
      'www.dendritestories.co.nz'
    );
    expect(getCdnHostFromEnv({ CDN_HOST: '' })).toBe(
      'www.dendritestories.co.nz'
    );
    expect(getCdnHostFromEnv({ CDN_HOST: '   ' })).toBe(
      'www.dendritestories.co.nz'
    );
  });

  it('should return the CDN host from env.CDN_HOST if present', () => {
    expect(getCdnHostFromEnv({ CDN_HOST: 'test-cdn-host' })).toBe(
      'test-cdn-host'
    );
  });
});

describe('initializeFirebaseApp', () => {
  it('should call initFn', () => {
    let callCount = 0;
    const initFn = () => {
      callCount++;
    };
    initializeFirebaseApp(initFn);
    expect(callCount).toBe(1);
  });

  it('should re-throw error if it is not a duplicate app error', () => {
    const error = new Error('Some other error');
    const initFn = () => {
      throw error;
    };
    expect(() => initializeFirebaseApp(initFn)).toThrow(error);
  });

  it('should not re-throw error if it is a duplicate app error', () => {
    const error = { code: 'app/duplicate-app', message: 'App already exists' };
    const initFn = () => {
      throw error;
    };
    expect(() => initializeFirebaseApp(initFn)).not.toThrow();
  });
});
