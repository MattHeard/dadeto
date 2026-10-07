import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bindEffectBoundary } from '../allow-effects.js';
import {
  createNotionCodexOutcomeStore as createNotionCodexOutcomeStoreCore,
  normalizeNotionCodexOutcome,
} from '../../core/local/notion-codex/outcomeStore.js';

export function createNotionCodexOutcomeStore(options = {}) {
  return createNotionCodexOutcomeStoreCore({
    ...options,
    mkdirImpl: options.mkdirImpl ?? ((_permission, ...args) => mkdir(...args)),
    readFileImpl: options.readFileImpl ?? readFile,
    writeFileImpl:
      options.writeFileImpl ?? ((_permission, ...args) => writeFile(...args)),
    bindEffectBoundary,
    pathModule: path,
  });
}

export { normalizeNotionCodexOutcome };
