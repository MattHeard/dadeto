import { jest } from '@jest/globals';
import { ADMIN_UID } from '../../../../src/core/commonCore.js';
import {
  buildGoogleSignInDeps,
  createCredentialFactory,
  createDisableAutoSelect,
  createGoogleAccountsId,
  createMatchMedia,
  createQuerySelectorAll,
  createRemoveItem,
  createSessionStorageHandler,
  createInitGoogleSignInHandlerFactory,
  createSignOutHandlerFactory,
  initAdminApp,
  isAdminWithDeps,
} from '../../../../src/core/browser/admin-core.js';

describe('admin-core additional coverage', () => {
  it('handles disable auto select regardless of helper availability', () => {
    const noopScope = {};
    const disableAutoSelect = createDisableAutoSelect(noopScope);
    expect(() => disableAutoSelect()).not.toThrow();

    const disableFn = jest.fn();
    const scopeWithHelper = {
      google: { accounts: { id: { disableAutoSelect: disableFn } } },
    };
    const runDisable = createDisableAutoSelect(scopeWithHelper);
    runDisable();

    expect(disableFn).toHaveBeenCalledTimes(1);
  });

  it('memoizes the sign out handler created from the auth factory', async () => {
    const signOut = jest.fn().mockResolvedValue();
    const getAuth = jest.fn().mockReturnValue({ signOut });
    const storage = { removeItem: jest.fn() };
    const globalScope = { sessionStorage: storage };

    const getSignOutHandler = createSignOutHandlerFactory(getAuth, globalScope);

    const handler = getSignOutHandler();
    await handler();
    const second = getSignOutHandler();
    await second();

    expect(handler).toBe(second);
    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(2);
    expect(storage.removeItem).toHaveBeenCalledWith('id_token');
  });

  it('throws when the sign out factory cannot resolve auth yet', () => {
    const getAuth = jest.fn().mockReturnValue(null);
    const storage = { removeItem: jest.fn() };
    const globalScope = { sessionStorage: storage };

    const getSignOutHandler = createSignOutHandlerFactory(getAuth, globalScope);
    expect(() => getSignOutHandler()).toThrow(
      new Error('Firebase auth client is not ready')
    );
  });

  it('throws when the google sign-in handler factory lacks auth', () => {
    const initFactory = createInitGoogleSignInHandlerFactory({
      getAuthFn: () => null,
      sessionStorageObj: { setItem: jest.fn() },
      consoleObj: { error: jest.fn() },
      globalThisObj: {},
      googleAuthProviderFn: { credential: jest.fn() },
      signInWithCredentialFn: jest.fn(),
    });

    expect(() => initFactory()).toThrow(
      new Error('Firebase auth client is not ready')
    );
  });

  describe('isAdminWithDeps', () => {
    it('returns false when no token is present', () => {
      const storage = { getItem: jest.fn().mockReturnValue(null) };
      const decodeBase64 = str => Buffer.from(str, 'base64').toString('utf8');

      expect(isAdminWithDeps(storage, JSON, decodeBase64)).toBe(false);
    });

    it('recognizes the admin token payload', () => {
      const payload = Buffer.from(
        JSON.stringify({ sub: ADMIN_UID }),
        'utf8'
      ).toString('base64url');
      const token = `header.${payload}.sig`;
      const storage = { getItem: jest.fn().mockReturnValue(token) };
      const decodeBase64 = str => Buffer.from(str, 'base64').toString('utf8');

      expect(isAdminWithDeps(storage, JSON, decodeBase64)).toBe(true);
    });

    it('returns false when payload parsing throws', () => {
      const storage = { getItem: jest.fn().mockReturnValue('bad.token') };
      const decodeBase64 = () => {
        throw new Error('decode failure');
      };

      expect(isAdminWithDeps(storage, JSON, decodeBase64)).toBe(false);
    });
  });

  describe('storage helpers', () => {
    it('throws descriptive errors when storage is unavailable', () => {
      const missingStorage = createRemoveItem(() => null);
      expect(() => missingStorage('id_token')).toThrow(
        new Error('sessionStorage is not available')
      );

      const defaultHandler = createSessionStorageHandler();
      expect(() => defaultHandler.removeItem('id_token')).toThrow(
        new Error('sessionStorage is not available')
      );

      const badStorage = createRemoveItem(() => ({}));
      expect(() => badStorage('id_token')).toThrow(
        new Error('sessionStorage.removeItem is not a function')
      );
    });

    it('removes items through the provided storage handler', () => {
      const storage = { removeItem: jest.fn() };
      const removeItem = createRemoveItem(() => storage);
      removeItem('id_token');
      expect(storage.removeItem).toHaveBeenCalledWith('id_token');
    });

    it('wraps sessionStorage from the provided scope', () => {
      const scope = { sessionStorage: { removeItem: jest.fn() } };
      const handler = createSessionStorageHandler(scope);
      handler.removeItem('id_token');
      expect(scope.sessionStorage.removeItem).toHaveBeenCalledWith('id_token');
    });
  });

  describe('DOM wrappers', () => {
    it('validates matchMedia availability', () => {
      expect(() => createMatchMedia()('(prefers-color-scheme: dark)')).toThrow(
        new Error('window is not available')
      );

      const missingWindow = createMatchMedia({});
      expect(() => missingWindow('(prefers-reduced-motion: reduce)')).toThrow(
        new Error('window is not available')
      );

      const missingMatchMedia = createMatchMedia({ window: {} });
      expect(() => missingMatchMedia('(prefers-color-scheme: dark)')).toThrow(
        new Error('window.matchMedia is not a function')
      );

      const matchMediaMock = jest.fn().mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
      });
      const matchMedia = createMatchMedia({
        window: { matchMedia: matchMediaMock },
      });
      const result = matchMedia('(prefers-color-scheme: dark)');

      expect(matchMediaMock).toHaveBeenCalledWith(
        '(prefers-color-scheme: dark)'
      );
      expect(result.matches).toBe(true);
    });

    it('validates querySelectorAll availability', () => {
      const missingDocument = createQuerySelectorAll({});
      expect(() => missingDocument('div')).toThrow(
        new Error('document is not available')
      );

      expect(() => createQuerySelectorAll()('.signin')).toThrow(
        new Error('document is not available')
      );

      const missingSelectorAll = createQuerySelectorAll({ document: {} });
      expect(() => missingSelectorAll('.signin')).toThrow(
        new Error('document.querySelectorAll is not a function')
      );

      const querySelectorAllMock = jest.fn().mockReturnValue(['node']);
      const runQuery = createQuerySelectorAll({
        document: { querySelectorAll: querySelectorAllMock },
      });
      expect(runQuery('.signin')).toEqual(['node']);
    });
  });

  describe('Google helpers', () => {
    it('returns google accounts id getter from the provided scope', () => {
      const scope = {
        window: { google: { accounts: { id: { ready: true } } } },
      };
      const getter = createGoogleAccountsId(scope);
      expect(getter()).toEqual({ ready: true });

      const noGoogleGetter = createGoogleAccountsId();
      expect(noGoogleGetter()).toBeUndefined();
    });

    it('defaults to the global scope when scope is omitted', () => {
      const getter = createGoogleAccountsId(undefined);
      expect(() => getter()).not.toThrow();
    });

    it('builds Google sign-in dependencies with provided collaborators', () => {
      const globalScope = {
        window: {
          google: {
            accounts: {
              id: { initialize: jest.fn(), renderButton: jest.fn() },
            },
          },
          matchMedia: jest
            .fn()
            .mockReturnValue({ matches: false, addEventListener: jest.fn() }),
        },
        document: { querySelectorAll: jest.fn().mockReturnValue([]) },
      };
      const auth = { currentUser: { getIdToken: jest.fn() } };
      const storage = { setItem: jest.fn() };
      const logger = { error: jest.fn() };
      const authProvider = { credential: jest.fn() };
      const signInWithCredential = jest.fn();

      const deps = buildGoogleSignInDeps({
        auth,
        storage,
        logger,
        globalObject: globalScope,
        authProvider,
        signInWithCredential: signInWithCredential,
      });

      expect(deps.googleAccountsId()).toBe(
        globalScope.window.google.accounts.id
      );
      expect(deps.matchMedia('(prefers-color-scheme: dark)').matches).toBe(
        false
      );
      expect(deps.querySelectorAll('.signin')).toEqual([]);
    });

    it('throws when using default globals without window support', () => {
      const auth = {};
      const storage = { setItem: jest.fn() };
      const logger = { error: jest.fn() };
      const authProvider = { credential: jest.fn() };

      const originalWindow = globalThis.window;
      // Ensure the default global scope does not provide window support.

      delete globalThis.window;

      const deps = buildGoogleSignInDeps({
        auth,
        storage,
        logger,
        globalObject: undefined,
        authProvider,
        signInWithCredential: jest.fn(),
      });
      expect(() => deps.matchMedia('(prefers-color-scheme: dark)')).toThrow(
        new Error('window is not available')
      );

      if (originalWindow !== undefined) {
        globalThis.window = originalWindow;
      } else {
        delete globalThis.window;
      }
    });

    it('enforces credential factory requirements', () => {
      expect(() => createCredentialFactory(null)).toThrow(
        new TypeError('GoogleAuthProvider must be provided')
      );

      expect(() => createCredentialFactory({})).toThrow(
        new TypeError('GoogleAuthProvider must expose credential')
      );

      const factory = jest.fn(token => `cred:${token}`);
      const buildCredential = createCredentialFactory({ credential: factory });
      expect(buildCredential('abc')).toBe('cred:abc');
      expect(factory).toHaveBeenCalledWith('abc');
    });
  });

  it('initializes the admin app with lazy handlers', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const initializeApp = jest.fn();
    const loadStaticConfig = jest.fn().mockResolvedValue({});
    let googleAuthModule;
    const auth = {
      signOut: jest.fn().mockResolvedValue(),
      currentUser: {
        uid: ADMIN_UID,
        getIdToken: jest.fn().mockResolvedValue('token'),
      },
    };
    const getAuth = jest.fn().mockReturnValue(auth);
    const onAuthStateChanged = jest.fn((authInstance, callback) => callback());
    const signInWithCredential = jest.fn().mockResolvedValue();
    const GoogleAuthProvider = {
      credential: jest.fn().mockReturnValue('cred'),
    };
    const sessionStorage = {
      getItem: jest.fn().mockReturnValue('token'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const globalScope = {
      window: {
        matchMedia: jest.fn().mockReturnValue({
          matches: false,
          addEventListener: jest.fn(),
        }),
      },
      google: {},
      sessionStorage,
    };

    const elementWithListener = () => ({
      style: {},
      addEventListener: jest.fn(),
    });
    const signOutLink = {
      style: {},
      listeners: {},
      addEventListener: jest.fn((type, handler) => {
        signOutLink.listeners[type] = handler;
      }),
    };
    const renderStatus = { innerHTML: '' };
    const querySelectorAll = jest.fn(selector => {
      if (selector === '.signin' || selector === '#signout') {
        return [{ style: {} }];
      }
      if (selector === '#signoutLink') {
        return [signOutLink];
      }
      return [];
    });
    const doc = {
      getElementById: id => {
        if (id === 'renderBtn' || id === 'statsBtn' || id === 'regenForm') {
          return elementWithListener();
        }
        if (id === 'regenInput') {
          return { value: '123abc' };
        }
        if (id === 'renderStatus') {
          return renderStatus;
        }
        if (id === 'content') {
          return { style: {} };
        }
        return null;
      },
      querySelectorAll,
    };

    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue(''),
    });

    await initAdminApp({
      loadStaticConfigFn: loadStaticConfig,
      getAuthFn: getAuth,
      GoogleAuthProviderFn: GoogleAuthProvider,
      onAuthStateChangedFn: onAuthStateChanged,
      signInWithCredentialFn: signInWithCredential,
      initializeAppFn: initializeApp,
      sessionStorageObj: sessionStorage,
      consoleObj: console,
      globalThisObj: globalScope,
      documentObj: doc,
      fetchObj: fetchFn,
      onHandlersReady: handlers => {
        googleAuthModule = handlers;
      },
    });

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(querySelectorAll).toHaveBeenCalledWith('#signoutLink');
    await signOutLink.listeners.click({ preventDefault: () => {} });
    await signOutLink.listeners.click({ preventDefault: () => {} });
    expect(auth.signOut).toHaveBeenCalledTimes(2);
    googleAuthModule.initGoogleSignIn();
    googleAuthModule.initGoogleSignIn();
    await googleAuthModule.signOut();
    await googleAuthModule.signOut();
    consoleErrorSpy.mockRestore();
  });
});
