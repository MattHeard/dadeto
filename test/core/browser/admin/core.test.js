import { jest } from '@jest/globals';
import { ADMIN_UID } from '../../../../src/core/commonCore.js';
import {
  createAdminEndpointsPromise,
  createGetAdminEndpoints,
  createGetAdminEndpointsFromStaticConfig,
  createShowMessage,
  createTriggerRender,
  createTriggerStats,
  createRegenerateVariant,
  createDisableAutoSelect,
  initAdminApp,
  bindTriggerRenderClick,
  bindTriggerStatsClick,
  bindRegenerateVariantSubmit,
  createWireSignOut,
  getDefaultAdminEndpointsCopy,
  mapConfigToAdminEndpoints,
  postTriggerRenderContents,
  announceTriggerRenderResult,
  executeTriggerRender,
  createInitGoogleSignIn,
  getStatusParagraph,
  getAdminContent,
  getSignInButtons,
  getSignOutSections,
  getCurrentUser,
  updateAuthControlsDisplay,
  createCheckAccess,
  initAdmin,
} from '../../../../src/core/browser/admin-core.js';
import { createAdminTokenAction } from '../../../../src/core/browser/token-action.js';

const createConfig = overrides => ({
  triggerRenderContentsUrl: 'https://example.com/render',
  markVariantDirtyUrl: 'https://example.com/mark',
  generateStatsUrl: 'https://example.com/stats',
  ...overrides,
});

describe('createGetAdminEndpoints', () => {
  it('memoizes the produced admin endpoints promise', () => {
    const promise = Promise.resolve(createConfig());
    const factory = jest.fn().mockReturnValue(promise);

    const getAdminEndpoints = createGetAdminEndpoints(factory);

    expect(getAdminEndpoints()).toBe(promise);
    expect(getAdminEndpoints()).toBe(promise);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('throws when the provided factory is not a function', () => {
    const getAdminEndpoints = createGetAdminEndpoints(null);
    expect(() => getAdminEndpoints()).toThrow(TypeError);
  });
});

describe('createDisableAutoSelect', () => {
  it('calls the nested helper when present', () => {
    const disableAutoSelect = jest.fn();
    const globalScope = {
      google: {
        accounts: {
          id: {
            disableAutoSelect,
          },
        },
      },
    };

    const disable = createDisableAutoSelect(globalScope);

    disable();

    expect(disableAutoSelect).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op when the helper is missing or the scope is not traversable', () => {
    const missingHelper = createDisableAutoSelect({});
    const nullScope = createDisableAutoSelect(null);

    expect(() => missingHelper()).not.toThrow();
    expect(() => nullScope()).not.toThrow();
  });
});

describe('createGetAdminEndpointsFromStaticConfig', () => {
  it('produces a memoized getter that loads the static config once', async () => {
    const loadStaticConfig = jest.fn().mockResolvedValue(createConfig());

    const getAdminEndpoints =
      createGetAdminEndpointsFromStaticConfig(loadStaticConfig);

    const promise = getAdminEndpoints();
    const secondPromise = getAdminEndpoints();

    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
    expect(secondPromise).toBe(promise);
    await expect(promise).resolves.toEqual(createConfig());
  });
});

describe('mapConfigToAdminEndpoints', () => {
  it('falls back to production defaults when entries are missing', () => {
    const defaults = getDefaultAdminEndpointsCopy();
    const endpoints = mapConfigToAdminEndpoints({});

    expect(endpoints).toEqual(defaults);
  });
});

describe('createAdminEndpointsPromise', () => {
  it('resolves to defaults when the loader is not a function', async () => {
    await expect(createAdminEndpointsPromise(null)).resolves.toEqual(
      getDefaultAdminEndpointsCopy()
    );
  });

  it('rescues rejected loads and returns defaults', async () => {
    const loader = jest.fn().mockRejectedValue(new Error('boom'));

    await expect(createAdminEndpointsPromise(loader)).resolves.toEqual(
      getDefaultAdminEndpointsCopy()
    );
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe('mapConfigToAdminEndpoints', () => {
  it('falls back to defaults when some endpoints are missing', () => {
    const defaults = getDefaultAdminEndpointsCopy();
    const endpoints = mapConfigToAdminEndpoints({
      triggerRenderContentsUrl: 'https://example.com/render',
    });

    expect(endpoints).toEqual({
      ...defaults,
      triggerRenderContentsUrl: 'https://example.com/render',
    });
  });
});

describe('createShowMessage', () => {
  it('returns a messenger that updates the status paragraph when present', () => {
    const element = { innerHTML: '' };
    const getStatusParagraph = jest.fn().mockReturnValue(element);
    const doc = { getElementById: jest.fn() };

    const showMessage = createShowMessage(getStatusParagraph, doc);

    showMessage('Hello');

    expect(getStatusParagraph).toHaveBeenCalledWith(doc);
    expect(element.innerHTML).toBe('<strong>Hello</strong>');
  });

  it('does nothing when the status paragraph is not found', () => {
    const getStatusParagraph = jest.fn().mockReturnValue(null);
    const doc = { getElementById: jest.fn() };

    const showMessage = createShowMessage(getStatusParagraph, doc);

    expect(() => showMessage('Hello')).not.toThrow();
  });

  it('throws when the resolver is not a function', () => {
    const doc = { getElementById: jest.fn() };

    expect(() => createShowMessage(null, doc)).toThrow(
      new TypeError('getStatusParagraphFn must be a function')
    );
  });

  it('throws when the document is invalid', () => {
    expect(() => createShowMessage(jest.fn(), null)).toThrow(
      new TypeError('doc must be a Document-like object')
    );
  });
});

describe('createTriggerRender', () => {
  const renderUrl = 'https://example.com/render';

  it('invokes the render endpoint and reports success', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ triggerRenderContentsUrl: renderUrl });
    const fetch = jest.fn().mockResolvedValue({ ok: true });
    const showMessage = jest.fn();

    const triggerRender = createTriggerRender({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
    });

    await triggerRender();

    expect(googleAuth.getIdToken).toHaveBeenCalledTimes(1);
    expect(getAdminEndpoints).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(renderUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    });
    expect(showMessage).toHaveBeenCalledWith('Render triggered');
  });

  it('reports fetch failures through the supplied error reporter', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ triggerRenderContentsUrl: renderUrl });
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const showMessage = jest.fn();
    const reportError = jest.fn();

    const triggerRender = createTriggerRender({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
      reportError,
    });

    await triggerRender();

    expect(reportError).toHaveBeenCalledWith(new Error('boom'));
    expect(showMessage).toHaveBeenCalledWith('Render failed: boom');
  });

  it('reports failure when no token is available', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue(null) };
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();
    const showMessage = jest.fn();

    const triggerRender = createTriggerRender({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
    });

    await triggerRender();

    expect(getAdminEndpoints).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith('Render failed: missing ID token');
  });

  it('throws when googleAuth does not expose getIdToken', () => {
    expect(() =>
      createTriggerRender({
        googleAuth: {},
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
        showMessage: jest.fn(),
      })
    ).toThrow(new TypeError('googleAuth.getIdToken must be a function'));
  });

  it('uses the default reportError handler when one is not provided', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ triggerRenderContentsUrl: renderUrl });
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const showMessage = jest.fn();

    const triggerRender = createTriggerRender({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
    });

    await triggerRender();

    expect(showMessage).toHaveBeenCalledWith('Render failed: boom');
  });
});

