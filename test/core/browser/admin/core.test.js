import { jest } from '@jest/globals';
import {
  createAdminEndpointsPromise,
  DEFAULT_ADMIN_ENDPOINTS,
  createGetAdminEndpoints,
  createShowMessage,
  createTriggerStats,
  bindTriggerRenderClick,
  bindTriggerStatsClick,
  bindRegenerateVariantSubmit,
  createWireSignOut,
} from '../../../../src/core/browser/admin/core.js';

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
    expect(() => createGetAdminEndpoints(null)).toThrow(
      new TypeError('createAdminEndpointsPromiseFn must be a function')
    );
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

describe('createTriggerStats', () => {
  const statsUrl = 'https://example.com/stats';

  it('invokes the stats endpoint and reports success', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: statsUrl });
    const fetch = jest.fn().mockResolvedValue({});
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats(
      getIdToken,
      getAdminEndpoints,
      fetch,
      showMessage
    );

    await triggerStats();

    expect(getIdToken).toHaveBeenCalledTimes(1);
    expect(getAdminEndpoints).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(statsUrl, {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    });
    expect(showMessage).toHaveBeenCalledWith('Stats generated');
  });

  it('reports failure when no token is available', async () => {
    const getIdToken = jest.fn().mockReturnValue(null);
    const getAdminEndpoints = jest.fn();
    const fetch = jest.fn();
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats(
      getIdToken,
      getAdminEndpoints,
      fetch,
      showMessage
    );

    await triggerStats();

    expect(getAdminEndpoints).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
  });

  it('reports failure when the endpoint invocation rejects', async () => {
    const getIdToken = jest.fn().mockReturnValue('token');
    const getAdminEndpoints = jest
      .fn()
      .mockResolvedValue({ generateStatsUrl: statsUrl });
    const fetch = jest.fn().mockRejectedValue(new Error('nope'));
    const showMessage = jest.fn();

    const triggerStats = createTriggerStats(
      getIdToken,
      getAdminEndpoints,
      fetch,
      showMessage
    );

    await triggerStats();

    expect(showMessage).toHaveBeenCalledWith('Stats generation failed');
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

    const wireSignOut = createWireSignOut(doc, signOut);

    wireSignOut();

    expect(doc.querySelectorAll).toHaveBeenCalledWith('#signoutLink');
    expect(addEventListener).toHaveBeenCalledWith('click', expect.any(Function));

    const handler = addEventListener.mock.calls[0][1];
    const preventDefault = jest.fn();

    await handler({ preventDefault });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('throws when provided dependencies are invalid', () => {
    expect(() => createWireSignOut(null, jest.fn())).toThrow(
      new TypeError('doc must be a Document-like object')
    );
    expect(() => createWireSignOut({ querySelectorAll: jest.fn() }, null)).toThrow(
      new TypeError('signOutFn must be a function')
    );
  });
});

describe('createAdminEndpointsPromise', () => {
  it('resolves with mapped endpoints when the loader succeeds', async () => {
    const loadStaticConfig = jest.fn().mockResolvedValue(
      createConfig({ markVariantDirtyUrl: undefined })
    );

    await expect(
      createAdminEndpointsPromise(loadStaticConfig)
    ).resolves.toEqual({
      triggerRenderContentsUrl: 'https://example.com/render',
      markVariantDirtyUrl: DEFAULT_ADMIN_ENDPOINTS.markVariantDirtyUrl,
      generateStatsUrl: 'https://example.com/stats',
    });
    expect(loadStaticConfig).toHaveBeenCalledTimes(1);
  });

  it('falls back to default endpoints when the loader rejects', async () => {
    const loadStaticConfig = jest.fn().mockRejectedValue(new Error('nope'));

    await expect(
      createAdminEndpointsPromise(loadStaticConfig)
    ).resolves.toEqual(DEFAULT_ADMIN_ENDPOINTS);
  });

  it('returns defaults when provided loader is not a function', async () => {
    await expect(createAdminEndpointsPromise(null)).resolves.toEqual(
      DEFAULT_ADMIN_ENDPOINTS
    );
  });
});
