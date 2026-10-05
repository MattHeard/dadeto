import { jest } from '@jest/globals';
import { bindEffectBoundary } from '../../../../src/browser/allow-effects.js';
import { initAdmin } from '../../../../src/core/browser/admin-core.js';

/**
 * Create a lightweight element used to record admin event handlers.
 * @param {string} [value] Element's input value.
 * @returns {{ value: string, listeners: Map<string, Function>, addEventListener: (type: string, listener: Function) => void }} Lightweight event target.
 */
function makeElement(value = '') {
  return {
    value,
    listeners: new Map(),
    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    },
  };
}

test('each admin POST command forwards its own boundary permission to fetchFn', async () => {
  const elements = {
    renderBtn: makeElement(),
    statsBtn: makeElement(),
    regenForm: makeElement(),
    regenInput: makeElement('12Ab'),
    regenAuthorForm: makeElement(),
    regenAuthorInput: makeElement('author-1'),
    renderStatus: makeElement(),
  };
  const doc = {
    getElementById: id => elements[id] ?? null,
    querySelectorAll: () => [],
  };
  const fetchFn = jest.fn(async () => ({ ok: true, status: 200 }));

  initAdmin({
    googleAuthModule: {
      getIdToken: async () => 'admin-id-token',
      signOut: async () => {},
      initGoogleSignIn: () => {},
    },
    loadStaticConfigFn: async () => ({
      triggerRenderContentsUrl: '/render',
      generateStatsUrl: '/stats',
      markVariantDirtyUrl: '/mark-dirty',
    }),
    getAuthFn: () => ({}),
    onAuthStateChangedFn: () => {},
    doc,
    fetchFn,
    bindEffectBoundary,
  });

  await elements.renderBtn.listeners.get('click')();
  await elements.statsBtn.listeners.get('click')();
  await elements.regenForm.listeners.get('submit')({ preventDefault() {} });
  await elements.regenAuthorForm.listeners.get('submit')({
    preventDefault() {},
  });

  expect(fetchFn).toHaveBeenCalledTimes(4);
  expect(
    fetchFn.mock.calls.map(([permission, url]) => [permission, url])
  ).toEqual([
    [expect.any(Object), '/render'],
    [expect.any(Object), '/stats'],
    [expect.any(Object), '/mark-dirty'],
    [expect.any(Object), '/mark-dirty'],
  ]);
  const permissions = fetchFn.mock.calls.map(([permission]) => permission);
  expect(new Set(permissions).size).toBe(4);
  permissions.forEach(permission =>
    expect(Object.isFrozen(permission)).toBe(true)
  );
});
