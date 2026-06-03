import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  createNotionCodexOutcomeStore as createNotionCodexOutcomeStoreCore,
  normalizeNotionCodexOutcome,
} from '../../core/local/notion-codex/outcomeStore.js';

export function createNotionCodexOutcomeStore(options = {}) {
  return createNotionCodexOutcomeStoreCore({
    ...options,
    mkdirImpl: options.mkdirImpl ?? mkdir,
    readFileImpl: options.readFileImpl ?? readFile,
    writeFileImpl: options.writeFileImpl ?? writeFile,
    pathModule: path,
  });
}

export { normalizeNotionCodexOutcome };
