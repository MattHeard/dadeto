import {
  initAdmin,
  createTriggerStats,
  createRegenerateVariant,
  createTriggerRender,
  createGoogleAuthModule,
  createInitGoogleSignInHandlerFactory,
  initAdminApp,
  announceTriggerRenderResult,
  createInitAdminAppHandle,
} from '../../../../src/core/browser/admin-core.js';

describe('admin/core uncovered branches', () => {
  let mockGoogleAuthModule;
  let mockLoadStaticConfigFn;
  let mockGetAuthFn;
  let mockOnAuthStateChangedFn;
  let mockDoc;
  let mockFetchFn;
  let showMessageCalls;
  let mockShowMessage;

  beforeEach(() => {
    mockGoogleAuthModule = {
      getIdToken: () => 'some-token',
      signOut: () => {},
    };
    mockLoadStaticConfigFn = () => Promise.resolve({});
    mockGetAuthFn = () => ({});
    mockOnAuthStateChangedFn = () => {};

    const mockRenderStatusElement = {
      _innerHTML: '',
      set innerHTML(value) {
        this._innerHTML = value;
      },
      get innerHTML() {
        return this._innerHTML;
      },
    };

    mockDoc = {
      getElementById: id => {
        if (id === 'renderStatus') {
          return mockRenderStatusElement;
        }
        if (id === 'regenInput') {
          // This will be overridden in specific tests
          return { value: '' };
        }
        return null;
      },
      querySelectorAll: () => [],
    };

    mockFetchFn = (url, options) => {
      mockFetchFn.calls.push({ url, options });
      if (mockFetchFn.shouldThrow) {
        return Promise.reject(new Error('Fetch error'));
      }
      return Promise.resolve({ ok: true });
    };
    mockFetchFn.calls = [];
    mockFetchFn.shouldThrow = false;

    showMessageCalls = [];
    mockShowMessage = text => {
      showMessageCalls.push(text);
      const statusParagraph = mockDoc.getElementById('renderStatus');
      if (statusParagraph) {
        statusParagraph.innerHTML = `<strong>${String(text)}</strong>`;
      }
    };
  });

  it('should throw TypeError if googleAuthModule does not provide initGoogleSignIn', () => {
    expect(() =>
      initAdmin({
        googleAuthModule: mockGoogleAuthModule,
        loadStaticConfigFn: mockLoadStaticConfigFn,
        getAuthFn: mockGetAuthFn,
        onAuthStateChangedFn: mockOnAuthStateChangedFn,
        doc: mockDoc,
        fetchFn: mockFetchFn,
      })
    ).toThrow(
      new TypeError(
        'googleAuthModule must provide an initGoogleSignIn function'
      )
    );
  });

  it('createTriggerStats should report failure when fetchFn throws an error', async () => {
    mockFetchFn.shouldThrow = true;

    const triggerStats = createTriggerStats({
      googleAuth: mockGoogleAuthModule,
      getAdminEndpointsFn: () =>
        Promise.resolve({ generateStatsUrl: 'some-url' }),
      fetchFn: mockFetchFn,
      showMessage: mockShowMessage,
    });

    await triggerStats();

    expect(showMessageCalls).toContain('Stats generation failed');
  });

  it('createRegenerateVariant should show "Invalid format" if parsePageVariantInput returns null', async () => {
    // Simulate empty input for regenInput
    mockDoc.getElementById = id => {
      if (id === 'regenInput') {
        return { value: '' };
      }
      if (id === 'renderStatus') {
        return { innerHTML: '' };
      }
      return null;
    };

    const regenerateVariant = createRegenerateVariant({
      googleAuth: mockGoogleAuthModule,
      doc: mockDoc,
      showMessage: mockShowMessage,
      getAdminEndpointsFn: () =>
        Promise.resolve({ markVariantDirtyUrl: 'some-url' }),
      fetchFn: mockFetchFn,
    });

    await regenerateVariant({ preventDefault: () => {} });

    expect(showMessageCalls).toContain('Invalid format');
  });

  it('createRegenerateVariant should report failure when sendRegenerateVariantRequest throws an error', async () => {
    mockDoc.getElementById = id => {
      if (id === 'regenInput') {
        return { value: '123abc' }; // Simulate valid input
      }
      if (id === 'renderStatus') {
        return { innerHTML: '' };
      }
      return null;
    };
    mockFetchFn.shouldThrow = true;

    const regenerateVariant = createRegenerateVariant({
      googleAuth: mockGoogleAuthModule,
      doc: mockDoc,
      showMessage: mockShowMessage,
      getAdminEndpointsFn: () =>
        Promise.resolve({ markVariantDirtyUrl: 'some-url' }),
      fetchFn: mockFetchFn,
    });

    await regenerateVariant({ preventDefault: () => {} });

    expect(showMessageCalls).toContain('Regeneration failed');
  });

  it('reports an unknown status when regeneration returns a response without status', async () => {
    mockDoc.getElementById = id => {
      if (id === 'regenInput') return { value: '123abc' };
      if (id === 'renderStatus') return { innerHTML: '' };
      return null;
    };
    mockFetchFn = async () => ({ ok: false, text: async () => '' });
    const regenerateVariant = createRegenerateVariant({
      googleAuth: mockGoogleAuthModule,
      doc: mockDoc,
      showMessage: mockShowMessage,
      getAdminEndpointsFn: async () => ({ markVariantDirtyUrl: 'some-url' }),
      fetchFn: mockFetchFn,
    });
    await regenerateVariant({ preventDefault: () => {} });
    expect(showMessageCalls).toContain('Regeneration failed');
  });

  it('uses the cached token when the Firebase user has no token method', async () => {
    const storage = {
      getItem: key => {
        if (key === 'id_token') return 'cached-token';
        return null;
      },
      removeItem: () => {},
    };
    const auth = createGoogleAuthModule({
      getAuthFn: () => ({ currentUser: {} }),
      storage,
      consoleObj: { error: () => {} },
      globalScope: {},
      Provider: { credential: () => ({}) },
      credentialFactory: () => ({}),
    });
    await expect(auth.getIdToken()).resolves.toBe('cached-token');
  });

  it('uses the Firebase user token when available', async () => {
    const auth = createGoogleAuthModule({
      getAuthFn: () => ({
        currentUser: {
          getIdToken: async force => {
            if (force) return 'fresh-token';
            return '';
          },
        },
      }),
      storage: { getItem: () => 'cached-token', removeItem: () => {} },
      consoleObj: { error: () => {} },
      globalScope: {},
      Provider: { credential: () => ({}) },
      credentialFactory: () => ({}),
    });
    await expect(auth.getIdToken()).resolves.toBe('fresh-token');
  });

  it('returns an empty token when Firebase returns a falsy token', async () => {
    const auth = createGoogleAuthModule({
      getAuthFn: () => ({ currentUser: { getIdToken: async () => '' } }),
      storage: { getItem: () => 'cached-token', removeItem: () => {} },
      consoleObj: { error: () => {} },
      globalScope: {},
      Provider: { credential: () => ({}) },
      credentialFactory: () => ({}),
    });
    await expect(auth.getIdToken()).resolves.toBe('');
  });
});

