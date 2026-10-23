import { createDynamicMudOpenAIProviders } from '../core/browser/game/dynamic-mud/openaiProviders.js';
import { startDynamicMudPage } from '../core/browser/game/dynamic-mud/page.js';
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';
import { getIdToken, initGoogleSignIn } from './googleAuth.js';
import { loadStaticConfig } from './loadStaticConfig.js';

const effectFetch = createEffectFetchFn(globalThis.fetch.bind(globalThis));

/**
 * Start the Dynamic MUD page with credit-billed providers injected.
 * @param {{documentObj: any, windowObj: any}} deps Browser objects.
 * @returns {() => void} Removes page listeners.
 */
export function startDynamicMudBrowserPage({ documentObj, windowObj }) {
  return startDynamicMudPage({
    documentObj,
    gameDependencies: createDynamicMudOpenAIProviders({
      chat: {
        getConfig: loadStaticConfig,
        createIdempotencyKey: () => windowObj.crypto.randomUUID(),
      },
      identity: {
        getToken: getIdToken,
        signIn: () => initGoogleSignIn({}),
      },
      effects: { bind: bindEffectBoundary, run: effectFetch },
    }),
  });
}
