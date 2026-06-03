import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_NOTION_CODEX_CONFIG,
  loadNotionCodexConfig as loadNotionCodexConfigCore,
  normalizeNotionCodexConfig as normalizeNotionCodexConfigCore,
} from '../../core/local/notion-codex/config.js';

export function loadNotionCodexConfig(options = {}) {
  return loadNotionCodexConfigCore({
    ...options,
    cwd: options.cwd ?? (() => process.cwd()),
    pathModule: path,
    readFileImpl: options.readFileImpl ?? readFile,
  });
}

export {
  DEFAULT_NOTION_CODEX_CONFIG,
};

export function normalizeNotionCodexConfig(
  config,
  repoRoot,
  configPath,
  pathModule = path
) {
  return normalizeNotionCodexConfigCore(
    config,
    repoRoot,
    configPath,
    pathModule
  );
}
