import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bindEffectBoundary } from '../allow-effects.js';
import {
  createNotionCodexStateStore as createNotionCodexStateStoreCore,
  normalizeNotionCodexState,
} from '../../core/local/notion-codex/stateStore.js';

export function createNotionCodexStateStore(options = {}) {
  return createNotionCodexStateStoreCore({
    ...options,
    mkdirImpl: options.mkdirImpl ?? ((_permission, ...args) => mkdir(...args)),
    readFileImpl: options.readFileImpl ?? readFile,
    writeFileImpl:
      options.writeFileImpl ?? ((_permission, ...args) => writeFile(...args)),
    bindEffectBoundary,
    pathModule: path,
  });
}

export { normalizeNotionCodexState };
