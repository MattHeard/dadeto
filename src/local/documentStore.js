import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { bindEffectBoundary } from './allow-effects.js';
import {
  createDocumentStoreCore,
  getDefaultLegacyDocumentPath,
  getDefaultWorkflowDir,
  getDefaultWorkflowPath,
} from '../core/local/documentStore.js';

export const DEFAULT_WORKFLOW_DIR = getDefaultWorkflowDir({
  path,
  cwd: () => process.cwd(),
});

export const DEFAULT_WORKFLOW_PATH = getDefaultWorkflowPath({
  path,
  cwd: () => process.cwd(),
});

export const LEGACY_DOCUMENT_PATH = getDefaultLegacyDocumentPath({
  path,
  cwd: () => process.cwd(),
});

/**
 * @param {{ workflowPath?: string, workflowDir?: string, legacyDocumentPath?: string }} [options]
 */
export function createDocumentStore(options = {}) {
  return createDocumentStoreCore(
    {
      mkdir: (_permission, ...args) => mkdir(...args),
      readFile,
      rm: (_permission, ...args) => rm(...args),
      writeFile: (_permission, ...args) => writeFile(...args),
      bindEffectBoundary,
      path,
      cwd: () => process.cwd(),
    },
    options
  );
}