describe('admin/core token and render branches', () => {
  let showMessageCalls;
  let mockShowMessage;
  beforeEach(() => {
    showMessageCalls = [];
    mockShowMessage = text => showMessageCalls.push(text);
  });

  it('falls back to an empty cached token when no Firebase user is available', async () => {
    const auth = createGoogleAuthModule({
      getAuthFn: () => ({ currentUser: {} }),
      storage: { getItem: () => null, removeItem: () => {} },
      consoleObj: { error: () => {} },
      globalScope: {},
      Provider: { credential: () => ({}) },
      credentialFactory: () => ({}),
    });
    await expect(auth.getIdToken()).resolves.toBe('');
  });

  it('returns an empty token from the initialized admin app when both sources are empty', async () => {
    let handlers;
    const auth = { currentUser: { getIdToken: async () => '' } };
    const sessionStorageObj = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    const handle = createInitAdminAppHandle({
      loadStaticConfigFn: async () => ({ disableGoogleSignIn: true }),
      getAuthFn: () => auth,
      GoogleAuthProviderFn: { credential: () => ({}) },
      onAuthStateChangedFn: () => {},
      signInWithCredentialFn: async () => {},
      initializeAppFn: () => ({}),
      sessionStorageObj,
      consoleObj: { error: () => {} },
      globalThisObj: { window: { matchMedia: () => ({ matches: false }) } },
      documentObj: { getElementById: () => null, querySelectorAll: () => [] },
      fetchObj: async () => ({ ok: true, status: 200, text: async () => '' }),
      onHandlersReady: value => {
        handlers = value;
      },
    });
    await handle();
    await expect(handlers.getIdToken()).resolves.toBe('');
    auth.currentUser = {};
    await expect(handlers.getIdToken()).resolves.toBe('');
  });

  it('reports trigger-render HTTP failures through the optional error reporter', async () => {
    const reported = [];
    const trigger = createTriggerRender({
      googleAuth: { getIdToken: () => 'token' },
      getAdminEndpointsFn: async () => ({
        triggerRenderContentsUrl: '/render',
      }),
      fetchFn: async () => ({
        ok: false,
        status: 503,
        statusText: 'Unavailable',
        text: async () => 'backend down',
      }),
      showMessage: mockShowMessage,
      reportError: error => reported.push(error),
    });
    await trigger();
    expect(reported[0]).toEqual(
      expect.objectContaining({
        message: 'Render failed: 503 Unavailable - backend down',
      })
    );
  });

  it('supports the default trigger-render error reporter', async () => {
    const trigger = createTriggerRender({
      googleAuth: { getIdToken: () => 'token' },
      getAdminEndpointsFn: async () => ({
        triggerRenderContentsUrl: '/render',
      }),
      fetchFn: async () => ({ ok: false, status: 500, statusText: 'Broken' }),
      showMessage: mockShowMessage,
    });
    await trigger();
    expect(showMessageCalls).toContain('Render failed: 500 Broken');
  });

  it('supports the default reporter when announcing a failed render directly', async () => {
    await announceTriggerRenderResult(
      { ok: false, status: 500, statusText: 'Broken' },
      mockShowMessage
    );
    expect(showMessageCalls).toContain('Render failed: 500 Broken');
  });

  it('reports regeneration response failures with status and response text', async () => {
    const regenerateVariant = createRegenerateVariant({
      googleAuth: { getIdToken: () => 'token' },
      doc: {
        getElementById: id => {
          if (id === 'regenInput') return { value: '123abc' };
          return { innerHTML: '' };
        },
      },
      showMessage: mockShowMessage,
      getAdminEndpointsFn: async () => ({ markVariantDirtyUrl: '/dirty' }),
      fetchFn: async () => ({
        ok: false,
        status: 400,
        text: async () => 'invalid variant',
      }),
    });
    await regenerateVariant({ preventDefault: () => {} });
    expect(showMessageCalls).toContain('Regeneration failed');
  });

  it('memoizes the Google sign-in handler and rejects unavailable auth', () => {
    const factory = createInitGoogleSignInHandlerFactory({
      getAuthFn: () => ({}),
      sessionStorageObj: { getItem: () => null, setItem: () => {} },
      consoleObj: {},
      globalThisObj: {},
      googleAuthProviderFn: { credential: token => token },
      signInWithCredentialFn: () => {},
    });
    expect(factory()).toBe(factory());

    const unavailable = createInitGoogleSignInHandlerFactory({
      getAuthFn: () => null,
      sessionStorageObj: {},
      consoleObj: {},
      globalThisObj: {},
      googleAuthProviderFn: {},
      signInWithCredentialFn: () => {},
    });
    expect(() => unavailable()).toThrow('Firebase auth client is not ready');
  });
});

