import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_SYMPHONY_CONFIG,
  loadSymphonyConfig as loadSymphonyConfigCore,
  normalizeSymphonyConfig,
} from '../../core/local/symphony/config.js';

export function loadSymphonyConfig(options = {}) {
  return loadSymphonyConfigCore({
    ...options,
    cwd: options.cwd ?? (() => process.cwd()),
    pathModule: path,
    readFileImpl: options.readFileImpl ?? readFile,
  });
}

export { DEFAULT_SYMPHONY_CONFIG, normalizeSymphonyConfig };
