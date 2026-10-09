import { startMosslightPage } from '../mosslight-valley/pagePresenter.js';
import { createCommonsRuntime } from './runtime.js';
import { drawCommonsFrame } from './renderer.js';
import { COMMONS_GAME_VERSION } from './version.js';

/**
 * Start the dedicated Commons handheld page.
 * @param {Record<string, any>} options Injected browser and animation APIs.
 * @returns {() => void} Page lifecycle disposer.
 */
export function startCommonsPage(options) {
  const versionLabel = options.documentObj?.querySelector?.('#game-version');
  if (versionLabel)
    versionLabel.textContent = `GAME VERSION ${COMMONS_GAME_VERSION}`;
  return startMosslightPage({
    ...options,
    createRuntime: createCommonsRuntime,
    drawFrame: drawCommonsFrame,
    saveFilename: 'the-commons-of-tomorrow-save.json',
  });
}
