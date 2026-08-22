import { jest } from '@jest/globals';
import {
  announceTriggerRenderResult,
  assertFunction,
  buildSignInCredential,
  bindRegenerateVariantSubmit,
  bindTriggerRenderClick,
  bindTriggerStatsClick,
  createAdminEndpointsPromise,
  createGetAdminEndpoints,
  createTriggerRender,
  createShowMessage,
  createElementEventBinder,
  ensureSignOutAuth,
  ensureSignOutDoc,
  attachSignOutLink,
  attachSignOutLinks,
  createSignOutClickHandler,
  extractTextReader,
  formatTriggerRenderFailureMessage,
  getAdminContent,
  getCurrentUser,
  getSignInButtons,
  getSignOutSections,
  getNestedProperty,
  resolveNestedProperty,
  isTraversable,
  isDisableAutoSelectFunction,
  createSafeLogger,
  noopLoggerError,
  initAdmin,
  handleCredentialSignIn,
  mapConfigToAdminEndpoints,
  isAdminWithDeps,
  isDocumentLike,
  canListenToEvent,
  hasSignOutMethod,
  hasQuerySelectorAll,
  isObject,
  hasStorageSetItem,
  ensureObject,
  ensureStorage,
  hasLoggerError,
  hasInitializeMethod,
  hasRenderButtonMethod,
  resolveGoogleAccounts,
  resolveLogger,
  resolveGetIdToken,
  validateGetIdToken,
  executeTriggerRender,
  postTriggerRenderContents,
  readResponseText,
  readTriggerRenderBody,
  renderErrorMessage,
  resolveTriggerRenderStatus,
  resolveTriggerRenderStatusText,
  getResponseTextReader,
  resolveAdminEndpoint,
  setupFirebase,
  updateAuthControlsDisplay,
  validateGoogleSignInDeps,
} from '../../../src/core/browser/admin-core.js';

describe('buildSignInCredential', () => {
  it('passes auth and credential through to the wrapped signer', () => {
    const credentialFactory = jest.fn((auth, credential) => ({
      auth,
      credential,
    }));
    const handler = buildSignInCredential(credentialFactory);

    const auth = { uid: 'user-1' };
    const result = handler(auth, 'token-123');

    expect(credentialFactory).toHaveBeenCalledWith(auth, 'token-123');
    expect(result).toEqual({ auth, credential: 'token-123' });
  });
});

