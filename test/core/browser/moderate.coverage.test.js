import { describe, expect, it, jest, beforeEach } from '@jest/globals';

let mockConfig = { disableGoogleSignIn: true };
let mockToken = null;
const mockAuthedFetch = jest.fn(async () => ({
  title: 'Title',
  content: 'Content',
}));
let mockSignInInit;
const mockSignOut = jest.fn();
let mockDocument;
const mockFetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
let mockIntervalCallback;
let mockLoadDeps;
let mockAllowNoToken = false;
let mockIsAdmin = true;
let mockBeaconOptions;

jest.unstable_mockModule(
  '../../../src/core/browser/load-static-config-core.js',
  () => ({
    createLoadStaticConfig: deps => {
      mockLoadDeps = deps;
      return async () => mockConfig;
    },
  })
);
jest.unstable_mockModule(
  '../../../src/core/browser/moderation/authedFetch.js',
  () => ({
    createAuthedFetch: deps => async (url, init) => {
      if (!mockToken && !mockAllowNoToken) throw new Error('not signed in');
      const override = mockAuthedFetch(url, init);
      if (url === '/submit') return override;
      const response = await deps.fetchJson(url, init);
      return response.json();
    },
  })
);
jest.unstable_mockModule(
  '../../../src/core/browser/moderation/endpoints.js',
  () => ({
    DEFAULT_MODERATION_ENDPOINTS: {},
    createGetModerationEndpointsFromStaticConfig: () => async () => ({
      getModerationVariantUrl: '/variant',
      assignModerationJobUrl: '/assign',
      submitModerationRatingUrl: '/submit',
    }),
  })
);
jest.unstable_mockModule('../../../src/core/browser/browser-core.js', () => ({
  getIdToken: () => mockToken,
}));
jest.unstable_mockModule('../../../src/core/browser/document.js', () => ({
  dom: {
    setInterval: callback => {
      mockIntervalCallback = callback;
      return 'interval';
    },
    clearInterval: jest.fn(),
  },
}));
jest.unstable_mockModule('../../../src/core/browser/admin-core.js', () => ({
  setupFirebase: jest.fn(),
  createGoogleSignInInit: () => options => {
    mockSignInInit = options;
  },
  createSignOut: () => mockSignOut,
  isAdminWithDeps: () => mockIsAdmin,
}));
jest.unstable_mockModule('../../../src/core/browser/error-beacon.js', () => ({
  createErrorBeaconReporter: callback => {
    callback();
    return jest.fn();
  },
  createErrorBeaconHandlers: jest.fn(options => {
    mockBeaconOptions = options;
    options.reportBeacon?.();
    options.getUrl();
    options.getUserAgent();
    options.getNow();
    return { logError: jest.fn() };
  }),
}));
jest.unstable_mockModule(
  'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js',
  () => ({
    getAuth: jest.fn(),
    GoogleAuthProvider: jest.fn(),
    signInWithCredential: jest.fn(),
  })
);
jest.unstable_mockModule(
  'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js',
  () => ({
    initializeApp: jest.fn(),
  })
);

const {
  createModerateHandle,
  authedFetch,
  startAnimation,
  assignJob,
  resetModerationUi,
  submitRating,
  getInitGoogleSignInHandler,
  getSignOutHandler,
  isAdmin,
} = await import('../../../src/core/browser/moderate.js');

/** @returns {Document} Test document. */
function makeDocument() {
  const elements = new Map();
  const make = id => ({
    id,
    style: {},
    classList: { add: jest.fn(), remove: jest.fn() },
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    innerHTML: '',
    textContent: '',
  });
  ['approveBtn', 'rejectBtn', 'pageContent', 'fetching', 'saving'].forEach(id =>
    elements.set(id, make(id))
  );
  return {
    body: make('body'),
    createElement: tag => make(tag),
    getElementById: id => elements.get(id) ?? null,
    querySelectorAll: jest.fn(selector => {
      if (['#signoutWrap', '#signinButton', '.admin-link'].includes(selector)) {
        return [make('query')];
      }
      return [];
    }),
    elements,
  };
}

/**
 *
 * @param handle
 */
/**
 * @param {() => Promise<void>} handle Initialized moderation handle.
 * @returns {Promise<void>} Completion promise for fallback coverage.
 */
