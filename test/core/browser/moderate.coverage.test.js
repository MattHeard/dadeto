import { describe, expect, it, jest, beforeEach } from '@jest/globals';

var mockConfig = { disableGoogleSignIn: true };
var mockToken = null;
var mockGetModerationEndpoints = jest.fn(async () => ({
  getModerationVariantUrl: '/variant',
  assignModerationJobUrl: '/assign',
  submitModerationRatingUrl: '/submit',
}));
var mockAuthedFetch = jest.fn(async () => ({ title: 'Title', content: 'Content' }));
var mockSignInInit;
var mockSignOut = jest.fn();
var mockDocument;
var mockFetch = jest.fn(async () => ({ ok: true, json: async () => ({}) }));
var mockIntervalCallback;
var mockLoadDeps;
var mockAllowNoToken = false;
var mockIsAdmin = true;

jest.mock('../../../src/core/browser/load-static-config-core.js', () => ({ createLoadStaticConfig: deps => { mockLoadDeps = deps; return async () => mockConfig; } }));
jest.mock('../../../src/core/browser/moderation/authedFetch.js', () => ({ createAuthedFetch: deps => async (url, init) => { if (!mockToken && !mockAllowNoToken) throw new Error('not signed in'); const response = await deps.fetchJson(url, init); return response.json(); } }));
jest.mock('../../../src/core/browser/moderation/endpoints.js', () => ({
  DEFAULT_MODERATION_ENDPOINTS: {},
  createGetModerationEndpointsFromStaticConfig: () => async () => ({ getModerationVariantUrl: '/variant', assignModerationJobUrl: '/assign', submitModerationRatingUrl: '/submit' }),
}));
jest.mock('../../../src/core/browser/browser-core.js', () => ({ getIdToken: () => mockToken }));
jest.mock('../../../src/core/browser/document.js', () => ({ dom: { setInterval: callback => { mockIntervalCallback = callback; return 'interval'; }, clearInterval: jest.fn() } }));
jest.mock('../../../src/core/browser/admin-core.js', () => ({
  setupFirebase: jest.fn(),
  createGoogleSignInInit: () => options => { mockSignInInit = options; },
  createSignOut: () => mockSignOut,
  isAdminWithDeps: () => mockIsAdmin,
}));
jest.mock('../../../src/core/browser/error-beacon.js', () => ({
  createErrorBeaconReporter: callback => { callback(); return jest.fn(); },
  createErrorBeaconHandlers: jest.fn(options => { options.reportBeacon?.(); options.getUrl(); options.getUserAgent(); options.getNow(); return { logError: jest.fn() }; }),
}));
jest.mock('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js', () => ({ getAuth: jest.fn(), GoogleAuthProvider: jest.fn(), signInWithCredential: jest.fn() }));
jest.mock('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js', () => ({ initializeApp: jest.fn() }));

import { createModerateHandle, authedFetch } from '../../../src/core/browser/moderate.js';

function makeDocument() {
  const elements = new Map();
  const make = id => ({ id, style: {}, classList: { add: jest.fn(), remove: jest.fn() }, addEventListener: jest.fn(), appendChild: jest.fn(), querySelectorAll: jest.fn(() => []), innerHTML: '', textContent: '' });
  ['approveBtn', 'rejectBtn', 'pageContent', 'fetching', 'saving'].forEach(id => elements.set(id, make(id)));
  return {
    body: make('body'),
    createElement: tag => make(tag),
    getElementById: id => elements.get(id) ?? null,
    querySelectorAll: jest.fn(selector => ['#signoutWrap', '#signinButton', '.admin-link'].includes(selector) ? [make('query')] : []),
    elements,
  };
}

