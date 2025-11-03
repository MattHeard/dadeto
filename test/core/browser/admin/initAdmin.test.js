import {
  initAdmin,
} from '../../../../src/core/browser/admin/core.js';

describe('initAdmin', () => {
  it('should throw TypeError if googleAuthModule does not provide initGoogleSignIn function', () => {
    const mockGoogleAuthModule = {
      getIdToken: () => 'some-token',
      signOut: () => {},
    };
    const mockLoadStaticConfigFn = () => Promise.resolve({});
    const mockGetAuthFn = () => ({});
    const mockOnAuthStateChangedFn = () => {};
    const mockDoc = { getElementById: () => null, querySelectorAll: () => [] };
    const mockFetchFn = () => Promise.resolve({});

    expect(() =>
      initAdmin(
        mockGoogleAuthModule,
        mockLoadStaticConfigFn,
        mockGetAuthFn,
        mockOnAuthStateChangedFn,
        mockDoc,
        mockFetchFn
      )
    ).toThrow(
      new TypeError('googleAuthModule must provide an initGoogleSignIn function')
    );
  });
});