async function exerciseFallbackDocuments(handle) {
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  mockToken = 'token';
  const sparseDocument = {
    body: { classList: { add: jest.fn() } },
    getElementById: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild: jest.fn() }),
  };
  await createModerateHandle({
    documentObj: sparseDocument,
    fetchFn: mockFetch,
    sessionStorageObj: {},
    globalObject: {},
  })();
  await new Promise(resolve => setImmediate(resolve));
  const partialDocument = {
    body: { classList: { add: jest.fn() } },
    getElementById: id => {
      if (id === 'pageContent') return { style: {}, appendChild: jest.fn() };
      return null;
    },
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild: jest.fn() }),
  };
  mockToken = 'token';
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ title: 'Title', content: 'Content', options: [] }),
  });
  await createModerateHandle({
    documentObj: partialDocument,
    fetchFn: mockFetch,
    sessionStorageObj: {},
    globalObject: {},
  })();
  mockToken = null;
  mockAllowNoToken = true;
  mockFetch.mockRejectedValueOnce(new Error('HTTP 404'));
  await createModerateHandle({
    documentObj: partialDocument,
    fetchFn: mockFetch,
    sessionStorageObj: {},
    globalObject: {},
  })();
  mockSignInInit.onSignIn();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  mockIsAdmin = false;
  mockToken = 'token';
  mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  await handle();
  mockAllowNoToken = false;
  mockToken = 'token';
  mockFetch
    .mockRejectedValueOnce(new Error('HTTP 404'))
    .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    .mockRejectedValueOnce(new Error('HTTP 404'));
  mockSignInInit.onSignIn();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
  mockFetch
    .mockRejectedValueOnce(new Error('HTTP 404'))
    .mockResolvedValueOnce({ ok: false, status: 500 });
  mockSignInInit.onSignIn();
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}