describe('moderate core', () => {
  beforeEach(() => {
    mockConfig = { disableGoogleSignIn: true };
    mockAllowNoToken = false;
    mockIsAdmin = true;
    mockToken = null;
    mockAuthedFetch.mockReset().mockResolvedValue({ title: 'Title', author: 'Author', content: 'Content', options: [{ content: 'Option', targetPageNumber: 2 }] });
    mockFetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) });
    mockDocument = makeDocument();
    globalThis.alert = jest.fn();
  });

  it('handles disabled sign-in and the authed fetch adapter', async () => {
    createModerateHandle();
    await createModerateHandle({ documentObj: mockDocument, fetchFn: mockFetch, sessionStorageObj: {}, globalObject: {} })();
    await expect(authedFetch('/api')).rejects.toThrow('not signed in');
    mockToken = 'token';
    globalThis.fetch = undefined;
    await createModerateHandle({ documentObj: mockDocument, fetchFn: undefined, sessionStorageObj: {}, globalObject: {} })();
    await expect(authedFetch('/unavailable')).rejects.toThrow('fetch is not available');
    await createModerateHandle({ documentObj: mockDocument, fetchFn: mockFetch, sessionStorageObj: {}, globalObject: {} })();
    await expect(authedFetch('/api', { method: 'POST' })).resolves.toEqual({});
    await mockLoadDeps.fetchFn('/config', {});
    mockLoadDeps.warn('warning', new Error('warning'));
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'backend exploded' });
    await expect(authedFetch('/bad')).rejects.toThrow('HTTP 500: backend exploded');
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(authedFetch('/bad')).rejects.toThrow('HTTP 503');
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502, text: async () => { throw new Error('read failed'); } });
    await expect(authedFetch('/bad')).rejects.toThrow('HTTP 502');
  });

  it('initializes sign-in, renders, submits, retries, and signs out', async () => {
    mockConfig = { disableGoogleSignIn: false };
    const links = [{ addEventListener: jest.fn() }];
    mockDocument.querySelectorAll = jest.fn(selector => selector === '#signoutLink' ? links : ['#signoutWrap', '#signinButton', '.admin-link'].includes(selector) ? [{ style: {} }] : []);
    mockToken = 'token';
    mockFetch.mockRejectedValueOnce(new Error('HTTP 404'));
    const handle = createModerateHandle({ documentObj: mockDocument, fetchFn: mockFetch, sessionStorageObj: { getItem: () => 'true' }, globalObject: { navigator: {}, location: { href: '/moderate' } } });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ title: 'Title', author: 'Author', content: 'Content', options: [{ content: 'Option', targetPageNumber: 2 }, { content: 'No target' }] }) });
    mockAuthedFetch.mockResolvedValueOnce({ title: '', content: 'No author', options: [{ content: 'No target' }] });
    await handle();
    mockSignInInit.onSignIn();
    await new Promise(resolve => setImmediate(resolve));
    mockIntervalCallback?.();
    const approve = mockDocument.elements.get('approveBtn');
    const reject = mockDocument.elements.get('rejectBtn');
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
    mockFetch.mockRejectedValueOnce(new Error('HTTP 404')).mockRejectedValueOnce(new Error('assign failed'));
    mockSignInInit.onSignIn();
    await new Promise(resolve => setImmediate(resolve));
    links[0].addEventListener.mock.calls[0][1]({ preventDefault: jest.fn() });
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    mockToken = 'token';
    const sparseDocument = { body: { classList: { add: jest.fn() } }, getElementById: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, appendChild: jest.fn() }) };
    await createModerateHandle({ documentObj: sparseDocument, fetchFn: mockFetch, sessionStorageObj: {}, globalObject: {} })();
    await new Promise(resolve => setImmediate(resolve));
    const partialDocument = { body: { classList: { add: jest.fn() } }, getElementById: id => id === 'pageContent' ? { style: {}, appendChild: jest.fn() } : null, querySelectorAll: () => [], createElement: () => ({ style: {}, appendChild: jest.fn() }) };
    mockToken = 'token';
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ title: 'Title', content: 'Content', options: [] }) });
    await createModerateHandle({ documentObj: partialDocument, fetchFn: mockFetch, sessionStorageObj: {}, globalObject: {} })();
    mockToken = null;
    mockAllowNoToken = true;
    mockFetch.mockRejectedValueOnce(new Error('HTTP 404'));
    await createModerateHandle({ documentObj: partialDocument, fetchFn: mockFetch, sessionStorageObj: {}, globalObject: {} })();
    mockSignInInit.onSignIn();
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    mockIsAdmin = false;
    mockToken = 'token';
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await handle();
    mockAllowNoToken = false;
    mockToken = 'token';
    mockFetch.mockRejectedValueOnce(new Error('HTTP 404')).mockResolvedValueOnce({ ok: true, json: async () => ({}) }).mockRejectedValueOnce(new Error('HTTP 404'));
    mockSignInInit.onSignIn();
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    mockFetch.mockRejectedValueOnce(new Error('HTTP 404')).mockResolvedValueOnce({ ok: false, status: 500 });
    mockSignInInit.onSignIn();
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
  });
});