describe('admin/core regeneration branches', () => {
  it('handles author regeneration submissions and missing author input', async () => {
    let submitHandler;
    const form = {
      addEventListener: (event, handler) => {
        submitHandler = handler;
      },
    };
    const input = { value: ' author-42 ' };
    const status = { innerHTML: '' };
    const doc = {
      getElementById: id =>
        ({
          regenAuthorForm: form,
          regenAuthorInput: input,
          renderStatus: status,
        })[id] ?? null,
      querySelectorAll: () => [],
    };
    const fetchFn = async () => ({ ok: true });
    initAdmin({
      googleAuthModule: {
        initGoogleSignIn: () => {},
        getIdToken: async () => 'token',
        signOut: () => {},
      },
      loadStaticConfigFn: async () => ({ markVariantDirtyUrl: '/dirty' }),
      getAuthFn: () => ({}),
      onAuthStateChangedFn: () => {},
      doc,
      fetchFn,
    });
    const event = { preventDefault: () => {} };
    await submitHandler(event);
    expect(status.innerHTML).toContain('Author regeneration triggered');

    input.value = '';
    await submitHandler(event);
    expect(status.innerHTML).toContain('Author regeneration triggered');
  });

  it('reports author regeneration request failures', async () => {
    let submitHandler;
    const status = { innerHTML: '' };
    const doc = {
      getElementById: id => {
        if (id === 'regenAuthorForm') {
          return {
            addEventListener: (event, handler) => {
              submitHandler = handler;
            },
          };
        }
        if (id === 'regenAuthorInput') return { value: 'author-42' };
        if (id === 'renderStatus') return status;
        return null;
      },
      querySelectorAll: () => [],
    };
    const reported = [];
    initAdmin({
      googleAuthModule: {
        initGoogleSignIn: () => {},
        getIdToken: async () => 'token',
        signOut: () => {},
      },
      loadStaticConfigFn: async () => ({ markVariantDirtyUrl: '/dirty' }),
      getAuthFn: () => ({}),
      onAuthStateChangedFn: () => {},
      doc,
      fetchFn: async () => ({ ok: false, status: 500, statusText: 'Broken' }),
      reportError: error => reported.push(error),
    });
    await submitHandler({ preventDefault: () => {} });
    expect(reported).toHaveLength(1);
    expect(status.innerHTML).toContain('Author regeneration failed');
  });

  it('uses the cached token for initAdminApp requests', async () => {
    let clickHandler;
    const doc = {
      getElementById: id => {
        if (id !== 'renderBtn') return null;
        return {
          addEventListener: (event, handler) => {
            clickHandler = handler;
          },
        };
      },
      querySelectorAll: () => [],
    };
    initAdminApp({
      loadStaticConfigFn: async () => ({ triggerRenderContentsUrl: '/render' }),
      getAuthFn: () => ({}),
      GoogleAuthProviderFn: { credential: () => ({}) },
      onAuthStateChangedFn: () => {},
      signInWithCredentialFn: async () => {},
      initializeAppFn: () => {},
      sessionStorageObj: {
        getItem: key => {
          if (key === 'id_token') return 'cached-token';
          return null;
        },
        setItem: () => {},
        removeItem: () => {},
      },
      consoleObj: {},
      globalThisObj: {},
      documentObj: doc,
      fetchObj: async (_url, options) => ({
        ok: options.headers.Authorization === 'Bearer cached-token',
      }),
    });
    await clickHandler({ preventDefault: () => {} });
  });
});