// This coverage suite intentionally keeps related branch fixtures together.
// eslint-disable-next-line max-lines-per-function
describe('moderate core', () => {
  beforeEach(() => {
    mockConfig = { disableGoogleSignIn: true };
    mockAllowNoToken = false;
    mockIsAdmin = true;
    mockToken = null;
    mockAuthedFetch.mockReset().mockResolvedValue({
      title: 'Title',
      author: 'Author',
      content: 'Content',
      options: [{ content: 'Option', targetPageNumber: 2 }],
    });
    mockFetch
      .mockReset()
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    mockDocument = makeDocument();
    globalThis.alert = jest.fn();
  });

  it('handles disabled sign-in and the authed fetch adapter', async () => {
    expect(mockBeaconOptions.getUrl()).toBe('');
    expect(mockBeaconOptions.getUserAgent()).toBe('');
    expect(typeof mockBeaconOptions.getNow()).toBe('number');
    const sendBeacon = jest.fn(() => true);
    createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {
        navigator: { sendBeacon, userAgent: 'moderate-test' },
        location: { href: '/moderate-test' },
      },
    });
    expect(mockBeaconOptions.getUrl()).toBe('/moderate-test');
    expect(mockBeaconOptions.getUserAgent()).toBe('moderate-test');
    expect(mockBeaconOptions.reportBeacon).toHaveBeenCalled();
    createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    });
    const stopAnimation = startAnimation('fetching', 'Fetching');
    expect(mockDocument.elements.get('fetching').textContent).toBe('Fetching.');
    expect(mockDocument.elements.get('fetching').style.display).toBe('block');
    mockIntervalCallback();
    expect(mockDocument.elements.get('fetching').textContent).toBe(
      'Fetching..'
    );
    stopAnimation();
    expect(mockDocument.elements.get('fetching').style.display).toBe('none');
    createModerateHandle();
    await createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    })();
    await expect(authedFetch('/api')).rejects.toThrow('not signed in');
    mockToken = 'token';
    globalThis.fetch = undefined;
    await createModerateHandle({
      documentObj: mockDocument,
      fetchFn: undefined,
      sessionStorageObj: {},
      globalObject: {},
    })();
    await expect(authedFetch('/unavailable')).rejects.toThrow(
      'fetch is not available'
    );
    await createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    })();
    await expect(authedFetch('/api', { method: 'POST' })).resolves.toEqual({});
    await mockLoadDeps.fetchFn('/config', {});
    mockLoadDeps.warn('warning', new Error('warning'));
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'backend exploded',
    });
    await expect(authedFetch('/bad')).rejects.toThrow(
      'HTTP 500: backend exploded'
    );
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(authedFetch('/bad')).rejects.toThrow('HTTP 503');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => {
        throw new Error('read failed');
      },
    });
    await expect(authedFetch('/bad')).rejects.toThrow('HTTP 502');
  });

  it('assigns a moderation job with the token form payload', async () => {
    mockToken = 'token';
    createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    });
    await assignJob();
    expect(mockFetch).toHaveBeenCalledWith(
      '/assign',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.any(URLSearchParams),
      })
    );
    expect(mockFetch.mock.calls.at(-1)[1].body.get('id_token')).toBe('token');
  });

  it('rejects assignment without auth and on failed responses', async () => {
    createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    });
    await expect(assignJob()).rejects.toThrow('not signed in');
    mockToken = 'token';
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(assignJob()).rejects.toThrow('assign job: HTTP 503');
  });

  it('resets moderation controls to the signed-out state', () => {
    const signout = { style: {} };
    const signin = { style: {} };
    const link = { style: {} };
    const content = { innerHTML: 'content', style: { display: 'block' } };
    const documentObj = {
      querySelectorAll: selector =>
        selector === '#signoutWrap'
          ? [signout]
          : selector === '#signinButton'
            ? [signin]
            : [link],
      getElementById: id => (id === 'pageContent' ? content : null),
    };
    createModerateHandle({
      documentObj,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    });
    resetModerationUi();
    expect(signout.style.display).toBe('none');
    expect(signin.style.display).toBe('');
    expect(link.style.display).toBe('none');
    expect(content.innerHTML).toBe('');
    expect(content.style.display).toBe('none');
  });

  it('submits approval, assigns the next job, and reloads the variant', async () => {
    mockToken = 'token';
    createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    });
    await submitRating(true);
    expect(mockAuthedFetch).toHaveBeenCalledWith(
      '/submit',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ isApproved: true }),
      })
    );
    expect(mockFetch).toHaveBeenCalledWith('/assign', expect.any(Object));
    expect(mockAuthedFetch.mock.calls).toContainEqual(['/variant', undefined]);
  });

  it('caches sign-in and sign-out handlers and delegates admin checks', () => {
    const sessionStorageObj = { getItem: jest.fn(() => 'token') };
    const globalObject = { navigator: {}, location: { href: '/moderate' } };
    createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj,
      globalObject,
    });
    const initOne = getInitGoogleSignInHandler();
    const initTwo = getInitGoogleSignInHandler();
    expect(initTwo).toBe(initOne);
    const signOutOne = getSignOutHandler();
    const signOutTwo = getSignOutHandler();
    expect(signOutTwo).toBe(signOutOne);
    expect(isAdmin()).toBe(mockIsAdmin);
  });

  it('restores rating buttons after a submission failure', async () => {
    mockToken = 'token';
    mockAuthedFetch.mockRejectedValueOnce(new Error('submit failed'));
    const approve = mockDocument.elements.get('approveBtn');
    const reject = mockDocument.elements.get('rejectBtn');
    createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: {},
      globalObject: {},
    });
    await submitRating(false);
    expect(approve.disabled).toBe(false);
    expect(reject.disabled).toBe(false);
    expect(globalThis.alert).toHaveBeenCalledWith(
      "Sorry, that didn't work. See console for details."
    );
  });

  it('initializes sign-in, renders, submits, retries, and signs out', async () => {
    mockConfig = { disableGoogleSignIn: false };
    const links = [{ addEventListener: jest.fn() }];
    mockDocument.querySelectorAll = jest.fn(selector => {
      if (selector === '#signoutLink') return links;
      if (['#signoutWrap', '#signinButton', '.admin-link'].includes(selector)) {
        return [{ style: {} }];
      }
      return [];
    });
    mockToken = 'token';
    mockFetch.mockRejectedValueOnce(new Error('HTTP 404'));
    const handle = createModerateHandle({
      documentObj: mockDocument,
      fetchFn: mockFetch,
      sessionStorageObj: { getItem: () => 'true' },
      globalObject: { navigator: {}, location: { href: '/moderate' } },
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Title',
        author: 'Author',
        content: 'Content',
        options: [
          { content: 'Option', targetPageNumber: 2 },
          { content: 'No target' },
        ],
      }),
    });
    await handle();
    mockSignInInit.onSignIn();
    await new Promise(resolve => setImmediate(resolve));
    mockIntervalCallback?.();
    const [approve, reject] = ['approveBtn', 'rejectBtn'].map(id =>
      mockDocument.elements.get(id)
    );
    mockFetch.mockRejectedValueOnce(new Error('submit failed'));
    const originalGetElementById = mockDocument.getElementById;
    mockDocument.getElementById = () => null;
    approve.onclick();
    reject.onclick();
    mockDocument.getElementById = originalGetElementById;
    await new Promise(resolve => setImmediate(resolve));
    mockFetch.mockRejectedValueOnce(new Error('submit failed again'));
    approve.onclick();
    await new Promise(resolve => setImmediate(resolve));
    links[0].addEventListener.mock.calls[0][1]({ preventDefault: jest.fn() });
    await new Promise(resolve => setImmediate(resolve));
    mockDocument.getElementById = () => null;
    links[0].addEventListener.mock.calls[0][1]({ preventDefault: jest.fn() });
    await new Promise(resolve => setImmediate(resolve));
    mockDocument.getElementById = originalGetElementById;
    mockFetch
      .mockRejectedValueOnce(new Error('HTTP 404'))
      .mockRejectedValueOnce(new Error('assign failed'));
    mockSignInInit.onSignIn();
    await new Promise(resolve => setImmediate(resolve));
    links[0].addEventListener.mock.calls[0][1]({ preventDefault: jest.fn() });
    await Promise.all([
      new Promise(resolve => setImmediate(resolve)),
      new Promise(resolve => setImmediate(resolve)),
    ]);
    await exerciseFallbackDocuments(handle);
  });
});
