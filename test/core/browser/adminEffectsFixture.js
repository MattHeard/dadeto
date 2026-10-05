/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
import * as adminCore from '../../../src/core/browser/admin-core.js';
import { createAdminTokenAction as createTokenActionCore } from '../../../src/core/browser/token-action.js';

export const TEST_ALLOW_EFFECTS = /** @type {AllowEffects} */ (
  /** @type {unknown} */ (Object.freeze({}))
);

/**
 * Bind a focused admin test command to the fixture permission.
 * @param {(permission: AllowEffects) => Promise<void>} handler Test command.
 * @returns {Promise<void>} Command completion.
 */
export async function bindTestEffectBoundary(handler) {
  await handler(TEST_ALLOW_EFFECTS);
}

/**
 * Adapt an existing URL-first test fetch mock to the permission-first contract.
 * @param {object} options Admin dependencies.
 * @param {'fetchFn'|'fetchObj'} fetchKey Fetch dependency name.
 * @returns {object} Dependencies with a test boundary and adapted fetch mock.
 */
export function withTestAdminEffectBoundary(options, fetchKey = 'fetchFn') {
  const fetchFn = options[fetchKey];
  return {
    ...options,
    bindEffectBoundary: bindTestEffectBoundary,
    ...(typeof fetchFn === 'function'
      ? { [fetchKey]: (_permission, ...args) => fetchFn(...args) }
      : {}),
  };
}

export const createTriggerRender = options =>
  adminCore.createTriggerRender(withTestAdminEffectBoundary(options));
export const createTriggerStats = options =>
  adminCore.createTriggerStats(withTestAdminEffectBoundary(options));
export const createRegenerateVariant = options =>
  adminCore.createRegenerateVariant(withTestAdminEffectBoundary(options));
export const initAdmin = options =>
  adminCore.initAdmin(withTestAdminEffectBoundary(options));
export const initAdminApp = options =>
  adminCore.initAdminApp(withTestAdminEffectBoundary(options, 'fetchObj'));
export const createInitAdminAppHandle = options =>
  adminCore.createInitAdminAppHandle(
    withTestAdminEffectBoundary(options, 'fetchObj')
  );
export const createAdminTokenAction = options =>
  createTokenActionCore(withTestAdminEffectBoundary(options));
export const postTriggerRenderContents = (getEndpoints, fetchFn, token) =>
  adminCore.postTriggerRenderContents(
    TEST_ALLOW_EFFECTS,
    getEndpoints,
    withTestAdminEffectBoundary({ fetchFn }).fetchFn,
    token
  );
export const executeTriggerRender = options =>
  adminCore.executeTriggerRender(
    TEST_ALLOW_EFFECTS,
    withTestAdminEffectBoundary(options)
  );