describe('resolveAdminEndpoint', () => {
  it('returns an empty string when the key is not present anywhere', () => {
    expect(resolveAdminEndpoint({}, 'missing')).toBe('');
  });

  it('prefers configured endpoints and stringifies configured values', () => {
    expect(resolveAdminEndpoint({ triggerRenderContentsUrl: 42 }, 'triggerRenderContentsUrl')).toBe('42');
    expect(resolveAdminEndpoint({}, 'triggerRenderContentsUrl')).toMatch(/^https:\/\//);
  });
});

describe('admin endpoint configuration', () => {
  it('maps all configured endpoint overrides', () => {
    expect(mapConfigToAdminEndpoints({
      triggerRenderContentsUrl: 'render',
      markVariantDirtyUrl: 'dirty',
      generateStatsUrl: 'stats',
    })).toEqual({
      triggerRenderContentsUrl: 'render',
      markVariantDirtyUrl: 'dirty',
      generateStatsUrl: 'stats',
    });
  });

  it('uses defaults for a missing loader and rejected loader', async () => {
    const withoutLoader = await createAdminEndpointsPromise(null);
    const rejected = await createAdminEndpointsPromise(() => Promise.reject(new Error('load failed')));
    expect(withoutLoader).toEqual(rejected);
    expect(withoutLoader.triggerRenderContentsUrl).toMatch(/^https:\/\//);
  });

  it('memoizes the endpoint promise', async () => {
    const factory = jest.fn(() => Promise.resolve({ value: 'endpoints' }));
    const getEndpoints = createGetAdminEndpoints(factory);
    expect(await getEndpoints()).toEqual({ value: 'endpoints' });
    expect(getEndpoints()).toBe(getEndpoints());
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe('isAdminWithDeps', () => {
  it('normalizes URL-safe base64 characters before decoding', () => {
    const storage = { getItem: jest.fn().mockReturnValue('header.a-b_c.sig') };
    const decodeBase64 = jest.fn(value => {
      expect(value).toBe('a+b/c');
      return JSON.stringify({ sub: 'not-admin' });
    });
    expect(isAdminWithDeps(storage, JSON, decodeBase64)).toBe(false);
  });
});

describe('announceTriggerRenderResult', () => {
  it('reports unknown status when the response is unavailable', async () => {
    const showMessage = jest.fn();
    await announceTriggerRenderResult(null, showMessage);

    expect(showMessage).toHaveBeenCalledWith('Render failed: unknown unknown');
  });

  it('reports successful responses without reading a body', async () => {
    const showMessage = jest.fn();
    await announceTriggerRenderResult({ ok: true }, showMessage);
    expect(showMessage).toHaveBeenCalledWith('Render triggered');
  });

  it('reports failure details and error telemetry', async () => {
    const showMessage = jest.fn();
    const reportError = jest.fn();
    const text = jest.fn(function readText() {
      expect(this.status).toBe(500);
      return Promise.resolve('backend failed');
    });
    await announceTriggerRenderResult(
      { ok: false, status: 500, statusText: 'Server Error', text },
      showMessage,
      reportError
    );
    expect(showMessage).toHaveBeenCalledWith(
      'Render failed: 500 Server Error - backend failed'
    );
    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('trigger render execution', () => {
  it('posts the bearer token and reports success', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
    const showMessage = jest.fn();
    await postTriggerRenderContents(
      () => Promise.resolve({ triggerRenderContentsUrl: '/render' }),
      fetchFn,
      'token-1'
    );
    expect(fetchFn).toHaveBeenCalledWith('/render', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-1' },
    });
    await executeTriggerRender({
      getAdminEndpoints: () => Promise.resolve({ triggerRenderContentsUrl: '/render' }),
      fetchFn,
      token: 'token-1',
      showMessage,
    });
    expect(showMessage).toHaveBeenCalledWith('Render triggered');
  });

  it('reports thrown fetch errors and non-Error failures', async () => {
    const showMessage = jest.fn();
    const reportError = jest.fn();
    const failure = jest.fn().mockRejectedValue('network failed');
    await executeTriggerRender({
      getAdminEndpoints: () => Promise.resolve({ triggerRenderContentsUrl: '/render' }),
      fetchFn: failure,
      token: 'token-1',
      showMessage,
      reportError,
    });
    expect(reportError).toHaveBeenCalledWith('network failed');
    expect(showMessage).toHaveBeenCalledWith('Render failed: network failed');
  });

  it('guards the token action and delegates when a token exists', async () => {
    const showMessage = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
    const handler = createTriggerRender({
      googleAuth: { getIdToken: jest.fn().mockResolvedValue(null) },
      getAdminEndpointsFn: () => Promise.resolve({ triggerRenderContentsUrl: '/render' }),
      fetchFn,
      showMessage,
    });
    await handler();
    expect(showMessage).toHaveBeenCalledWith('Render failed: missing ID token');
    expect(fetchFn).not.toHaveBeenCalled();

    const successMessage = jest.fn();
    const successHandler = createTriggerRender({
      googleAuth: { getIdToken: jest.fn().mockResolvedValue('token-2') },
      getAdminEndpointsFn: () => Promise.resolve({ triggerRenderContentsUrl: '/render' }),
      fetchFn,
      showMessage: successMessage,
    });
    await successHandler();
    expect(successMessage).toHaveBeenCalledWith('Render triggered');
  });
});

describe('admin DOM binding helpers', () => {
  function documentWith(elementId, element) {
    return {
      getElementById: id => (id === elementId ? element : null),
      querySelectorAll: jest.fn().mockReturnValue([]),
    };
  }

  it('binds click and submit handlers and returns null for missing targets', () => {
    const button = { addEventListener: jest.fn() };
    const form = { addEventListener: jest.fn() };
    const click = jest.fn();
    const submit = jest.fn();
    expect(bindTriggerRenderClick(documentWith('renderBtn', button), click)).toBe(button);
    expect(bindTriggerStatsClick(documentWith('statsBtn', button), click)).toBe(button);
    expect(bindRegenerateVariantSubmit(documentWith('regenForm', form), submit)).toBe(form);
    expect(bindTriggerRenderClick(documentWith('other', null), click)).toBeNull();
    expect(button.addEventListener).toHaveBeenCalledWith('click', click);
    expect(form.addEventListener).toHaveBeenCalledWith('submit', submit);
  });

  it('rejects invalid binding dependencies', () => {
    expect(() => bindTriggerRenderClick({}, jest.fn())).toThrow('Document-like');
    expect(() => bindTriggerRenderClick(documentWith('renderBtn', null), null)).toThrow(
      'triggerRenderFn must be a function'
    );
    expect(() => bindTriggerStatsClick(documentWith('statsBtn', null), null)).toThrow(
      'triggerStatsFn must be a function'
    );
    expect(() => bindRegenerateVariantSubmit(documentWith('regenForm', null), null)).toThrow(
      'regenerateVariantFn must be a function'
    );
  });
});

describe('admin-core interface predicates', () => {
  it('accept only the required callable interfaces', () => {
    expect(isDocumentLike({ getElementById: jest.fn() })).toBe(true);
    expect(isDocumentLike(null)).toBe(false);
    expect(isDocumentLike({ getElementById: true })).toBe(false);
    expect(canListenToEvent({ addEventListener: jest.fn() })).toBe(true);
    expect(canListenToEvent({ addEventListener: true })).toBe(false);
    expect(canListenToEvent(undefined)).toBe(false);
    expect(hasSignOutMethod({ signOut: jest.fn() })).toBe(true);
    expect(hasSignOutMethod({ signOut: true })).toBe(false);
    expect(hasSignOutMethod(null)).toBe(false);
    expect(hasQuerySelectorAll({ querySelectorAll: jest.fn() })).toBe(true);
    expect(hasQuerySelectorAll({ querySelectorAll: true })).toBe(false);
    expect(hasQuerySelectorAll(undefined)).toBe(false);
    expect(isObject({})).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject('object')).toBe(false);
    expect(hasStorageSetItem({ setItem: jest.fn() })).toBe(true);
    expect(hasStorageSetItem({ setItem: true })).toBe(false);
    expect(hasStorageSetItem(undefined)).toBe(false);
  });

  it('resolves Google and logger collaborators without unsafe calls', async () => {
    const client = { initialize: jest.fn(), renderButton: jest.fn() };
    expect(hasInitializeMethod(client)).toBe(true);
    expect(hasInitializeMethod({ initialize: true })).toBe(false);
    expect(hasInitializeMethod(undefined)).toBe(false);
    expect(hasRenderButtonMethod(client)).toBe(true);
    expect(hasRenderButtonMethod({ renderButton: true })).toBe(false);
    expect(hasRenderButtonMethod(null)).toBe(false);
    expect(hasLoggerError({ error: jest.fn() })).toBe(true);
    expect(hasLoggerError({ error: true })).toBe(false);
    expect(hasLoggerError(undefined)).toBe(false);
    const logger = { error: jest.fn() };
    expect(resolveLogger(logger)).toBe(logger);
    expect(resolveLogger(null)).toBe(console);
    const direct = resolveGoogleAccounts(client);
    expect(direct()).toBe(client);
    const getter = jest.fn().mockReturnValue(client);
    expect(resolveGoogleAccounts(getter)).toBe(getter);
    expect(resolveGoogleAccounts(getter)()).toBe(client);
    const getIdToken = jest.fn().mockResolvedValue('token');
    expect(await resolveGetIdToken({ getIdToken })()).toBe('token');
    expect(() => resolveGetIdToken(null)).toThrow('getIdToken must be a function');
    expect(() => validateGetIdToken(null)).toThrow('getIdToken must be a function');
  });
});

describe('admin document and auth helpers', () => {
  it('queries the expected admin controls and resolves current users safely', () => {
    const content = {};
    const signins = [];
    const signouts = [];
    const doc = {
      getElementById: jest.fn().mockReturnValue(content),
      querySelectorAll: jest.fn(selector => selector === '#signinButton' ? signins : signouts),
    };
    expect(getAdminContent(doc)).toBe(content);
    expect(getSignInButtons(doc)).toBe(signins);
    expect(getSignOutSections(doc)).toBe(signouts);
    const user = { uid: 'user' };
    expect(getCurrentUser(() => ({ currentUser: user }))).toBe(user);
    expect(getCurrentUser(() => null)).toBeNull();
    expect(getCurrentUser(null)).toBeNull();
  });

  it('updates sign-in and sign-out visibility in both auth states', () => {
    const signIns = [{ style: {} }];
    const signOuts = [{ style: {} }];
    updateAuthControlsDisplay({ uid: 'user' }, signIns, signOuts);
    expect(signIns[0].style.display).toBe('none');
    expect(signOuts[0].style.display).toBe('');
    updateAuthControlsDisplay(null, signIns, signOuts);
    expect(signIns[0].style.display).toBe('');
    expect(signOuts[0].style.display).toBe('none');
  });

  it('renders status text, handles absent status elements, and configures Firebase', () => {
    const paragraph = { innerHTML: '' };
    const doc = { getElementById: jest.fn().mockReturnValue(paragraph) };
    const show = createShowMessage(getAdminContent, doc);
    show(123);
    expect(paragraph.innerHTML).toBe('<strong>123</strong>');
    const absent = createShowMessage(() => null, doc);
    expect(() => absent('ignored')).not.toThrow();
    expect(() => createShowMessage(null, doc)).toThrow('getStatusParagraphFn must be a function');
    expect(() => createShowMessage(getAdminContent, {})).toThrow('Document-like');
    const initApp = jest.fn();
    setupFirebase(initApp);
    expect(initApp).toHaveBeenCalledWith({
      apiKey: expect.any(String),
      authDomain: 'irien-465710.firebaseapp.com',
      projectId: 'irien-465710',
    });
  });

  it('validates initAdmin dependencies before wiring the UI', () => {
    const valid = {
      googleAuthModule: { getIdToken: jest.fn(), signOut: jest.fn(), initGoogleSignIn: jest.fn() },
      getAuthFn: jest.fn(),
      onAuthStateChangedFn: jest.fn(),
      doc: { getElementById: jest.fn(), querySelectorAll: jest.fn().mockReturnValue([]) },
      fetchFn: jest.fn(),
      loadStaticConfigFn: jest.fn().mockResolvedValue({ disableGoogleSignIn: true }),
    };
    expect(() => initAdmin({ ...valid, googleAuthModule: null })).toThrow('googleAuthModule must be provided');
    expect(() => initAdmin({ ...valid, getAuthFn: null })).toThrow('getAuthFn must be a function');
    expect(() => initAdmin({ ...valid, onAuthStateChangedFn: null })).toThrow('onAuthStateChangedFn must be a function');
    expect(() => initAdmin({ ...valid, doc: {} })).toThrow('Document-like');
    expect(() => initAdmin({ ...valid, fetchFn: null })).toThrow('fetchFn must be a function');
  });
});

describe('admin dependency validators', () => {
  it('validates functions, objects, storage, and Google sign-in dependencies', () => {
    const fn = jest.fn();
    expect(assertFunction(fn, 'fn')).toBeUndefined();
    expect(() => assertFunction(null, 'fn')).toThrow('fn');
    expect(ensureObject({})).toBeUndefined();
    expect(() => ensureObject(null, 'object required')).toThrow('object required');
    expect(ensureStorage({ setItem: fn })).toBeUndefined();
    expect(() => ensureStorage({})).toThrow('setItem function');
    const valid = {
      credentialFactory: fn,
      signInWithCredential: fn,
      auth: {},
      storage: { setItem: fn },
      matchMedia: fn,
      querySelectorAll: fn,
    };
    expect(validateGoogleSignInDeps(valid)).toBeUndefined();
    for (const [key, value] of [
      ['credentialFactory', null],
      ['signInWithCredential', null],
      ['auth', null],
      ['storage', {}],
      ['matchMedia', null],
      ['querySelectorAll', null],
    ]) {
      expect(() => validateGoogleSignInDeps({ ...valid, [key]: value })).toThrow();
    }
  });
});

describe('admin nested traversal and logger helpers', () => {
  it('traverses only object paths and preserves callable detection', () => {
    const source = { google: { accounts: { id: { ready: true } } } };
    expect(getNestedProperty(source, 'google', 'accounts', 'id', 'ready')).toBe(true);
    expect(getNestedProperty(source, 'google', 'missing')).toBeUndefined();
    expect(getNestedProperty(null, 'google')).toBeUndefined();
    expect(resolveNestedProperty(source.google, 'accounts')).toBe(source.google.accounts);
    expect(resolveNestedProperty('not-object', 'key')).toBeUndefined();
    expect(isTraversable({})).toBe(true);
    expect(isTraversable([])).toBe(true);
    expect(isTraversable(null)).toBe(false);
    expect(isTraversable('object')).toBe(false);
    expect(isDisableAutoSelectFunction(jest.fn())).toBe(true);
    expect(isDisableAutoSelectFunction({})).toBe(false);
  });

  it('provides a callable safe logger stub', () => {
    const logger = createSafeLogger();
    expect(typeof logger.error).toBe('function');
    expect(logger.error()).toBeUndefined();
    expect(noopLoggerError()).toBeUndefined();
  });
});

describe('admin event and sign-out helpers', () => {
  it('creates event binders that attach only to listenable elements', () => {
    const element = { addEventListener: jest.fn() };
    const doc = { getElementById: jest.fn().mockReturnValue(element) };
    const listener = jest.fn();
    expect(createElementEventBinder('click')(doc, 'button', listener)).toBe(element);
    expect(element.addEventListener).toHaveBeenCalledWith('click', listener);
    expect(createElementEventBinder('submit')({ getElementById: () => null }, 'form', listener)).toBeNull();
  });

  it('validates sign-out dependencies and wires links safely', async () => {
    const signOut = jest.fn().mockResolvedValue();
    const auth = { signOut };
    expect(ensureSignOutAuth(auth)).toBeUndefined();
    expect(() => ensureSignOutAuth(null)).toThrow('googleAuth must provide a signOut function');
    const link = { addEventListener: jest.fn() };
    const doc = { querySelectorAll: jest.fn().mockReturnValue([link]) };
    expect(ensureSignOutDoc(doc)).toBeUndefined();
    expect(() => ensureSignOutDoc({})).toThrow('Document-like');
    attachSignOutLink(link, auth);
    expect(link.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    attachSignOutLink({}, auth);
    attachSignOutLinks(doc, auth);
    const event = { preventDefault: jest.fn() };
    await createSignOutClickHandler(auth)(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });
});

describe('trigger render response helpers', () => {
  it('normalizes status, status text, and response bodies', async () => {
    expect(resolveTriggerRenderStatus(null)).toBe('unknown');
    expect(resolveTriggerRenderStatus({ status: 503 })).toBe(503);
    expect(resolveTriggerRenderStatusText(null)).toBe('unknown');
    expect(resolveTriggerRenderStatusText({ statusText: '' })).toBe('unknown');
    expect(resolveTriggerRenderStatusText({ statusText: 'Unavailable' })).toBe('Unavailable');
    expect(getResponseTextReader(null)).toBeNull();
    expect(getResponseTextReader({ text: 'not callable' })).toBeNull();
    const response = { text: jest.fn(function text() { return Promise.resolve(' body '); }) };
    expect(extractTextReader(response)).toBe(response.text);
    expect(await readTriggerRenderBody(response)).toBe(' body ');
    expect(await readTriggerRenderBody({})).toBe('');
    expect(await readResponseText(() => Promise.resolve(''), response)).toBe('');
  });

  it('formats body and error variants distinctly', () => {
    expect(formatTriggerRenderFailureMessage({ status: 500, statusText: 'Error', body: '' })).toBe(
      'Render failed: 500 Error'
    );
    expect(formatTriggerRenderFailureMessage({ status: 500, statusText: 'Error', body: 'detail' })).toBe(
      'Render failed: 500 Error - detail'
    );
    expect(renderErrorMessage(new Error('boom'))).toBe('boom');
    expect(renderErrorMessage(42)).toBe('42');
  });
});

describe('handleCredentialSignIn', () => {
  it('stores the ID token from the sign-in result user', async () => {
    const getIdToken = jest.fn().mockResolvedValue('result-token');
    const signInWithCredential = jest.fn().mockResolvedValue({
      user: { getIdToken },
    });
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: null };
    await handleCredentialSignIn(
      { credential: 'token-123' },
      {
        credentialFactory: token => `cred:${token}`,
        signInWithCredential,
        auth,
        storage,
      }
    );

    expect(signInWithCredential).toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith('id_token', 'result-token');
  });

  it('falls back to auth.currentUser when the sign-in result omits a user', async () => {
    const getIdToken = jest.fn().mockResolvedValue('auth-token');
    const signInWithCredential = jest.fn().mockResolvedValue(undefined);
    const onSignIn = jest.fn();
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: { getIdToken } };

    await handleCredentialSignIn(
      { credential: 'token-123' },
      {
        credentialFactory: token => `cred:${token}`,
        signInWithCredential,
        auth,
        storage,
        onSignIn,
      }
    );

    expect(signInWithCredential).toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith('id_token', 'auth-token');
    expect(onSignIn).toHaveBeenCalledWith('auth-token');
  });

  it('falls back to auth.currentUser when sign-in throws after mutating auth state', async () => {
    const getIdToken = jest.fn().mockResolvedValue('fallback-token');
    const signInWithCredential = jest.fn(async auth => {
      auth.currentUser = { getIdToken };
      throw new Error('sign-in failed');
    });
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: null };

    await handleCredentialSignIn(
      { credential: 'token-123' },
      {
        credentialFactory: token => `cred:${token}`,
        signInWithCredential,
        auth,
        storage,
      }
    );

    expect(signInWithCredential).toHaveBeenCalled();
    expect(getIdToken).toHaveBeenCalled();
    expect(storage.setItem).toHaveBeenCalledWith('id_token', 'fallback-token');
  });

  it('rethrows when sign-in fails and auth.currentUser is unavailable', async () => {
    const signInWithCredential = jest.fn().mockRejectedValue(new Error('boom'));
    const storage = {
      setItem: jest.fn(),
    };
    const auth = { currentUser: null };

    await expect(
      handleCredentialSignIn(
        { credential: 'token-123' },
        {
          credentialFactory: token => `cred:${token}`,
          signInWithCredential,
          auth,
          storage,
        }
      )
    ).rejects.toThrow('boom');

    expect(signInWithCredential).toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
