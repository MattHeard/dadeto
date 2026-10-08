import { startMosslightPage } from '../mosslight-valley/pagePresenter.js';
import { createCommonsRuntime } from './runtime.js';
import { drawCommonsFrame } from './renderer.js';

/**
 * Start the dedicated Commons handheld page.
 * @param {Record<string, any>} options Injected browser and animation APIs.
 * @returns {() => void} Page lifecycle disposer.
 */
export function startCommonsPage(options) {
  return startMosslightPage({
    ...options,
    createRuntime: createCommonsRuntime,
    drawFrame: drawCommonsFrame,
    saveFilename: 'the-commons-of-tomorrow-save.json',
  });
}
