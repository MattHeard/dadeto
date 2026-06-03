import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createNotionCodexStateStore as createNotionCodexStateStoreCore,
  normalizeNotionCodexState,
} from '../../core/local/notion-codex/stateStore.js';

export function createNotionCodexStateStore(options = {}) {
  return createNotionCodexStateStoreCore({
    ...options,
    mkdirImpl: options.mkdirImpl ?? mkdir,
    readFileImpl: options.readFileImpl ?? readFile,
    writeFileImpl: options.writeFileImpl ?? writeFile,
    pathModule: path,
  });
}

export { normalizeNotionCodexState };