describe('createTriggerStats', () => {
  const statsUrl = 'https://example.com/stats';

  it('invokes the stats endpoint and reports success', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const googleAuth = { getIdToken };
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: statsUrl });
    const fetch = jest.fn().mockResolvedValue({ ok: true });
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
    });

    await triggerStats();

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getAdminEndpoints).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(statsUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_token: 'token' }),
    });
    expect(showMessage).toHaveBeenCalledWith('Stats generated');
  });

  it('reports failure when no token is available', async () => {
    const getIdToken = jest.fn().mockReturnValue(null);
    const googleAuth = { getIdToken };
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
    });

    await triggerStats();

    expect(getAdminEndpoints).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
  });

  it('reports failure when the endpoint invocation rejects', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const googleAuth = { getIdToken };
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: statsUrl });
    const fetch = jest.fn().mockRejectedValue(new Error('nope'));
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
    });

    await triggerStats();

    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
  });

  it('beacons non-ok endpoint responses', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: statsUrl });
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
    const showMessage = jest.fn();
    const reportError = jest.fn();

    const triggerStats = createTriggerStats({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
      reportError,
    });

    await triggerStats();

    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
  });

  it('throws when googleAuth is missing getIdToken', () => {
    expect(() =>
      createTriggerStats({
        googleAuth: {},
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
        showMessage: jest.fn(),
      })
    ).toThrow(new TypeError('googleAuth.getIdToken must be a function'));
  });
});

describe('createRegenerateVariant', () => {
  const markVariantDirtyUrl = 'https://example.com/variant';

  it('invokes the regenerate endpoint and reports success', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const googleAuth = { getIdToken };
    const input = { value: '12Ab ' };
    const doc = {
      getElementById: jest.fn().mockReturnValue(input),
    };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ markVariantDirtyUrl });
    const fetch = jest.fn().mockResolvedValue({ ok: true });
    const preventDefault = jest.fn();

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
    });

    await regenerateVariant({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(doc.getElementById).toHaveBeenCalledWith('regenInput');
    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getAdminEndpoints).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(markVariantDirtyUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page: 12, variant: 'Ab' }),
    });
    expect(showMessage).toHaveBeenCalledWith('Regeneration triggered');
  });

  it('works even when the event lacks preventDefault', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const googleAuth = { getIdToken };
    const input = { value: '12Ab ' };
    const doc = {
      getElementById: jest.fn().mockReturnValue(input),
    };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ markVariantDirtyUrl });
    const fetch = jest.fn().mockResolvedValue({ ok: true });

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
    });

    await regenerateVariant({});

    expect(doc.getElementById).toHaveBeenCalledWith('regenInput');
    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getAdminEndpoints).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(markVariantDirtyUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page: 12, variant: 'Ab' }),
    });
    expect(showMessage).toHaveBeenCalledWith('Regeneration triggered');
  });

  it('throws when googleAuth is missing getIdToken', () => {
    expect(() =>
      createRegenerateVariant({
        googleAuth: {},
        doc: { getElementById: jest.fn() },
        showMessage: jest.fn(),
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('googleAuth must provide a getIdToken function'));
  });

  it('throws when googleAuth is not provided', () => {
    expect(() =>
      createRegenerateVariant({
        googleAuth: null,
        doc: { getElementById: jest.fn() },
        showMessage: jest.fn(),
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('googleAuth must provide a getIdToken function'));
  });
});

describe('bindTriggerRenderClick', () => {
  it('wires the click handler when the render button exists', () => {
    const addEventListener = jest.fn();
    const button = { addEventListener };
    const doc = {
      getElementById: jest.fn().mockReturnValue(button),
    };
    const triggerRender = jest.fn();

    const result = bindTriggerRenderClick(doc, triggerRender);

    expect(doc.getElementById).toHaveBeenCalledWith('renderBtn');
    expect(addEventListener).toHaveBeenCalledWith('click', triggerRender);
    expect(result).toBe(button);
  });

  it('returns null when the render button is not present', () => {
    const doc = {
      getElementById: jest.fn().mockReturnValue(null),
    };

    const result = bindTriggerRenderClick(doc, jest.fn());

    expect(doc.getElementById).toHaveBeenCalledWith('renderBtn');
    expect(result).toBeNull();
  });

  it('uses the provided element id when supplied', () => {
    const addEventListener = jest.fn();
    const button = { addEventListener };
    const doc = {
      getElementById: jest.fn().mockReturnValue(button),
    };
    const triggerRender = jest.fn();

    const result = bindTriggerRenderClick(doc, triggerRender, 'customBtn');

    expect(doc.getElementById).toHaveBeenCalledWith('customBtn');
    expect(addEventListener).toHaveBeenCalledWith('click', triggerRender);
    expect(result).toBe(button);
  });

  it('throws when provided document is invalid', () => {
    expect(() => bindTriggerRenderClick(null, jest.fn())).toThrow(
      new TypeError('doc must be a Document-like object')
    );
  });

  it('throws when provided trigger handler is not a function', () => {
    const doc = { getElementById: jest.fn() };

    expect(() => bindTriggerRenderClick(doc, null)).toThrow(
      new TypeError('triggerRenderFn must be a function')
    );
  });
});

describe('bindTriggerStatsClick', () => {
  it('wires the click handler when the stats button exists', () => {
    const addEventListener = jest.fn();
    const button = { addEventListener };
    const doc = {
      getElementById: jest.fn().mockReturnValue(button),
    };
    const triggerStats = jest.fn();

    const result = bindTriggerStatsClick(doc, triggerStats);

    expect(doc.getElementById).toHaveBeenCalledWith('statsBtn');
    expect(addEventListener).toHaveBeenCalledWith('click', triggerStats);
    expect(result).toBe(button);
  });

  it('returns null when the stats button is not present', () => {
    const doc = {
      getElementById: jest.fn().mockReturnValue(null),
    };

    const result = bindTriggerStatsClick(doc, jest.fn());

    expect(doc.getElementById).toHaveBeenCalledWith('statsBtn');
    expect(result).toBeNull();
  });

  it('throws when provided document is invalid', () => {
    expect(() => bindTriggerStatsClick(null, jest.fn())).toThrow(
      new TypeError('doc must be a Document-like object')
    );
  });

  it('throws when provided trigger handler is not a function', () => {
    const doc = { getElementById: jest.fn() };

    expect(() => bindTriggerStatsClick(doc, null)).toThrow(
      new TypeError('triggerStatsFn must be a function')
    );
  });
});

describe('bindRegenerateVariantSubmit', () => {
  it('wires the submit handler when the regenerate form exists', () => {
    const addEventListener = jest.fn();
    const form = { addEventListener };
    const doc = {
      getElementById: jest.fn().mockReturnValue(form),
    };
    const regenerateVariant = jest.fn();

    const result = bindRegenerateVariantSubmit(doc, regenerateVariant);

    expect(doc.getElementById).toHaveBeenCalledWith('regenForm');
    expect(addEventListener).toHaveBeenCalledWith('submit', regenerateVariant);
    expect(result).toBe(form);
  });

  it('returns null when the regenerate form is not present', () => {
    const doc = {
      getElementById: jest.fn().mockReturnValue(null),
    };

    const result = bindRegenerateVariantSubmit(doc, jest.fn());

    expect(doc.getElementById).toHaveBeenCalledWith('regenForm');
    expect(result).toBeNull();
  });

  it('throws when provided document is invalid', () => {
    expect(() => bindRegenerateVariantSubmit(null, jest.fn())).toThrow(
      new TypeError('doc must be a Document-like object')
    );
  });

  it('throws when provided submit handler is not a function', () => {
    const doc = { getElementById: jest.fn() };

    expect(() => bindRegenerateVariantSubmit(doc, null)).toThrow(
      new TypeError('regenerateVariantFn must be a function')
    );
  });
});

describe('createWireSignOut', () => {
  it('wires click handlers for sign-out links', async () => {
    const addEventListener = jest.fn();
    const link = { addEventListener };
    const doc = {
      querySelectorAll: jest.fn().mockReturnValue([link]),
    };
    const signOut = jest.fn().mockResolvedValue();
    const googleAuth = { signOut };

    const wireSignOut = createWireSignOut(doc, googleAuth);

    wireSignOut();

    expect(doc.querySelectorAll).toHaveBeenCalledWith('#signoutLink');
    expect(addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );

    const handler = addEventListener.mock.calls[0][1];
    const preventDefault = jest.fn();

    await handler({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('throws when provided dependencies are invalid', () => {
    expect(() => createWireSignOut(null, { signOut: jest.fn() })).toThrow(
      new TypeError('doc must be a Document-like object')
    );
    expect(() =>
      createWireSignOut({ querySelectorAll: jest.fn() }, {})
    ).toThrow(new TypeError('googleAuth must provide a signOut function'));
  });
});

describe('postTriggerRenderContents', () => {
  it('posts to the trigger render endpoint', async () => {
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ triggerRenderContentsUrl: 'https://example.com' });
    const fetch = jest.fn().mockResolvedValue({ ok: true });

    await expect(
      postTriggerRenderContents(getAdminEndpoints, fetch, 'token')
    ).resolves.toEqual({ ok: true });

    expect(getAdminEndpoints).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://example.com', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    });
  });

  it('rejects when dependencies are invalid', async () => {
    await expect(
      postTriggerRenderContents(null, jest.fn(), 'token')
    ).rejects.toBeInstanceOf(TypeError);
    await expect(
      postTriggerRenderContents(jest.fn(), null, 'token')
    ).rejects.toBeInstanceOf(TypeError);
  });
});

describe('announceTriggerRenderResult', () => {
  it('reports success for ok responses', async () => {
    const showMessage = jest.fn();

    await announceTriggerRenderResult({ ok: true }, showMessage);

    expect(showMessage).toHaveBeenCalledWith('Render triggered');
  });

  it('reports failure details for non-ok responses', async () => {
    const showMessage = jest.fn();
    const text = jest.fn().mockResolvedValue('details');

    await announceTriggerRenderResult(
      { ok: false, status: 500, statusText: 'ERR', text },
      showMessage
    );

    expect(text).toHaveBeenCalledTimes(1);
    expect(showMessage).toHaveBeenCalledWith(
      'Render failed: 500 ERR - details'
    );
  });

  it('handles missing body text when announcing failures', async () => {
    const showMessage = jest.fn();

    await announceTriggerRenderResult(
      { ok: false, status: 503, statusText: 'Unavailable' },
      showMessage
    );

    expect(showMessage).toHaveBeenCalledWith('Render failed: 503 Unavailable');
  });

  it('beacons non-ok render responses', async () => {
    const showMessage = jest.fn();
    const reportError = jest.fn();

    await announceTriggerRenderResult(
      { ok: false, status: 401, statusText: 'Unauthorized' },
      showMessage,
      reportError
    );

    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
    expect(showMessage).toHaveBeenCalledWith('Render failed: 401 Unauthorized');
  });

  it('handles empty body strings when announcing failures', async () => {
    const showMessage = jest.fn();
    const text = jest.fn().mockResolvedValue('');

    await announceTriggerRenderResult(
      { ok: false, status: 500, statusText: 'ERR', text },
      showMessage
    );

    expect(text).toHaveBeenCalledTimes(1);
    expect(showMessage).toHaveBeenCalledWith('Render failed: 500 ERR');
  });

  it('falls back to unknown status details when response fields are missing', async () => {
    const showMessage = jest.fn();

    await announceTriggerRenderResult({}, showMessage);

    expect(showMessage).toHaveBeenCalledWith('Render failed: unknown unknown');
  });
});

describe('executeTriggerRender', () => {
  it('invokes post and announce helpers', async () => {
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ triggerRenderContentsUrl: 'https://render' });
    const fetch = jest.fn().mockResolvedValue({ ok: true });
    const showMessage = jest.fn();

    await executeTriggerRender({
      getAdminEndpoints,
      fetchFn: fetch,
      token: 'token',
      showMessage,
    });

    expect(fetch).toHaveBeenCalledWith('https://render', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    });
    expect(showMessage).toHaveBeenCalledWith('Render triggered');
  });

  it('reports errors thrown during execution', async () => {
    const getAdminEndpoints = jest.fn().mockResolvedValue({});
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));
    const showMessage = jest.fn();
    const reportError = jest.fn();

    await executeTriggerRender({
      getAdminEndpoints,
      fetchFn: fetch,
      token: 'token',
      showMessage,
      reportError,
    });

    expect(showMessage).toHaveBeenCalledWith('Render failed: boom');
    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('reports non-error throw values using their string form', async () => {
    const getAdminEndpoints = jest.fn().mockResolvedValue({});
    const fetch = jest.fn().mockRejectedValue('nope');
    const showMessage = jest.fn();

    await executeTriggerRender({
      getAdminEndpoints,
      fetchFn: fetch,
      token: 'token',
      showMessage,
    });

    expect(showMessage).toHaveBeenCalledWith('Render failed: nope');
  });
});

describe('createTriggerRender additional branches', () => {
  it('reports errors from executeTriggerRender', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const getAdminEndpoints = jest.fn().mockResolvedValue({});
    const fetch = jest.fn().mockRejectedValue(new Error('explode'));
    const showMessage = jest.fn();
    const reportError = jest.fn();

    const triggerRender = createTriggerRender({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
      reportError,
    });

    await triggerRender();

    expect(showMessage).toHaveBeenCalledWith('Render failed: explode');
    expect(reportError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('throws when getAdminEndpointsFn is not a function', () => {
    expect(() =>
      createTriggerRender({
        googleAuth: { getIdToken: jest.fn() },
        getAdminEndpointsFn: null,
        fetchFn: jest.fn(),
        showMessage: jest.fn(),
      })
    ).toThrow(new TypeError('getAdminEndpointsFn must be a function'));
  });

  it('throws when fetchFn is not a function', () => {
    expect(() =>
      createTriggerRender({
        googleAuth: { getIdToken: jest.fn() },
        getAdminEndpointsFn: jest.fn(),
        fetchFn: null,
        showMessage: jest.fn(),
      })
    ).toThrow(new TypeError('fetchFn must be a function'));
  });

  it('throws when showMessage is not a function', () => {
    expect(() =>
      createTriggerRender({
        googleAuth: { getIdToken: jest.fn() },
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
        showMessage: null,
      })
    ).toThrow(new TypeError('showMessage must be a function'));
  });
});

describe('initAdminApp', () => {
  it('reports failed trigger renders through the default reporter', async () => {
    const loadStaticConfigFn = jest
      .fn()
      .mockResolvedValue({ disableGoogleSignIn: true });
    const getAuthFn = jest.fn(() => ({
      currentUser: {
        uid: ADMIN_UID,
        getIdToken: jest.fn().mockReturnValue('token'),
      },
    }));
    const GoogleAuthProviderFn = jest.fn(() => ({
      credential: jest.fn(),
    }));
    const onAuthStateChangedFn = jest.fn((_, callback) => callback());
    const signInWithCredentialFn = jest.fn();
    const initializeAppFn = jest.fn();
    const sessionStorageObj = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const consoleObj = { error: jest.fn() };
    const globalThisObj = {
      addEventListener: jest.fn(),
      navigator: {},
    };
    const elements = {
      renderBtn: { addEventListener: jest.fn() },
      statsBtn: { addEventListener: jest.fn() },
      regenForm: { addEventListener: jest.fn() },
      signOutLink: { addEventListener: jest.fn() },
      signInButton: { style: {} },
      signOutWrap: { style: {} },
      adminLink: { style: {} },
      statusParagraph: { innerHTML: '' },
    };
    const documentObj = {
      getElementById: id => {
        switch (id) {
          case 'renderBtn':
            return elements.renderBtn;
          case 'statsBtn':
            return elements.statsBtn;
          case 'regenForm':
            return elements.regenForm;
          case 'signoutLink':
            return elements.signOutLink;
          case 'signinButton':
            return elements.signInButton;
          case 'signoutWrap':
            return elements.signOutWrap;
          case 'adminLink':
            return elements.adminLink;
          case 'statusParagraph':
            return elements.statusParagraph;
          default:
            return null;
        }
      },
      querySelectorAll: jest.fn(() => []),
      body: {},
    };
    const fetchObj = jest.fn().mockRejectedValue(new Error('boom'));
    const onHandlersReady = jest.fn();
    const originalSessionStorage = globalThis.sessionStorage;
    globalThis.sessionStorage = {
      getItem: jest.fn(() => 'token'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };

    try {
      initAdminApp({
        loadStaticConfigFn,
        getAuthFn,
        GoogleAuthProviderFn,
        onAuthStateChangedFn,
        signInWithCredentialFn,
        initializeAppFn,
        sessionStorageObj,
        consoleObj,
        globalThisObj,
        documentObj,
        fetchObj,
        reportError: undefined,
        onHandlersReady,
      });

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(initializeAppFn).toHaveBeenCalledTimes(1);
      expect(onHandlersReady).toHaveBeenCalledTimes(1);
      const renderClick = elements.renderBtn.addEventListener.mock.calls.find(
        ([event]) => event === 'click'
      )?.[1];
      await renderClick();
    } finally {
      globalThis.sessionStorage = originalSessionStorage;
    }
  });
});

describe('createAdminTokenAction', () => {
  it('throws when the action is not a function', () => {
    expect(() =>
      createAdminTokenAction({
        googleAuth: { getIdToken: () => 'token' },
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
        showMessage: jest.fn(),
        missingTokenMessage: 'missing',
        action: null,
      })
    ).toThrow(new TypeError('action must be a function'));
  });

  it('shows the missing-token message when no token is available', async () => {
    const showMessage = jest.fn();
    const action = jest.fn();
    const tokenAction = createAdminTokenAction({
      googleAuth: { getIdToken: () => null },
      getAdminEndpointsFn: jest.fn(),
      fetchFn: jest.fn(),
      showMessage,
      missingTokenMessage: 'missing',
      action,
    });

    await tokenAction();

    expect(showMessage).toHaveBeenCalledWith('missing');
    expect(action).not.toHaveBeenCalled();
  });
});

describe('createTriggerStats additional branches', () => {
  it('handles non-OK responses by reporting an error', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const googleAuth = { getIdToken };
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: 'https://stats' });
    const fetch = jest.fn().mockResolvedValue({ ok: false });
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats({
      googleAuth,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      showMessage,
    });

    await triggerStats();

    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
  });

  it('throws when getAdminEndpointsFn is not a function', () => {
    expect(() =>
      createTriggerStats({
        googleAuth: { getIdToken: jest.fn() },
        getAdminEndpointsFn: null,
        fetchFn: jest.fn(),
        showMessage: jest.fn(),
      })
    ).toThrow(new TypeError('getAdminEndpointsFn must be a function'));
  });

  it('throws when fetchFn is not a function', () => {
    expect(() =>
      createTriggerStats({
        googleAuth: { getIdToken: jest.fn() },
        getAdminEndpointsFn: jest.fn(),
        fetchFn: null,
        showMessage: jest.fn(),
      })
    ).toThrow(new TypeError('fetchFn must be a function'));
  });

  it('throws when showMessage is not a function', () => {
    expect(() =>
      createTriggerStats({
        googleAuth: { getIdToken: jest.fn() },
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
        showMessage: null,
      })
    ).toThrow(new TypeError('showMessage must be a function'));
  });
});

describe('createRegenerateVariant additional branches', () => {
  const markVariantDirtyUrl = 'https://example.com/variant';

  it('returns early when no token is available', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue(null) };
    const doc = { getElementById: jest.fn() };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
    });

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(getAdminEndpoints).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports invalid format when the input does not match', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const input = { value: 'nope' };
    const doc = { getElementById: jest.fn().mockReturnValue(input) };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
    });

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(showMessage).toHaveBeenCalledWith('Invalid format');
    expect(getAdminEndpoints).not.toHaveBeenCalled();
  });

  it('reports invalid format when the regenerate input is missing', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const doc = { getElementById: jest.fn().mockReturnValue(null) };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
    });

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(showMessage).toHaveBeenCalledWith('Invalid format');
    expect(getAdminEndpoints).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports invalid format when the regenerate input value is not a string', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const input = { value: 123 };
    const doc = { getElementById: jest.fn().mockReturnValue(input) };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
    });

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(showMessage).toHaveBeenCalledWith('Invalid format');
    expect(getAdminEndpoints).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports failure when the endpoint rejects', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const input = { value: '1Aa' };
    const doc = { getElementById: jest.fn().mockReturnValue(input) };
    const showMessage = jest.fn();
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ markVariantDirtyUrl });
    const fetch = jest.fn().mockRejectedValue(new Error('nope'));

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
    });

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(fetch).toHaveBeenCalledWith(markVariantDirtyUrl, expect.any(Object));
    expect(showMessage).toHaveBeenCalledWith('Regeneration failed');
  });

  it('reports failure when the endpoint returns a non-ok response', async () => {
    const googleAuth = { getIdToken: jest.fn().mockReturnValue('token') };
    const input = { value: '5Zz' };
    const doc = { getElementById: jest.fn().mockReturnValue(input) };
    const showMessage = jest.fn();
    const reportError = jest.fn();
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ markVariantDirtyUrl });
    const fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Malformed Authorization header'),
    });

    const regenerateVariant = createRegenerateVariant({
      googleAuth,
      doc,
      showMessage,
      getAdminEndpointsFn: getAdminEndpoints,
      fetchFn: fetch,
      reportError,
    });

    await regenerateVariant({ preventDefault: jest.fn() });

    expect(showMessage).toHaveBeenCalledWith('Regeneration failed');
    expect(reportError).toHaveBeenCalledWith(
      new Error('HTTP 401: Malformed Authorization header')
    );
  });

  it('throws when provided document is invalid', () => {
    expect(() =>
      createRegenerateVariant({
        googleAuth: { getIdToken: jest.fn() },
        doc: null,
        showMessage: jest.fn(),
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('doc must be a Document-like object'));
  });

  it('throws when showMessage is not a function', () => {
    expect(() =>
      createRegenerateVariant({
        googleAuth: { getIdToken: jest.fn() },
        doc: { getElementById: jest.fn() },
        showMessage: null,
        getAdminEndpointsFn: jest.fn(),
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('showMessage must be a function'));
  });

  it('throws when getAdminEndpointsFn is not a function', () => {
    expect(() =>
      createRegenerateVariant({
        googleAuth: { getIdToken: jest.fn() },
        doc: { getElementById: jest.fn() },
        showMessage: jest.fn(),
        getAdminEndpointsFn: null,
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('getAdminEndpointsFn must be a function'));
  });

  it('throws when fetchFn is not a function', () => {
    expect(() =>
      createRegenerateVariant({
        googleAuth: { getIdToken: jest.fn() },
        doc: { getElementById: jest.fn() },
        showMessage: jest.fn(),
        getAdminEndpointsFn: jest.fn(),
        fetchFn: null,
      })
    ).toThrow(new TypeError('fetchFn must be a function'));
  });
});

describe('bind helpers handle missing event listeners', () => {
  it('handles render button without addEventListener', () => {
    const button = {};
    const doc = { getElementById: jest.fn().mockReturnValue(button) };

    expect(() => bindTriggerRenderClick(doc, jest.fn())).not.toThrow();
  });

  it('handles stats button without addEventListener', () => {
    const button = {};
    const doc = { getElementById: jest.fn().mockReturnValue(button) };

    expect(() => bindTriggerStatsClick(doc, jest.fn())).not.toThrow();
  });

  it('handles regenerate form without addEventListener', () => {
    const form = {};
    const doc = { getElementById: jest.fn().mockReturnValue(form) };

    expect(() => bindRegenerateVariantSubmit(doc, jest.fn())).not.toThrow();
  });
});

describe('createWireSignOut additional branches', () => {
  it('ignores links without event listeners', () => {
    const doc = { querySelectorAll: jest.fn().mockReturnValue([{}]) };
    const signOut = jest.fn();
    const wireSignOut = createWireSignOut(doc, { signOut });

    expect(() => wireSignOut()).not.toThrow();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('createInitGoogleSignIn', () => {
  it('throws when mandatory dependencies are missing', () => {
    expect(() => createInitGoogleSignIn()).toThrow(
      new TypeError('credentialFactory must be a function')
    );
    expect(() =>
      createInitGoogleSignIn({ credentialFactory: jest.fn() })
    ).toThrow(new TypeError('signInWithCredential must be a function'));
    expect(() =>
      createInitGoogleSignIn({
        credentialFactory: jest.fn(),
        signInWithCredential: jest.fn(),
      })
    ).toThrow(new TypeError('auth must be provided'));
  });

  it('throws when storage does not expose setItem', () => {
    expect(() =>
      createInitGoogleSignIn({
        credentialFactory: jest.fn(),
        signInWithCredential: jest.fn(),
        auth: {},
        storage: {},
        matchMedia: jest.fn(),
        querySelectorAll: jest.fn(),
      })
    ).toThrow(new TypeError('storage must provide a setItem function'));
  });

  it('throws when matchMedia is not a function', () => {
    expect(() =>
      createInitGoogleSignIn({
        credentialFactory: jest.fn(),
        signInWithCredential: jest.fn(),
        auth: {},
        storage: { setItem: jest.fn() },
        matchMedia: null,
        querySelectorAll: jest.fn(),
      })
    ).toThrow(new TypeError('matchMedia must be a function'));
  });

  it('throws when querySelectorAll is not a function', () => {
    expect(() =>
      createInitGoogleSignIn({
        credentialFactory: jest.fn(),
        signInWithCredential: jest.fn(),
        auth: {},
        storage: { setItem: jest.fn() },
        matchMedia: jest.fn(),
        querySelectorAll: null,
      })
    ).toThrow(new TypeError('querySelectorAll must be a function'));
  });

  it('logs an error when the identity script is missing', () => {
    const error = jest.fn();
    const init = createInitGoogleSignIn({
      credentialFactory: jest.fn(),
      signInWithCredential: jest.fn(),
      auth: {},
      storage: { setItem: jest.fn() },
      matchMedia: jest.fn().mockReturnValue({}),
      querySelectorAll: jest.fn().mockReturnValue([]),
      logger: { error },
    });

    init();

    expect(error).toHaveBeenCalledWith('Google Identity script missing');
  });

  it('falls back to console logging when logger is invalid', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const init = createInitGoogleSignIn({
      credentialFactory: jest.fn(),
      signInWithCredential: jest.fn(),
      auth: {},
      storage: { setItem: jest.fn() },
      matchMedia: jest.fn().mockReturnValue({}),
      querySelectorAll: jest.fn().mockReturnValue([]),
      logger: {},
    });

    init();

    expect(error).toHaveBeenCalledWith('Google Identity script missing');
    error.mockRestore();
  });

  it('renders buttons and handles sign-in callback', async () => {
    let savedCallback;
    const initialize = jest.fn(({ callback }) => {
      savedCallback = callback;
    });
    const renderButton = jest.fn();
    let mediaHandler;
    const matchMedia = jest.fn().mockReturnValue({
      matches: true,
      addEventListener: jest.fn((_, handler) => {
        mediaHandler = handler;
      }),
    });
    const elements = [{ innerHTML: 'filled' }];
    const querySelectorAll = jest.fn().mockReturnValue(elements);
    const getIdToken = jest.fn().mockResolvedValue('id');
    const auth = { currentUser: { getIdToken } };
    const storage = { setItem: jest.fn() };
    const credentialFactory = jest.fn(cred => ({ cred }));
    const signInWithCredential = jest.fn().mockResolvedValue();
    const onSignIn = jest.fn();

    const initGoogleSignIn = createInitGoogleSignIn({
      googleAccountsId: () => ({ initialize, renderButton }),
      credentialFactory,
      signInWithCredential,
      auth,
      storage,
      matchMedia,
      querySelectorAll,
    });

    initGoogleSignIn({ onSignIn });

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    await savedCallback({ credential: 'raw' });

    expect(credentialFactory).toHaveBeenCalledWith('raw');
    expect(signInWithCredential).toHaveBeenCalledWith(auth, { cred: 'raw' });
    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith('id_token', 'id');
    expect(onSignIn).toHaveBeenCalledWith('id');
    expect(elements[0].innerHTML).toBe('');
    expect(renderButton).toHaveBeenCalledWith(elements[0], {
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
    });
    expect(typeof mediaHandler).toBe('function');
    mediaHandler();
    expect(renderButton).toHaveBeenCalledTimes(2);
  });

  it('skips rendering for falsy button references', () => {
    const initialize = jest.fn();
    const renderButton = jest.fn();
    const matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
    });
    const querySelectorAll = jest
      .fn()
      .mockReturnValue([null, { innerHTML: 'content' }]);

    const initGoogleSignIn = createInitGoogleSignIn({
      googleAccountsId: {
        initialize,
        renderButton,
      },
      credentialFactory: jest.fn(),
      signInWithCredential: jest.fn(),
      auth: {},
      storage: { setItem: jest.fn() },
      matchMedia,
      querySelectorAll,
    });

    initGoogleSignIn();

    expect(renderButton).toHaveBeenCalledTimes(1);
    expect(renderButton).toHaveBeenCalledWith(
      { innerHTML: '' },
      expect.objectContaining({ text: 'signin_with', theme: 'filled_blue' })
    );
  });

  it('logs when auth currentUser lacks getIdToken', async () => {
    let savedCallback;
    const initGoogleSignIn = createInitGoogleSignIn({
      googleAccountsId: {
        initialize: ({ callback }) => {
          savedCallback = callback;
        },
        renderButton: jest.fn(),
      },
      credentialFactory: jest.fn(cred => cred),
      signInWithCredential: jest.fn(),
      auth: { currentUser: {} },
      storage: { setItem: jest.fn() },
      matchMedia: jest.fn().mockReturnValue({}),
      querySelectorAll: jest.fn().mockReturnValue([]),
    });

    initGoogleSignIn();

    await expect(savedCallback({ credential: 'raw' })).resolves.toBeUndefined();
  });

  it('reports handled sign-in failures to the error beacon', async () => {
    let savedCallback;
    const reportError = jest.fn();
    const error = new TypeError('getAuthorUuidUrl is not a function');
    const initGoogleSignIn = createInitGoogleSignIn({
      googleAccountsId: {
        initialize: ({ callback }) => {
          savedCallback = callback;
        },
        renderButton: jest.fn(),
      },
      credentialFactory: jest.fn(cred => cred),
      signInWithCredential: jest.fn().mockRejectedValue(error),
      auth: { currentUser: null },
      storage: { setItem: jest.fn() },
      matchMedia: jest.fn().mockReturnValue({}),
      querySelectorAll: jest.fn().mockReturnValue([]),
    });

    initGoogleSignIn({ reportError });
    await savedCallback({ credential: 'raw' });

    expect(reportError).toHaveBeenCalledWith(error);
  });

  it('logs an error when renderButton is missing', () => {
    const error = jest.fn();
    const init = createInitGoogleSignIn({
      googleAccountsId: { initialize: jest.fn(), renderButton: null },
      credentialFactory: jest.fn(),
      signInWithCredential: jest.fn(),
      auth: {},
      storage: { setItem: jest.fn() },
      matchMedia: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([]),
      logger: { error },
    });

    init();

    expect(error).toHaveBeenCalledWith('Google Identity script missing');
  });

  it('treats missing selector results as an empty collection', () => {
    const initialize = jest.fn();
    const renderButton = jest.fn();
    const matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
    });
    const init = createInitGoogleSignIn({
      googleAccountsId: { initialize, renderButton },
      credentialFactory: jest.fn(),
      signInWithCredential: jest.fn(),
      auth: { currentUser: { getIdToken: jest.fn() } },
      storage: { setItem: jest.fn() },
      matchMedia,
      querySelectorAll: jest.fn().mockReturnValue(undefined),
    });

    expect(() => init()).not.toThrow();
    expect(renderButton).not.toHaveBeenCalled();
  });
});
describe('getStatusParagraph and related lookups', () => {
  it('resolves known admin elements', () => {
    const status = { id: 'renderStatus' };
    const content = { id: 'adminContent' };
    const doc = {
      getElementById: jest.fn(id => {
        if (id === 'renderStatus') return status;
        if (id === 'adminContent') return content;
        return null;
      }),
      querySelectorAll: jest.fn(selector => {
        if (selector === '#signinButton') return ['signin'];
        if (selector === '#signoutWrap') return ['signout'];
        return [];
      }),
    };

    expect(getStatusParagraph(doc)).toBe(status);
    expect(getAdminContent(doc)).toBe(content);
    expect(getSignInButtons(doc)).toEqual(['signin']);
    expect(getSignOutSections(doc)).toEqual(['signout']);
  });
});

describe('getCurrentUser', () => {
  it('returns null when accessor is invalid', () => {
    expect(getCurrentUser(null)).toBeNull();
  });

  it('returns the current user when available', () => {
    const user = { uid: 'abc' };
    const getAuth = jest.fn(() => ({ currentUser: user }));

    expect(getCurrentUser(getAuth)).toBe(user);
  });

  it('returns null when the auth object has no currentUser', () => {
    const getAuth = jest.fn(() => ({}));

    expect(getCurrentUser(getAuth)).toBeNull();
  });
});

describe('updateAuthControlsDisplay', () => {
  it('toggles controls based on user presence', () => {
    const signInEl = { style: {} };
    const signOutEl = { style: {} };

    updateAuthControlsDisplay(null, [signInEl], [signOutEl]);
    expect(signInEl.style.display).toBe('');
    expect(signOutEl.style.display).toBe('none');

    updateAuthControlsDisplay({}, [signInEl], [signOutEl]);
    expect(signInEl.style.display).toBe('none');
    expect(signOutEl.style.display).toBe('');
  });
});

describe('createCheckAccess', () => {
  it('hides admin content for non-admin users', () => {
    const content = { style: { display: '' } };
    const doc = {
      getElementById: jest.fn(id => (id === 'adminContent' ? content : null)),
      querySelectorAll: jest.fn(() => [{ style: {} }]),
    };
    const getAuth = jest.fn(() => ({ currentUser: { uid: 'user' } }));

    const checkAccess = createCheckAccess(getAuth, doc);
    checkAccess();

    expect(content.style.display).toBe('none');
  });

  it('shows admin content for the admin user', () => {
    const content = { style: { display: 'none' } };
    const doc = {
      getElementById: jest.fn(id => (id === 'adminContent' ? content : null)),
      querySelectorAll: jest.fn(() => [{ style: {} }]),
    };
    const checkAccess = createCheckAccess(
      () => ({ currentUser: { uid: ADMIN_UID } }),
      doc
    );
    checkAccess();

    expect(content.style.display).toBe('');
  });

  it('gracefully handles missing content elements', () => {
    const doc = {
      getElementById: jest.fn(() => null),
      querySelectorAll: jest.fn(() => [{ style: {} }]),
    };
    const checkAccess = createCheckAccess(() => ({ currentUser: null }), doc);

    expect(() => checkAccess()).not.toThrow();
  });

  it('handles missing content elements when the user is an admin', () => {
    const doc = {
      getElementById: jest.fn(() => null),
      querySelectorAll: jest.fn(() => [{ style: {} }]),
    };
    const checkAccess = createCheckAccess(
      () => ({ currentUser: { uid: ADMIN_UID } }),
      doc
    );

    expect(() => checkAccess()).not.toThrow();
  });
});

describe('initAdmin', () => {
  const makeDoc = () => {
    const elements = {
      renderBtn: { addEventListener: jest.fn() },
      statsBtn: { addEventListener: jest.fn() },
      regenForm: { addEventListener: jest.fn() },
      regenInput: { value: '12Ab' },
      renderStatus: { innerHTML: '' },
      adminContent: { style: { display: '' } },
    };
    const signOutLink = { addEventListener: jest.fn() };
    const doc = {
      getElementById: jest.fn(id => elements[id] ?? null),
      querySelectorAll: jest.fn(selector => {
        if (selector === '#signoutLink') return [signOutLink];
        if (selector === '#signinButton') return [{ style: {} }];
        if (selector === '#signoutWrap') return [{ style: {} }];
        return [];
      }),
    };
    return { doc, elements, signOutLink };
  };

  it('wires handlers and auth listeners', async () => {
    const googleAuthModule = {
      getIdToken: jest.fn().mockReturnValue('token'),
      signOut: jest.fn(),
      initGoogleSignIn: jest.fn(),
    };
    const loadStaticConfig = jest.fn().mockResolvedValue({});
    const getAuthFn = jest
      .fn()
      .mockReturnValue({ currentUser: { uid: ADMIN_UID } });
    const onAuthStateChangedFn = jest.fn((_, cb) => cb());
    const { doc, elements, signOutLink } = makeDoc();
    const fetch = jest.fn().mockResolvedValue({ ok: true });

    initAdmin({
      googleAuthModule,
      loadStaticConfigFn: loadStaticConfig,
      getAuthFn,
      onAuthStateChangedFn,
      doc,
      fetchFn: fetch,
      reportError: undefined,
    });

    expect(getAuthFn).toHaveBeenCalledTimes(2);
    expect(onAuthStateChangedFn).toHaveBeenCalledWith(
      { currentUser: { uid: ADMIN_UID } },
      expect.any(Function)
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(googleAuthModule.initGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(elements.renderBtn.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );
    expect(elements.statsBtn.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );
    expect(elements.regenForm.addEventListener).toHaveBeenCalledWith(
      'submit',
      expect.any(Function)
    );
    expect(signOutLink.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function)
    );
  });

  it('skips Google sign-in initialization when config disables it', async () => {
    const googleAuthModule = {
      getIdToken: jest.fn().mockReturnValue('token'),
      signOut: jest.fn(),
      initGoogleSignIn: jest.fn(),
    };
    const loadStaticConfig = jest.fn().mockResolvedValue({
      disableGoogleSignIn: true,
    });
    const getAuthFn = jest
      .fn()
      .mockReturnValue({ currentUser: { uid: ADMIN_UID } });
    const onAuthStateChangedFn = jest.fn((_, cb) => cb());
    const { doc } = makeDoc();
    const fetch = jest.fn().mockResolvedValue({ ok: true });

    initAdmin({
      googleAuthModule,
      loadStaticConfigFn: loadStaticConfig,
      getAuthFn,
      onAuthStateChangedFn,
      doc,
      fetchFn: fetch,
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
    expect(googleAuthModule.initGoogleSignIn).not.toHaveBeenCalled();
  });

  it('reports failed renders through the default reporter', async () => {
    const googleAuthModule = {
      getIdToken: jest.fn().mockReturnValue('token'),
      signOut: jest.fn(),
      initGoogleSignIn: jest.fn(),
    };
    const loadStaticConfig = jest.fn().mockResolvedValue({});
    const getAuthFn = jest
      .fn()
      .mockReturnValue({ currentUser: { uid: ADMIN_UID } });
    const onAuthStateChangedFn = jest.fn((_, cb) => cb());
    const { doc, elements } = makeDoc();
    const fetch = jest.fn().mockRejectedValue(new Error('boom'));

    initAdmin({
      googleAuthModule,
      loadStaticConfigFn: loadStaticConfig,
      getAuthFn,
      onAuthStateChangedFn,
      doc,
      fetchFn: fetch,
      reportError: undefined,
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    const renderClick = elements.renderBtn.addEventListener.mock.calls.find(
      ([event]) => event === 'click'
    )?.[1];
    await renderClick();

    expect(googleAuthModule.initGoogleSignIn).toHaveBeenCalledTimes(1);
  });

  it('throws when initGoogleSignIn is missing', () => {
    const { doc } = makeDoc();

    expect(() =>
      initAdmin({
        googleAuthModule: {
          getIdToken: jest.fn().mockReturnValue('token'),
          signOut: jest.fn(),
        },
        loadStaticConfigFn: jest.fn().mockResolvedValue({}),
        getAuthFn: jest
          .fn()
          .mockReturnValue({ currentUser: { uid: ADMIN_UID } }),
        onAuthStateChangedFn: jest.fn(),
        doc,
        fetchFn: jest.fn().mockResolvedValue({ ok: true }),
      })
    ).toThrow(
      new TypeError(
        'googleAuthModule must provide an initGoogleSignIn function'
      )
    );
  });

  it('throws when googleAuthModule is missing', () => {
    const { doc } = makeDoc();

    expect(() =>
      initAdmin({
        googleAuthModule: null,
        loadStaticConfigFn: jest.fn().mockResolvedValue({}),
        getAuthFn: jest.fn(),
        onAuthStateChangedFn: jest.fn(),
        doc,
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('googleAuthModule must be provided'));
  });

  it('throws when getAuthFn is not a function', () => {
    const { doc } = makeDoc();

    expect(() =>
      initAdmin({
        googleAuthModule: {
          getIdToken: jest.fn(),
          signOut: jest.fn(),
          initGoogleSignIn: jest.fn(),
        },
        loadStaticConfigFn: jest.fn().mockResolvedValue({}),
        getAuthFn: null,
        onAuthStateChangedFn: jest.fn(),
        doc,
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('getAuthFn must be a function'));
  });

  it('throws when onAuthStateChangedFn is not a function', () => {
    const { doc } = makeDoc();

    expect(() =>
      initAdmin({
        googleAuthModule: {
          getIdToken: jest.fn(),
          signOut: jest.fn(),
          initGoogleSignIn: jest.fn(),
        },
        loadStaticConfigFn: jest.fn().mockResolvedValue({}),
        getAuthFn: jest.fn(),
        onAuthStateChangedFn: null,
        doc,
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('onAuthStateChangedFn must be a function'));
  });

  it('throws when document is invalid', () => {
    expect(() =>
      initAdmin({
        googleAuthModule: {
          getIdToken: jest.fn(),
          signOut: jest.fn(),
          initGoogleSignIn: jest.fn(),
        },
        loadStaticConfigFn: jest.fn().mockResolvedValue({}),
        getAuthFn: jest.fn(),
        onAuthStateChangedFn: jest.fn(),
        doc: null,
        fetchFn: jest.fn(),
      })
    ).toThrow(new TypeError('doc must be a Document-like object'));
  });

  it('throws when fetchFn is not a function', () => {
    const { doc } = makeDoc();

    expect(() =>
      initAdmin({
        googleAuthModule: {
          getIdToken: jest.fn(),
          signOut: jest.fn(),
          initGoogleSignIn: jest.fn(),
        },
        loadStaticConfigFn: jest.fn().mockResolvedValue({}),
        getAuthFn: jest.fn(),
        onAuthStateChangedFn: jest.fn(),
        doc,
        fetchFn: null,
      })
    ).toThrow(new TypeError('fetchFn must be a function'));
  });
});
